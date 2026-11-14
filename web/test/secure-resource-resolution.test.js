import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  ProfileValidationError,
  validateRelativePath,
} from '../src/maps/profileSchema.js';
import { ProfileRegistry } from '../src/maps/profileRegistry.js';

const require = createRequire(import.meta.url);
const {
  InvalidResourcePathError,
  NonRegularResourceError,
  ResourceFileNotFoundError,
  UnsafeResourcePathError,
  UnknownAssetRootError,
  createAssetResolver,
  createConfiguredAssetResolver,
  resolveWithinApprovedRoot,
} = require('../../server/approvedAssetResolver.cjs');
const { createServer } = require('../../server.js');

const approvedAssetRoots = {
  schemaVersion: 1,
  roots: [{ id: 'test-root', path: 'fixture-assets', access: 'read-only' }],
};

function makeDocumentResource({ id = 'terrain', rootId = 'test-root', path = 'terrain.bin' } = {}) {
  return {
    id,
    ownerProfileId: 'fixture-map',
    rootId,
    path,
    type: 'document',
    role: 'test-fixture',
    format: 'binary',
  };
}

function makeRegistry(resources = [makeDocumentResource()], roots = approvedAssetRoots) {
  const index = {
    schemaVersion: 1,
    profiles: [{
      id: 'fixture-map',
      profilePath: 'fixture-map/profile.json',
      resourceManifestPath: 'fixture-map/resources.json',
    }],
  };
  const profile = {
    schemaVersion: 1,
    id: 'fixture-map',
    status: 'verified',
    displayName: 'Temporary test fixture',
    ownerLabel: null,
    mapIdentity: { name: 'Temporary test fixture', provenance: 'Synthetic test fixture only' },
    launchable: true,
    resourceManifest: 'resources.json',
    missionManifest: null,
  };
  const manifest = {
    schemaVersion: 1,
    profileId: 'fixture-map',
    resources,
  };

  return new ProfileRegistry({
    index,
    profiles: [profile],
    resourceManifests: { 'fixture-map': manifest },
    approvedAssetRoots: roots,
  });
}

async function createTemporaryRoots(t) {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'mars-resource-resolution-'));
  const approvedRoot = join(temporaryDirectory, 'approved');
  const outsideRoot = join(temporaryDirectory, 'outside');
  await Promise.all([
    mkdir(approvedRoot),
    mkdir(outsideRoot),
  ]);
  t.after(() => rm(temporaryDirectory, { recursive: true, force: true }));
  return { temporaryDirectory, approvedRoot, outsideRoot };
}

async function createFixtureResolver(registry, approvedRoot) {
  return createAssetResolver({
    registry,
    approvedAssetRoots,
    rootDirectories: new Map([['test-root', approvedRoot]]),
  });
}

