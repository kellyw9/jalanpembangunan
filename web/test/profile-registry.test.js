import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ProfileValidationError,
  validateApprovedAssetRoots,
  validateProfileDefinition,
  validateProfileIndex,
  validateResourceManifest,
} from '../src/maps/profileSchema.js';
import {
  ProfileNotLaunchableError,
  ProfileRegistry,
  ResourceNotFoundError,
} from '../src/maps/profileRegistry.js';
import {
  MissingResourceFileError,
  ResourceResolutionError,
  resolveResource,
} from '../src/maps/resourceResolver.js';

const readJson = async url => JSON.parse(await readFile(url, 'utf8'));
const profilesDirectory = new URL('../maps/profiles/', import.meta.url);
const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));

async function loadConfiguredRegistry() {
  const [index, approvedAssetRoots] = await Promise.all([
    readJson(new URL('index.json', profilesDirectory)),
    readJson(new URL('../approved-asset-roots.json', profilesDirectory)),
  ]);
  assert.doesNotThrow(() => validateApprovedAssetRoots(approvedAssetRoots));
  const profiles = [];
  const resourceManifests = {};

  for (const entry of index.profiles) {
    const profile = await readJson(new URL(entry.profilePath, profilesDirectory));
    profiles.push(profile);
    resourceManifests[profile.id] = await readJson(new URL(profile.resourceManifest, new URL(entry.profilePath, profilesDirectory)));
  }

  return new ProfileRegistry({ index, profiles, resourceManifests, approvedAssetRoots });
}

function makeRasterResource({
  id = 'terrain',
  ownerProfileId = 'fixture-map',
  rootId = 'web-data',
  path = 'metadata.json',
  crs = { definition: 'fixture:local', parameters: {} },
  transform = { type: 'affine', values: [1, 0, 0, 0, -1, 0] },
  dimensions = { width: 2, height: 2, bands: 1, dtype: 'float32' },
  resolution = { x: 1, y: 1, unit: 'm' },
  bounds = { minX: 0, minY: 0, maxX: 2, maxY: 2 },
  nodata = { value: null, maskResourceId: null },
} = {}) {
  return {
    id,
    ownerProfileId,
    rootId,
    path,
    type: 'raster',
    role: 'terrain',
    format: 'test-fixture',
    spatial: {
      crs,
      transform,
      dimensions,
      resolution,
      bounds,
      nodata,
    },
  };
}

function makeFixtureRegistry(resources = [makeRasterResource()], options = {}) {
  const id = 'fixture-map';
  const index = {
    schemaVersion: 1,
    profiles: [{
      id,
      profilePath: `${id}/profile.json`,
      resourceManifestPath: `${id}/resources.json`,
    }],
  };
  const profile = {
    schemaVersion: 1,
    id,
    status: 'verified',
    displayName: 'Synthetic test fixture',
    ownerLabel: null,
    mapIdentity: { name: 'Synthetic test fixture', provenance: 'In-memory test data only' },
    launchable: true,
    resourceManifest: 'resources.json',
    missionManifest: null,
  };
  const approvedAssetRoots = options.approvedAssetRoots ?? {
    schemaVersion: 1,
    roots: [{ id: 'web-data', path: 'web/data', access: 'read-only' }],
  };
  const resourceManifest = {
    schemaVersion: 1,
    profileId: id,
    resources,
  };

  return new ProfileRegistry({
    index,
    profiles: [profile],
    resourceManifests: { [id]: resourceManifest },
    approvedAssetRoots,
  });
}

