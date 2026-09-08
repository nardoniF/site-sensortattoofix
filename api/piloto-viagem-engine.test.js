import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const jsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'js');

function loadEngine() {
  const code = fs.readFileSync(path.join(jsDir, 'piloto-viagem-engine.js'), 'utf8');
  const sandbox = { window: {}, console };
  sandbox.globalThis = sandbox.window;
  vm.runInNewContext(code, sandbox, { filename: 'piloto-viagem-engine.js' });
  return sandbox.window.PilotoViagemEngine;
}

test('parse OSM speed cameras and ignore unrelated nodes', () => {
  const E = loadEngine();
  const cams = E.parseOsmCameras([
    { id: 1, lat: -23.55, lon: -46.63, tags: { highway: 'speed_camera', maxspeed: '60' } },
    { id: 2, lat: -23.56, lon: -46.64, tags: { highway: 'bus_stop' } }
  ]);
  assert.equal(cams.length, 1);
  assert.equal(cams[0].limitKmh, 60);
});

test('logs excess once when passing a camera above the limit', () => {
  const E = loadEngine();
  const origin = { lat: -23.55, lon: -46.63 };
  const cameras = E.sampleCamerasNear(origin);
  const trip = E.createTrip();
  let excesses = 0;
  for (let t = 0; t < 90; t += 1) {
    const sample = E.simulateStep(origin, t, 78);
    const ev = E.tickTrip(trip, sample, cameras);
    if (ev.excess) excesses += 1;
  }
  assert.ok(excesses >= 1, 'should record at least one excess');
  assert.equal(trip.excesses.length, excesses);
  const ids = new Set(trip.excesses.map((x) => x.camera.id));
  assert.equal(ids.size, trip.excesses.length);
  const sum = E.summarize(trip);
  assert.ok(sum.peakKmh >= 77);
  assert.ok(sum.excessCount >= 1);
});

test('does not log excess when under the limit', () => {
  const E = loadEngine();
  const origin = { lat: -23.55, lon: -46.63 };
  const cameras = E.sampleCamerasNear(origin);
  const trip = E.createTrip();
  for (let t = 0; t < 90; t += 1) {
    E.tickTrip(trip, E.simulateStep(origin, t, 40), cameras);
  }
  assert.equal(trip.excesses.length, 0);
});