async function startTestServer(t, assetResolver) {
  const server = createServer({
    assetResolverFactory: async () => assetResolver,
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('registered resources resolve to regular files within the approved root', async t => {
  const { approvedRoot } = await createTemporaryRoots(t);
  const expectedContents = 'temporary fixture bytes';
  await writeFile(join(approvedRoot, 'terrain.bin'), expectedContents);
  const resolver = await createFixtureResolver(makeRegistry(), approvedRoot);

  const asset = await resolver.resolveAsset('fixture-map', 'terrain');

  assert.equal(asset.rootId, 'test-root');
  assert.equal(asset.size, Buffer.byteLength(expectedContents));
  try {
    assert.equal(await asset.fileHandle.readFile('utf8'), expectedContents);
  } finally {
    await asset.fileHandle.close();
  }
});

test('unknown or unapproved root IDs are rejected', async () => {
  const registry = makeRegistry();
  const resolver = await createAssetResolver({
    registry,
    approvedAssetRoots: { schemaVersion: 1, roots: [] },
    rootDirectories: new Map(),
  });

  await assert.rejects(
    resolver.resolveAsset('fixture-map', 'terrain'),
    UnknownAssetRootError,
  );
  assert.throws(
    () => makeRegistry([makeDocumentResource({ rootId: 'unknown-root' })]),
    ProfileValidationError,
  );
});

test('configured resolver loads approved roots without making placeholders launchable', async () => {
  const resolver = await createConfiguredAssetResolver();

  await assert.rejects(
    resolver.resolveAsset('kelly', 'unregistered-resource'),
    error => error.name === 'ProfileNotLaunchableError',
  );
});

test('unknown resource identifiers are rejected', async t => {
  const { approvedRoot } = await createTemporaryRoots(t);
  const resolver = await createFixtureResolver(makeRegistry(), approvedRoot);

  await assert.rejects(
    resolver.resolveAsset('fixture-map', 'not-registered'),
    error => error.name === 'ResourceNotFoundError',
  );
});

test('absolute paths and traversal paths are rejected', async t => {
  const { approvedRoot } = await createTemporaryRoots(t);

  for (const unsafePath of ['../outside/secret.txt', '/etc/passwd', 'C:/Windows/win.ini']) {
    await assert.rejects(
      resolveWithinApprovedRoot(approvedRoot, unsafePath, validateRelativePath),
      InvalidResourcePathError,
      unsafePath,
    );
  }
});

test('directories and missing files cannot be resolved as resources', async t => {
  const { approvedRoot } = await createTemporaryRoots(t);
  await mkdir(join(approvedRoot, 'directory-resource'));

  const directoryResolver = await createFixtureResolver(
    makeRegistry([makeDocumentResource({ path: 'directory-resource' })]),
    approvedRoot,
  );
  await assert.rejects(
    directoryResolver.resolveAsset('fixture-map', 'terrain'),
    NonRegularResourceError,
  );

  const missingResolver = await createFixtureResolver(
    makeRegistry([makeDocumentResource({ path: 'missing.bin' })]),
    approvedRoot,
  );
  await assert.rejects(
    missingResolver.resolveAsset('fixture-map', 'terrain'),
    ResourceFileNotFoundError,
  );
});

test('symlink targets escaping the approved root are rejected where symlinks are supported', async t => {
  const { approvedRoot, outsideRoot } = await createTemporaryRoots(t);
  await writeFile(join(outsideRoot, 'secret.bin'), 'outside');
  const escapeLink = join(approvedRoot, 'escape');
  try {
    await symlink(outsideRoot, escapeLink, process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP', 'EOPNOTSUPP'].includes(error.code)) {
      t.skip(`Symlink creation is not supported in this environment (${error.code})`);
      return;
    }
    throw error;
  }

  const resolver = await createFixtureResolver(
    makeRegistry([makeDocumentResource({ path: 'escape/secret.bin' })]),
    approvedRoot,
  );
  await assert.rejects(
    resolver.resolveAsset('fixture-map', 'terrain'),
    UnsafeResourcePathError,
  );
});

test('browser endpoint accepts logical IDs, serves a registered file, and rejects path input', async t => {
  const { approvedRoot } = await createTemporaryRoots(t);
  await writeFile(join(approvedRoot, 'terrain.bin'), 'logical resource response');
  const resolver = await createFixtureResolver(makeRegistry(), approvedRoot);
  const baseUrl = await startTestServer(t, resolver);

  const validResponse = await fetch(`${baseUrl}/api/assets/fixture-map/terrain`);
  assert.equal(validResponse.status, 200);
  assert.equal(validResponse.headers.get('content-type'), 'application/octet-stream');
  assert.equal(await validResponse.text(), 'logical resource response');

  const pathRequest = await fetch(`${baseUrl}/api/assets/fixture-map/C%3A%2Fprivate%2Fsecret`);
  assert.equal(pathRequest.status, 400);
  assert.equal(await pathRequest.text(), 'Invalid resource reference');
  assert.equal(pathRequest.headers.get('x-content-type-options'), 'nosniff');

  const uriRequest = await fetch(`${baseUrl}/api/assets/fixture-map/asset%3A%2F%2Ftest-root%2Fterrain.bin`);
  assert.equal(uriRequest.status, 400);
});

test('browser endpoint hides server paths for unknown resources and preserves static serving', async t => {
  const { approvedRoot } = await createTemporaryRoots(t);
  const resolver = await createFixtureResolver(makeRegistry(), approvedRoot);
  const baseUrl = await startTestServer(t, resolver);

  const missingResponse = await fetch(`${baseUrl}/api/assets/fixture-map/missing`);
  assert.equal(missingResponse.status, 404);
  assert.equal(await missingResponse.text(), 'Resource not found');
  assert.equal((await fetch(`${baseUrl}/`)).status, 200);
});