async function filesystemAssetExists({ rootPath, relativePath }) {
  try {
    const target = await stat(resolve(repositoryRoot, rootPath, ...relativePath.split('/')));
    return target.isFile();
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

test('configured registry has five entries and leaves all unverified maps non-launchable', async () => {
  const registry = await loadConfiguredRegistry();
  const profiles = registry.listProfiles();

  assert.equal(profiles.length, 5);
  assert.deepEqual(profiles.map(profile => profile.id), [
    'teammate',
    'kelly',
    'placeholder-03',
    'placeholder-04',
    'placeholder-05',
  ]);
  assert.deepEqual(profiles.map(profile => profile.launchable), [false, false, false, false, false]);
  assert.deepEqual(profiles.map(profile => profile.mapIdentity), [null, null, null, null, null]);
  assert.deepEqual(profiles.map(profile => profile.status), [
    'pending-verification',
    'pending-verification',
    'placeholder',
    'placeholder',
    'placeholder',
  ]);
  for (const profile of profiles) {
    assert.throws(() => registry.assertLaunchable(profile.id), ProfileNotLaunchableError);
  }
});

test('valid profile definitions pass and invalid or unverifiable launch claims fail', async () => {
  const index = await readJson(new URL('index.json', profilesDirectory));
  const profile = await readJson(new URL('teammate/profile.json', profilesDirectory));

  assert.doesNotThrow(() => validateProfileIndex(index));
  assert.doesNotThrow(() => validateProfileDefinition(profile));
  assert.throws(
    () => validateProfileDefinition({ ...profile, launchable: true }),
    ProfileValidationError,
  );
  assert.throws(
    () => validateProfileDefinition({ ...profile, id: '../teammate' }),
    ProfileValidationError,
  );
});

test('declarative schemas parse and describe safe paths and independent raster transforms', async () => {
  const [profileSchema, resourceSchema] = await Promise.all([
    readJson(new URL('../maps/schemas/profile.schema.json', import.meta.url)),
    readJson(new URL('../maps/schemas/resource-manifest.schema.json', import.meta.url)),
  ]);
  const pathPattern = new RegExp(profileSchema.properties.resourceManifest.pattern);
  const rasterTransform = resourceSchema.$defs.rasterSpatial.properties.transform;

  assert.equal(profileSchema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(pathPattern.test('tiles/dem.tif'), true);
  for (const unsafePath of ['../dem.tif', '%2e%2e/dem.tif', '%252e%252e/dem.tif', 'C:/dem.tif']) {
    assert.equal(pathPattern.test(unsafePath), false, unsafePath);
  }
  assert.deepEqual(rasterTransform.anyOf, [
    { required: ['parameters'] },
    { required: ['values'] },
  ]);
});

test('profile registry rejects missing profile resources and unapproved roots', () => {
  const validResource = makeRasterResource();
  const missingManifestIndex = {
    schemaVersion: 1,
    profiles: [{ id: 'fixture-map', profilePath: 'fixture-map/profile.json', resourceManifestPath: 'fixture-map/resources.json' }],
  };
  assert.throws(
    () => new ProfileRegistry({
      index: missingManifestIndex,
      profiles: [{
        schemaVersion: 1,
        id: 'fixture-map',
        status: 'verified',
        displayName: 'Fixture',
        ownerLabel: null,
        mapIdentity: { name: 'Fixture', provenance: 'Test fixture' },
        launchable: true,
        resourceManifest: 'resources.json',
        missionManifest: null,
      }],
      resourceManifests: {},
      approvedAssetRoots: { schemaVersion: 1, roots: [{ id: 'web-data', path: 'web/data', access: 'read-only' }] },
    }),
    /Missing resource manifest/,
  );

  assert.throws(
    () => validateResourceManifest(
      { schemaVersion: 1, profileId: 'fixture-map', resources: [{ ...validResource, rootId: 'unapproved-root' }] },
      'fixture-map',
      new Set(['web-data']),
    ),
    /unapproved root/,
  );
});

test('resource manifest rejects path traversal, absolute paths, and encoded separators', () => {
  const approvedRoots = new Set(['web-data']);
  for (const unsafePath of [
    '../outside.bin',
    'folder/../../outside.bin',
    '%2e%2e/outside.bin',
    '/absolute/path.bin',
    'C:/outside.bin',
    'folder%2foutside.bin',
    'folder%5coutside.bin',
    '%252e%252e/outside.bin',
  ]) {
    const manifest = {
      schemaVersion: 1,
      profileId: 'fixture-map',
      resources: [makeRasterResource({ path: unsafePath })],
    };
    assert.throws(
      () => validateResourceManifest(manifest, 'fixture-map', approvedRoots),
      ProfileValidationError,
      unsafePath,
    );
  }
});

test('resource ownership must match the profile declaring the manifest', () => {
  const manifest = {
    schemaVersion: 1,
    profileId: 'fixture-map',
    resources: [makeRasterResource({ ownerProfileId: 'kelly' })],
  };

  assert.throws(
    () => validateResourceManifest(manifest, 'fixture-map', new Set(['web-data'])),
    /owned by kelly, not fixture-map/,
  );
});

test('resource resolver accepts only an approved registered resource and verifies file availability', async () => {
  const registry = makeFixtureRegistry();
  const resolved = await resolveResource(registry, 'fixture-map', 'terrain', {
    isAvailable: filesystemAssetExists,
  });

  assert.deepEqual(resolved, {
    profileId: 'fixture-map',
    resourceId: 'terrain',
    rootId: 'web-data',
    uri: 'asset://web-data/metadata.json',
  });
  await assert.rejects(
    resolveResource(registry, 'fixture-map', '../metadata.json', { isAvailable: filesystemAssetExists }),
    ResourceNotFoundError,
  );
  await assert.rejects(
    resolveResource(registry, 'fixture-map', 'terrain', {}),
    ResourceResolutionError,
  );
});

test('resource resolver fails explicitly when the registered file is missing', async () => {
  const registry = makeFixtureRegistry([
    makeRasterResource({ path: '__phase1_missing_fixture__.tif' }),
  ]);

  await assert.rejects(
    resolveResource(registry, 'fixture-map', 'terrain', { isAvailable: filesystemAssetExists }),
    MissingResourceFileError,
  );
});

test('resource resolver does not accept a directory as an available resource', async () => {
  const registry = makeFixtureRegistry(
    [makeRasterResource({ rootId: 'web-root', path: 'data' })],
    {
      approvedAssetRoots: {
        schemaVersion: 1,
        roots: [{ id: 'web-root', path: 'web', access: 'read-only' }],
      },
    },
  );

  await assert.rejects(
    resolveResource(registry, 'fixture-map', 'terrain', { isAvailable: filesystemAssetExists }),
    MissingResourceFileError,
  );
});

test('separate raster layers retain independent CRS and transform metadata', () => {
  const registry = makeFixtureRegistry([
    makeRasterResource({
      id: 'ctx-dem',
      crs: { definition: 'CRS:CTX', parameters: { standardParallel: 18.4 } },
      transform: { type: 'affine', values: [20, 0, 10, 0, -20, 100] },
    }),
    makeRasterResource({
      id: 'hirise-dem',
      crs: { definition: 'CRS:HIRISE', parameters: { standardParallel: 0 } },
      transform: { type: 'affine', values: [1, 0, 200, 0, -1, 300] },
      dimensions: { width: 20, height: 30, bands: 1, dtype: 'float32' },
      resolution: { x: 1, y: 1, unit: 'm' },
      bounds: { minX: 200, minY: 270, maxX: 220, maxY: 300 },
      nodata: { value: -9999, maskResourceId: null },
    }),
  ]);
  const ctx = registry.getResource('fixture-map', 'ctx-dem');
  const hirise = registry.getResource('fixture-map', 'hirise-dem');

  assert.notDeepEqual(ctx.spatial.crs, hirise.spatial.crs);
  assert.notDeepEqual(ctx.spatial.transform, hirise.spatial.transform);
  assert.notDeepEqual(ctx.spatial.dimensions, hirise.spatial.dimensions);
  assert.notDeepEqual(ctx.spatial.bounds, hirise.spatial.bounds);
  assert.notDeepEqual(ctx.spatial.nodata, hirise.spatial.nodata);
  assert.equal(hirise.spatial.resolution.x, 1);
  assert.equal(hirise.spatial.resolution.y, 1);
  ctx.spatial.crs.parameters.standardParallel = -1;
  assert.equal(registry.getResource('fixture-map', 'ctx-dem').spatial.crs.parameters.standardParallel, 18.4);
  assert.equal(registry.getResource('fixture-map', 'hirise-dem').spatial.crs.parameters.standardParallel, 0);
});
