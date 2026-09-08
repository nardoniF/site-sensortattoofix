/**
 * Motor do piloto de viagem: GPS vs radares (distância, sentido, excesso).
 * Sem dependência de DOM — usado na página e nos testes.
 */
(function (root) {
  'use strict';

  var EARTH_M = 6371000;
  var ALERT_M = 450;
  var LOG_M = 80;
  var HEADING_OK = 70;
  var MARGIN_KMH = 3;

  function toRad(d) {
    return (d * Math.PI) / 180;
  }

  function toDeg(r) {
    return (r * 180) / Math.PI;
  }

  function haversineM(a, b) {
    var dLat = toRad(b.lat - a.lat);
    var dLon = toRad(b.lon - a.lon);
    var lat1 = toRad(a.lat);
    var lat2 = toRad(b.lat);
    var h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function bearingDeg(from, to) {
    var y = Math.sin(toRad(to.lon - from.lon)) * Math.cos(toRad(to.lat));
    var x =
      Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
      Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(toRad(to.lon - from.lon));
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  function headingDelta(a, b) {
    var d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  }

  function kmhFromMps(mps) {
    if (mps == null || !isFinite(mps) || mps < 0) return 0;
    return mps * 3.6;
  }

  function parseMaxspeed(raw) {
    if (raw == null || raw === '') return null;
    var n = parseInt(String(raw).replace(/[^\d]/g, ''), 10);
    return isFinite(n) && n > 0 && n < 200 ? n : null;
  }

  function parseOsmCameras(elements) {
    var out = [];
    (elements || []).forEach(function (el, i) {
      if (el.lat == null || el.lon == null) return;
      var tags = el.tags || {};
      var highway = tags.highway || '';
      var enforcement = tags.enforcement || '';
      var isCam =
        highway === 'speed_camera' ||
        enforcement === 'maxspeed' ||
        enforcement === 'traffic_signals';
      if (!isCam && tags['camera:type'] !== 'speed') return;
      out.push({
        id: String(el.id || 'osm-' + i),
        lat: el.lat,
        lon: el.lon,
        limitKmh: parseMaxspeed(tags.maxspeed) || 60,
        name: tags.name || tags.description || 'Radar',
        direction: tags.direction ? parseFloat(tags.direction) : null
      });
    });
    return out;
  }

  function sampleCamerasNear(origin) {
    var lat = origin.lat;
    var lon = origin.lon;
    var dLat = 0.0018;
    var dLon = 0.0022;
    return [
      { id: 'demo-1', lat: lat + dLat, lon: lon + dLon * 0.2, limitKmh: 60, name: 'Radar 60 (demo)', direction: 20 },
      { id: 'demo-2', lat: lat + dLat * 2.4, lon: lon + dLon, limitKmh: 50, name: 'Radar 50 (demo)', direction: 25 },
      { id: 'demo-3', lat: lat + dLat * 4, lon: lon + dLon * 1.8, limitKmh: 80, name: 'Radar 80 (demo)', direction: 22 }
    ];
  }

  function approaching(camera, pos, heading) {
    var dist = haversineM(pos, camera);
    var brg = bearingDeg(pos, camera);
    var head = heading != null && isFinite(heading) ? heading : brg;
    if (camera.direction != null && isFinite(camera.direction)) {
      if (headingDelta(head, camera.direction) > HEADING_OK) return null;
    } else if (heading != null && isFinite(heading) && dist > 25) {
      if (headingDelta(head, brg) > HEADING_OK) return null;
    }
    return { camera: camera, distM: dist, bearing: brg };
  }

  function pickNext(cameras, pos, heading) {
    var best = null;
    (cameras || []).forEach(function (cam) {
      var hit = approaching(cameraOr(cam), pos, heading);
      if (!hit || hit.distM > ALERT_M) return;
      if (!best || hit.distM < best.distM) best = hit;
    });
    return best;
  }

  function cameraOr(cam) {
    return cam;
  }

  function isOverspeed(speedKmh, limitKmh) {
    return speedKmh > (limitKmh || 0) + MARGIN_KMH;
  }

  function createTrip() {
    return {
      startedAt: Date.now(),
      endedAt: null,
      points: [],
      alerts: [],
      excesses: [],
      seenAlert: {},
      seenExcess: {}
    };
  }

  function tickTrip(trip, sample, cameras) {
    var pos = { lat: sample.lat, lon: sample.lon };
    var speedKmh =
      sample.speedKmh != null ? sample.speedKmh : kmhFromMps(sample.speedMps);
    var heading = sample.heading;
    trip.points.push({
      t: sample.t || Date.now(),
      lat: pos.lat,
      lon: pos.lon,
      speedKmh: speedKmh
    });
    var next = pickNext(cameras, pos, heading);
    var events = { next: next, alert: null, excess: null };
    if (!next) return events;
    var cam = next.camera;
    if (isOverspeed(speedKmh, cam.limitKmh) && next.distM <= ALERT_M && !trip.seenAlert[cam.id]) {
      trip.seenAlert[cam.id] = true;
      events.alert = {
        camera: cam,
        distM: next.distM,
        speedKmh: speedKmh
      };
      trip.alerts.push(events.alert);
    }
    if (isOverspeed(speedKmh, cam.limitKmh) && next.distM <= LOG_M && !trip.seenExcess[cam.id]) {
      trip.seenExcess[cam.id] = true;
      events.excess = {
        camera: cam,
        distM: next.distM,
        speedKmh: speedKmh,
        limitKmh: cam.limitKmh,
        t: sample.t || Date.now(),
        lat: pos.lat,
        lon: pos.lon
      };
      trip.excesses.push(events.excess);
    }
    return events;
  }

  function summarize(trip) {
    var speeds = trip.points.map(function (p) {
      return p.speedKmh;
    });
    var peak = speeds.reduce(function (m, v) {
      return v > m ? v : m;
    }, 0);
    var avg =
      speeds.length === 0
        ? 0
        : speeds.reduce(function (a, b) {
            return a + b;
          }, 0) / speeds.length;
    var dist = 0;
    for (var i = 1; i < trip.points.length; i++) {
      dist += haversineM(trip.points[i - 1], trip.points[i]);
    }
    return {
      durationMs: (trip.endedAt || Date.now()) - trip.startedAt,
      pointCount: trip.points.length,
      peakKmh: peak,
      avgKmh: avg,
      distKm: dist / 1000,
      radarAlerts: trip.alerts.length,
      excessCount: trip.excesses.length,
      excesses: trip.excesses
    };
  }

  function simulateStep(origin, tSec, speedKmh) {
    var mps = speedKmh / 3.6;
    var dist = mps * tSec;
    var dLat = dist / EARTH_M;
    var lat = origin.lat + toDeg(dLat * Math.cos(toRad(22)));
    var lon =
      origin.lon + toDeg((dLat * Math.sin(toRad(22))) / Math.cos(toRad(origin.lat)));
    return { lat: lat, lon: lon, heading: 22, speedKmh: speedKmh, t: Date.now() };
  }

  root.PilotoViagemEngine = {
    ALERT_M: ALERT_M,
    LOG_M: LOG_M,
    haversineM: haversineM,
    bearingDeg: bearingDeg,
    headingDelta: headingDelta,
    kmhFromMps: kmhFromMps,
    parseOsmCameras: parseOsmCameras,
    sampleCamerasNear: sampleCamerasNear,
    pickNext: pickNext,
    isOverspeed: isOverspeed,
    createTrip: createTrip,
    tickTrip: tickTrip,
    summarize: summarize,
    simulateStep: simulateStep
  };
})(typeof window !== 'undefined' ? window : globalThis);
