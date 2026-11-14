const PROFILE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PROFILE_STATUSES = new Set(['pending-verification', 'placeholder', 'verified']);
const RESOURCE_TYPES = new Set(['raster', 'vector', 'document', 'table']);
const ROOT_ACCESS = 'read-only';

export class ProfileValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProfileValidationError';
  }
}

function fail(message) {
  throw new ProfileValidationError(message);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireRecord(value, label) {
  if (!isRecord(value)) fail(`${label} must be an object`);
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') fail(`${label} must be a non-empty string`);
}

function requireFiniteNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${label} must be a finite number`);
}

function requireKeys(value, required, allowed, label) {
  for (const key of required) {
    if (!Object.hasOwn(value, key)) fail(`${label}.${key} is required`);
  }
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail(`${label}.${key} is not allowed`);
  }
}

export function validateId(id, label = 'id') {
  requireString(id, label);
  if (!PROFILE_ID_PATTERN.test(id)) fail(`${label} must use lowercase letters, digits, and hyphens`);
  return id;
}

export function validateRelativePath(path, label = 'path') {
  requireString(path, label);
  if (path.startsWith('/') || path.includes('\\') || /^[a-z][a-z0-9+.-]*:/i.test(path)) {
    fail(`${label} must be a relative path using forward slashes`);
  }
  if (/[\u0000-\u001f?#]/.test(path) || /%25/i.test(path)) {
    fail(`${label} contains a forbidden character or encoded percent`);
  }

  const segments = path.split('/');
  if (segments.some(segment => segment === '' || segment === '.' || segment === '..')) {
    fail(`${label} must not contain empty, dot, or parent path segments`);
  }

  for (const segment of segments) {
    let decoded;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      fail(`${label} contains invalid percent encoding`);
    }
    if (
      decoded === '.' ||
      decoded === '..' ||
      decoded.includes('/') ||
      decoded.includes('\\') ||
      /[\u0000-\u001f?#:]/.test(decoded)
    ) {
      fail(`${label} contains an encoded path separator, traversal segment, or forbidden character`);
    }
  }

  return path;
}

export function validateProfileDefinition(profile) {
  requireRecord(profile, 'profile');
  requireKeys(
    profile,
    ['schemaVersion', 'id', 'status', 'displayName', 'ownerLabel', 'mapIdentity', 'launchable', 'resourceManifest', 'missionManifest'],
    ['schemaVersion', 'id', 'status', 'displayName', 'ownerLabel', 'mapIdentity', 'launchable', 'resourceManifest', 'missionManifest'],
    'profile',
  );
  if (profile.schemaVersion !== 1) fail('profile.schemaVersion must be 1');
  validateId(profile.id, 'profile.id');
  if (!PROFILE_STATUSES.has(profile.status)) fail(`profile.status is unsupported: ${profile.status}`);
  requireString(profile.displayName, 'profile.displayName');
  if (profile.ownerLabel !== null && typeof profile.ownerLabel !== 'string') {
    fail('profile.ownerLabel must be a string or null');
  }
  if (profile.mapIdentity !== null) {
    requireRecord(profile.mapIdentity, 'profile.mapIdentity');
    requireKeys(profile.mapIdentity, ['name', 'provenance'], ['name', 'provenance'], 'profile.mapIdentity');
    requireString(profile.mapIdentity.name, 'profile.mapIdentity.name');
    requireString(profile.mapIdentity.provenance, 'profile.mapIdentity.provenance');
  }
  if (typeof profile.launchable !== 'boolean') fail('profile.launchable must be a boolean');
  validateRelativePath(profile.resourceManifest, 'profile.resourceManifest');
  if (profile.missionManifest !== null) validateRelativePath(profile.missionManifest, 'profile.missionManifest');

  if (profile.status !== 'verified' && (profile.launchable || profile.mapIdentity !== null)) {
    fail(`profile ${profile.id} is unverified and must not be launchable or claim a map identity`);
  }
  if (profile.status === 'verified' && profile.mapIdentity === null) {
    fail(`verified profile ${profile.id} must declare a map identity and provenance`);
  }

  return profile;
}

export function validateProfileIndex(index) {
  requireRecord(index, 'profile index');
  requireKeys(index, ['schemaVersion', 'profiles'], ['schemaVersion', 'profiles'], 'profile index');
  if (index.schemaVersion !== 1 || !Array.isArray(index.profiles)) {
    fail('profile index must have schemaVersion 1 and a profiles array');
  }

  const ids = new Set();
  for (const entry of index.profiles) {
    requireRecord(entry, 'profile index entry');
    requireKeys(entry, ['id', 'profilePath', 'resourceManifestPath'], ['id', 'profilePath', 'resourceManifestPath'], 'profile index entry');
    validateId(entry.id, 'profile index entry.id');
    validateRelativePath(entry.profilePath, `profile index ${entry.id}.profilePath`);
    validateRelativePath(entry.resourceManifestPath, `profile index ${entry.id}.resourceManifestPath`);
    if (ids.has(entry.id)) fail(`duplicate profile index id: ${entry.id}`);
    if (!entry.profilePath.startsWith(`${entry.id}/`)) {
      fail(`profile ${entry.id} must resolve beneath its own profile directory`);
    }
    if (!entry.resourceManifestPath.startsWith(`${entry.id}/`)) {
      fail(`resource manifest for ${entry.id} must resolve beneath its own profile directory`);
    }
    ids.add(entry.id);
  }

  return index;
}

export function validateApprovedAssetRoots(registry) {
  requireRecord(registry, 'approved asset roots');
  requireKeys(registry, ['schemaVersion', 'roots'], ['schemaVersion', 'roots'], 'approved asset roots');
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.roots)) {
    fail('approved asset roots must have schemaVersion 1 and a roots array');
  }

  const ids = new Set();
  for (const root of registry.roots) {
    requireRecord(root, 'asset root');
    requireKeys(root, ['id', 'path', 'access'], ['id', 'path', 'access'], 'asset root');
    validateId(root.id, 'asset root.id');
    validateRelativePath(root.path, `asset root ${root.id}.path`);
    if (root.access !== ROOT_ACCESS) fail(`asset root ${root.id} must be read-only`);
    if (ids.has(root.id)) fail(`duplicate approved asset root id: ${root.id}`);
    ids.add(root.id);
  }

  return registry;
}

function validateSpatial(spatial, resourceId) {
  const label = `resource ${resourceId}.spatial`;
  requireRecord(spatial, label);
  requireKeys(
    spatial,
    ['crs', 'transform', 'dimensions', 'resolution', 'bounds', 'nodata'],
    ['crs', 'transform', 'dimensions', 'resolution', 'bounds', 'nodata'],
    label,
  );

  requireRecord(spatial.crs, `${label}.crs`);
  requireKeys(
    spatial.crs,
    ['definition'],
    ['definition', 'authority', 'parameters'],
    `${label}.crs`,
  );
  requireString(spatial.crs.definition, `${label}.crs.definition`);
  if (spatial.crs.authority !== undefined && spatial.crs.authority !== null) {
    requireString(spatial.crs.authority, `${label}.crs.authority`);
  }
  if (spatial.crs.parameters !== undefined) requireRecord(spatial.crs.parameters, `${label}.crs.parameters`);

  requireRecord(spatial.transform, `${label}.transform`);
  requireKeys(
    spatial.transform,
    ['type'],
    ['type', 'parameters', 'values'],
    `${label}.transform`,
  );
  requireString(spatial.transform.type, `${label}.transform.type`);
  if (spatial.transform.parameters !== undefined) {
    requireRecord(spatial.transform.parameters, `${label}.transform.parameters`);
  }
  if (spatial.transform.values !== undefined) {
    if (!Array.isArray(spatial.transform.values) || spatial.transform.values.length === 0) {
      fail(`${label}.transform.values must be a non-empty array`);
    }
    spatial.transform.values.forEach((value, index) => requireFiniteNumber(value, `${label}.transform.values[${index}]`));
  } else if (spatial.transform.parameters === undefined) {
    fail(`${label}.transform must provide values or parameters`);
  }

  requireRecord(spatial.dimensions, `${label}.dimensions`);
  requireKeys(
    spatial.dimensions,
    ['width', 'height', 'bands', 'dtype'],
    ['width', 'height', 'bands', 'dtype'],
    `${label}.dimensions`,
  );
  for (const dimension of ['width', 'height', 'bands']) {
    const value = spatial.dimensions[dimension];
    if (!Number.isInteger(value) || value <= 0) fail(`${label}.dimensions.${dimension} must be a positive integer`);
  }
  requireString(spatial.dimensions.dtype, `${label}.dimensions.dtype`);

  requireRecord(spatial.resolution, `${label}.resolution`);
  requireKeys(
    spatial.resolution,
    ['x', 'y', 'unit'],
    ['x', 'y', 'unit'],
    `${label}.resolution`,
  );
  for (const axis of ['x', 'y']) {
    requireFiniteNumber(spatial.resolution[axis], `${label}.resolution.${axis}`);
    if (spatial.resolution[axis] <= 0) fail(`${label}.resolution.${axis} must be positive`);
  }
  requireString(spatial.resolution.unit, `${label}.resolution.unit`);

  requireRecord(spatial.bounds, `${label}.bounds`);
  requireKeys(
    spatial.bounds,
    ['minX', 'minY', 'maxX', 'maxY'],
    ['minX', 'minY', 'maxX', 'maxY'],
    `${label}.bounds`,
  );
  for (const coordinate of ['minX', 'minY', 'maxX', 'maxY']) {
    requireFiniteNumber(spatial.bounds[coordinate], `${label}.bounds.${coordinate}`);
  }
  if (spatial.bounds.minX >= spatial.bounds.maxX || spatial.bounds.minY >= spatial.bounds.maxY) {
    fail(`${label}.bounds must have positive width and height`);
  }

  requireRecord(spatial.nodata, `${label}.nodata`);
  requireKeys(
    spatial.nodata,
    ['value', 'maskResourceId'],
    ['value', 'maskResourceId'],
    `${label}.nodata`,
  );
  const nodataValue = spatial.nodata.value;
  if (nodataValue !== null && typeof nodataValue !== 'string' && typeof nodataValue !== 'number') {
    fail(`${label}.nodata.value must be a number, string, or null`);
  }
  if (typeof nodataValue === 'number' && !Number.isFinite(nodataValue)) {
    fail(`${label}.nodata.value must be finite or null`);
  }
  if (spatial.nodata.maskResourceId !== null) validateId(spatial.nodata.maskResourceId, `${label}.nodata.maskResourceId`);
}

export function validateResourceManifest(manifest, profileId, approvedRootIds) {
  requireRecord(manifest, 'resource manifest');
  requireKeys(manifest, ['schemaVersion', 'profileId', 'resources'], ['schemaVersion', 'profileId', 'resources'], 'resource manifest');
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.resources)) {
    fail('resource manifest must have schemaVersion 1 and a resources array');
  }
  validateId(profileId, 'requesting profile id');
  if (manifest.profileId !== profileId) {
    fail(`resource manifest profileId ${manifest.profileId} does not match ${profileId}`);
  }

  const resourceIds = new Set();
  for (const resource of manifest.resources) {
    requireRecord(resource, 'resource');
    const allowedKeys = ['id', 'ownerProfileId', 'rootId', 'path', 'type', 'role', 'format', 'checksum', 'spatial'];
    const requiredKeys = ['id', 'ownerProfileId', 'rootId', 'path', 'type', 'role', 'format'];
    requireKeys(resource, requiredKeys, allowedKeys, 'resource');
    validateId(resource.id, 'resource.id');
    validateId(resource.ownerProfileId, `resource ${resource.id}.ownerProfileId`);
    if (resource.ownerProfileId !== profileId) {
      fail(`resource ${resource.id} is owned by ${resource.ownerProfileId}, not ${profileId}`);
    }
    validateId(resource.rootId, `resource ${resource.id}.rootId`);
    if (!approvedRootIds.has(resource.rootId)) fail(`resource ${resource.id} uses unapproved root ${resource.rootId}`);
    validateRelativePath(resource.path, `resource ${resource.id}.path`);
    if (!RESOURCE_TYPES.has(resource.type)) fail(`resource ${resource.id} has unsupported type ${resource.type}`);
    requireString(resource.role, `resource ${resource.id}.role`);
    requireString(resource.format, `resource ${resource.id}.format`);
    if (resource.checksum !== undefined && resource.checksum !== null) {
      if (typeof resource.checksum !== 'string' || !/^[a-f0-9]{64}$/i.test(resource.checksum)) {
        fail(`resource ${resource.id}.checksum must be a SHA-256 hex string or null`);
      }
    }
    if (resource.type === 'raster') {
      if (!Object.hasOwn(resource, 'spatial')) fail(`raster resource ${resource.id} must declare its own spatial metadata`);
      validateSpatial(resource.spatial, resource.id);
    } else if (resource.spatial !== undefined) {
      requireRecord(resource.spatial, `resource ${resource.id}.spatial`);
    }
    if (resourceIds.has(resource.id)) fail(`duplicate resource id in profile ${profileId}: ${resource.id}`);
    resourceIds.add(resource.id);
  }

  for (const resource of manifest.resources) {
    const maskResourceId = resource.spatial?.nodata?.maskResourceId;
    if (maskResourceId !== null && maskResourceId !== undefined && !resourceIds.has(maskResourceId)) {
      fail(`resource ${resource.id} references a NoData mask outside profile ${profileId}`);
    }
  }

  return manifest;
}

export function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

export function deepFreeze(value) {
  if (!isRecord(value) && !Array.isArray(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
