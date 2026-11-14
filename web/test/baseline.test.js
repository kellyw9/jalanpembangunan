import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { CONFIG } from '../src/config.js';
import { GeoFrame } from '../src/geo/coords.js';
import { getMapById } from '../src/maps/mapRegistry.js';
import { RoverPhysics } from '../src/rover/roverPhysics.js';
import { Heightfield } from '../src/terrain/heightfield.js';

const readWebData = async file => readFile(new URL(`../data/${file}`, import.meta.url));

test('baseline configuration selects the existing web/data dataset', () => {
  assert.equal(CONFIG.dataPath, './data/');
  assert.deepEqual(CONFIG.startLonLat, [77.4509, 18.4446]);
});

test('current projected coordinates round-trip through the configured Mars frame', async () => {
  const metadata = JSON.parse((await readWebData('metadata.json')).toString('utf8'));
  const frame = new GeoFrame(metadata);

  for (const [longitude, latitude] of [[77.1, 18.2], [77.4509, 18.4446], [78.4, 19.1]]) {
    const projected = frame.lonLatToProj(longitude, latitude);
    const roundTrip = frame.projToLonLat(...projected);
    assert.ok(Math.abs(roundTrip[0] - longitude) < 1e-10);
    assert.ok(Math.abs(roundTrip[1] - latitude) < 1e-10);
  }
});

test('existing terrain, NoData mask, and texture assets match metadata dimensions', async () => {
  const metadata = JSON.parse((await readWebData('metadata.json')).toString('utf8'));
  const terrain = await readWebData('terrain.f32.bin');
  const nodata = await readWebData('nodata.bin');
  const texture = await readWebData('texture.jpg');
  const cells = metadata.grid.cols * metadata.grid.rows;

  assert.equal(metadata.name, 'Jezero Crater region (Mars 2020 landing-site CTX products)');
  assert.equal(terrain.byteLength, cells * Float32Array.BYTES_PER_ELEMENT);
  assert.equal(nodata.byteLength, Math.ceil(cells / 8));
  assert.deepEqual([...texture.subarray(0, 2)], [0xff, 0xd8]);

  const terrainBytes = terrain.buffer.slice(terrain.byteOffset, terrain.byteOffset + terrain.byteLength);
  const heights = new Float32Array(terrainBytes);
  const heightfield = new Heightfield(metadata, heights);
  const frame = new GeoFrame(metadata);
  const [x, y] = frame.lonLatToProj(...CONFIG.startLonLat);

  assert.ok(heightfield.inBounds(x, y));
  assert.ok(Number.isFinite(heightfield.sample(x, y)));
  assert.ok(Number.isFinite(heightfield.slopeDeg(x, y)));
});

test('heightfield samples cell centers and bilinear midpoints', () => {
  const metadata = {
    grid: { cols: 3, rows: 3, cell_size_m: 10 },
    extent: { left: 0, top: 30 },
  };
  const heightfield = new Heightfield(metadata, Float32Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8]));

  assert.equal(heightfield.sample(15, 15), 4);
  assert.equal(heightfield.sample(20, 15), 4.5);
  assert.equal(heightfield.inBounds(15, 15), true);
  assert.equal(heightfield.inBounds(0, 15), false);
});

test('rover physics moves on flat terrain and blocks at the grid edge', () => {
  const metadata = {
    grid: { cols: 11, rows: 11, cell_size_m: 10 },
    extent: { left: 0, top: 110 },
  };
  const heightfield = new Heightfield(metadata, new Float32Array(121));
  const physics = new RoverPhysics(heightfield, {
    maxSpeed: 10,
    acceleration: 10,
    turnRate: 1,
    maxSlopeDeg: 42,
  });

  physics.setPosition(50, 50, 0);
  physics.step(0.1, { throttle: 1 });
  assert.equal(physics.status, 'driving');
  assert.ok(physics.Y > 50);
  assert.ok(heightfield.inBounds(physics.X, physics.Y));

  physics.setPosition(50, 105, 0);
  physics.step(0.1, { throttle: 1 });
  assert.equal(physics.X, 50);
  assert.equal(physics.Y, 105);
  assert.equal(physics.status, 'blocked: map edge');
});

test('map catalog flags the eastern equatorial entry as 3D-enabled and Gale as a placeholder', () => {
  const currentEntry = getMapById('usgs-i-1802-b');
  const galeEntry = getMapById('usgs-i-2766-gale');

  assert.equal(currentEntry.has3DSimulation, true);
  assert.equal(galeEntry.isPlaceholder, true);
  assert.equal(getMapById('unknown-map-id'), currentEntry);
});
