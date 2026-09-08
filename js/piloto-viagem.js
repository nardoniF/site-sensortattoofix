(function () {
  'use strict';
  var E = window.PilotoViagemEngine;
  var $ = function (id) { return document.getElementById(id); };
  var trip = null;
  var cameras = [];
  var watchId = null;
  var simTimer = null;
  var wakeLock = null;
  var simT = 0;
  var origin = { lat: -23.5614, lon: -46.6558 };

  function setStatus(msg, cls) {
    var el = $('status');
    el.textContent = msg;
    el.className = 'hint' + (cls ? ' ' + cls : '');
  }

  function speak(text) {
    try {
      if (!window.speechSynthesis) return;
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'pt-BR';
      u.rate = 1.05;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  async function keepAwake() {
    try {
      if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');
    } catch (e) {}
  }

  function stopWatch() {
    if (watchId != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    if (simTimer) {
      clearInterval(simTimer);
      simTimer = null;
    }
  }

  function renderSpeed(kmh, next) {
    $('speed').textContent = isFinite(kmh) ? Math.round(kmh) : '—';
    if (!next) {
      $('limit').textContent = 'Nenhum radar à frente (450 m)';
      $('limit').className = 'limit';
      $('next').textContent = 'Próximo radar: —';
      return;
    }
    var over = E.isOverspeed(kmh, next.camera.limitKmh);
    $('limit').textContent = 'Limite ' + next.camera.limitKmh + ' km/h · ' + Math.round(next.distM) + ' m';
    $('limit').className = 'limit ' + (over ? 'bad' : 'ok');
    $('next').textContent = next.camera.name + ' · ' + next.camera.limitKmh + ' km/h';
  }

  function onTick(sample) {
    if (!trip) return;
    var ev = E.tickTrip(trip, sample, cameras);
    renderSpeed(sample.speedKmh, ev.next);
    if (ev.alert) {
      speak('Radar à frente, reduza. Limite ' + ev.alert.camera.limitKmh + ' quilômetros por hora. Você está a ' + Math.round(ev.alert.speedKmh));
      setStatus('Alerta: acima do limite perto de ' + ev.alert.camera.name, 'warn');
    }
    if (ev.excess) {
      setStatus('Registrado excesso em ' + ev.excess.camera.name + ' (' + Math.round(ev.excess.speedKmh) + ' / ' + ev.excess.limitKmh + ')', 'bad');
    }
  }

  function listCams() {
    if (!cameras.length) {
      $('cams').textContent = 'Nenhum radar carregado.';
      return;
    }
    $('cams').textContent = cameras
      .map(function (c) {
        return c.name + ' · ' + c.limitKmh + ' km/h';
      })
      .join('\n');
  }

  async function loadOsm(lat, lon) {
    setStatus('Buscando radares no OpenStreetMap…');
    var q =
      '[out:json][timeout:25];node(around:12000,' +
      lat +
      ',' +
      lon +
      ')["highway"="speed_camera"];out body;';
    var res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: 'data=' + encodeURIComponent(q)
    });
    if (!res.ok) throw new Error('Overpass ' + res.status);
    var json = await res.json();
    cameras = E.parseOsmCameras(json.elements || []);
    if (!cameras.length) {
      cameras = E.sampleCamerasNear({ lat: lat, lon: lon });
      setStatus('OSM sem câmeras perto. Usando 3 radares de demonstração na sua região.', 'warn');
    } else {
      setStatus(cameras.length + ' radar(es) OSM carregados.', 'ok');
    }
    listCams();
  }

  function startTrip() {
    trip = E.createTrip();
    $('btn-end').disabled = false;
    $('report-wrap').hidden = true;
    keepAwake();
  }

  $('btn-gps').addEventListener('click', function () {
    if (!navigator.geolocation) {
      setStatus('Este Safari não tem geolocalização.', 'bad');
      return;
    }
    stopWatch();
    startTrip();
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        origin = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        loadOsm(origin.lat, origin.lon).catch(function (err) {
          cameras = E.sampleCamerasNear(origin);
          listCams();
          setStatus('Falha OSM (' + err.message + '). Demo local ligada.', 'warn');
        });
        watchId = navigator.geolocation.watchPosition(
          function (p) {
            var c = p.coords;
            onTick({
              lat: c.latitude,
              lon: c.longitude,
              speedKmh: E.kmhFromMps(c.speed),
              heading: c.heading,
              t: p.timestamp
            });
          },
          function (err) {
            setStatus('GPS: ' + err.message, 'bad');
          },
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
        );
      },
      function (err) {
        setStatus('Permita a localização no Safari. ' + err.message, 'bad');
      },
      { enableHighAccuracy: true, timeout: 20000 }
    );
  });

  $('btn-sim').addEventListener('click', function () {
    stopWatch();
    startTrip();
    cameras = E.sampleCamerasNear(origin);
    listCams();
    simT = 0;
    setStatus('Simulação a 78 km/h passando por 3 radares demo. Pode testar no sofá.', 'ok');
    speak('Simulação iniciada. Reduza nos radares.');
    simTimer = setInterval(function () {
      simT += 1;
      onTick(E.simulateStep(origin, simT, 78));
      if (simT >= 100) {
        $('btn-end').click();
      }
    }, 250);
  });

  $('btn-end').addEventListener('click', function () {
    if (!trip) return;
    stopWatch();
    trip.endedAt = Date.now();
    var sum = E.summarize(trip);
    var ul = $('report');
    ul.innerHTML = '';
    var lines = [
      'Duração: ' + Math.round(sum.durationMs / 1000) + ' s',
      'Distância aprox.: ' + sum.distKm.toFixed(2) + ' km',
      'Pico: ' + Math.round(sum.peakKmh) + ' km/h · média ' + Math.round(sum.avgKmh) + ' km/h',
      'Alertas: ' + sum.radarAlerts + ' · excessos no ponto: ' + sum.excessCount
    ];
    lines.forEach(function (t) {
      var li = document.createElement('li');
      li.textContent = t;
      ul.appendChild(li);
    });
    if (!sum.excesses.length) {
      var ok = document.createElement('li');
      ok.className = 'ok';
      ok.textContent = 'Nenhum radar com passagem acima do limite (margem de 3 km/h).';
      ul.appendChild(ok);
    }
    sum.excesses.forEach(function (x) {
      var li = document.createElement('li');
      li.className = 'bad';
      li.textContent =
        x.camera.name +
        ': ' +
        Math.round(x.speedKmh) +
        ' km/h em via de ' +
        x.limitKmh +
        ' (a ' +
        Math.round(x.distM) +
        ' m do ponto)';
      ul.appendChild(li);
    });
    $('report-wrap').hidden = false;
    $('btn-end').disabled = true;
    trip = null;
    speak('Viagem finalizada. ' + sum.excessCount + ' excessos no relatório.');
    setStatus('Viagem finalizada.', 'ok');
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('piloto-viagem-sw.js').catch(function () {});
  }
})();
