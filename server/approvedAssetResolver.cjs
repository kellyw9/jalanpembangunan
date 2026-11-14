const fs = require('node:fs/promises');
const path = require('node:path');
const fsConstants = require('node:fs').constants;

class AssetResolverError extends Error {
  constructor(message) {
    super(message);
    this.name = new.target.name;
  }
}

class AssetResolverConfigurationError extends AssetResolverError {}
class UnknownAssetRootError extends AssetResolverError {}
class InvalidResourcePathError extends AssetResolverError {}
class UnsafeResourcePathError extends AssetResolverError {}
class ResourceFileNotFoundError extends AssetResolverError {}
class NonRegularResourceError extends AssetResolverError {}

function isWithinRoot(rootPath, candidatePath) {
  const relativePath = path.relative(rootPath, candidatePath);
  return relativePath === '' ||
    (relativePath !== '..' &&
      !relativePath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativePath));
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function resolveWithinApprovedRoot(rootPath, relativePath, validateRelativePath) {
  let safeRelativePath;
  try {
    safeRelativePath = validateRelativePath(relativePath, 'resource path');
  } catch {
    throw new InvalidResourcePathError('Resource path is invalid');
  }

  const canonicalRoot = await fs.realpath(rootPath);
  const rootStats = await fs.stat(canonicalRoot);
  if (!rootStats.isDirectory()) {
    throw new AssetResolverConfigurationError('Approved asset root is not a directory');
  }

  const lexicalTarget = path.resolve(canonicalRoot, ...safeRelativePath.split('/'));
  if (lexicalTarget === canonicalRoot || !isWithinRoot(canonicalRoot, lexicalTarget)) {
    throw new UnsafeResourcePathError('Resource path is outside its approved root');
  }

  let canonicalTarget;
  try {
    canonicalTarget = await fs.realpath(lexicalTarget);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      throw new ResourceFileNotFoundError('Resource file is unavailable');
    }
    throw error;
  }

  if (canonicalTarget === canonicalRoot || !isWithinRoot(canonicalRoot, canonicalTarget)) {
    throw new UnsafeResourcePathError('Resource path is outside its approved root');
  }

  let targetStats;
  try {
    targetStats = await fs.stat(canonicalTarget);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      throw new ResourceFileNotFoundError('Resource file is unavailable');
    }
    throw error;
  }
  if (!targetStats.isFile()) {
    throw new NonRegularResourceError('Resource target is not a regular file');
  }

  let fileHandle;
  try {
    const noFollow = fsConstants.O_NOFOLLOW || 0;
    fileHandle = await fs.open(canonicalTarget, fsConstants.O_RDONLY | noFollow);
    const openedStats = await fileHandle.stat();
    if (!openedStats.isFile()) {
      throw new NonRegularResourceError('Resource target is not a regular file');
    }

    const canonicalAfterOpen = await fs.realpath(canonicalTarget);
    if (!isWithinRoot(canonicalRoot, canonicalAfterOpen)) {
      throw new UnsafeResourcePathError('Resource path is outside its approved root');
    }
    const pathStats = await fs.stat(canonicalAfterOpen);
    const deviceChanged =
      openedStats.dev !== pathStats.dev &&
      openedStats.dev !== 0 &&
      pathStats.dev !== 0;
    const inodeChanged =
      openedStats.ino !== 0 &&
      pathStats.ino !== 0 &&
      openedStats.ino !== pathStats.ino;
    if (
      deviceChanged ||
      inodeChanged
    ) {
      throw new UnsafeResourcePathError('Resource target changed during resolution');
    }

    return {
      fileHandle,
      size: openedStats.size,
    };
  } catch (error) {
    if (fileHandle) await fileHandle.close();
    if (error instanceof AssetResolverError) throw error;
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      throw new ResourceFileNotFoundError('Resource file is unavailable');
    }
    if (error.code === 'ELOOP') {
      throw new UnsafeResourcePathError('Resource path contains an unsafe symbolic link');
    }
    throw error;
  }
}

async function createAssetResolver({
  registry,
  approvedAssetRoots,
  rootDirectories,
  repositoryRoot,
} = {}) {
  if (!registry ||
      typeof registry.assertLaunchable !== 'function' ||
      typeof registry.getResource !== 'function' ||
      typeof registry.getApprovedRoot !== 'function') {
    throw new AssetResolverConfigurationError('A validated profile registry is required');
  }
  if (!approvedAssetRoots || !Array.isArray(approvedAssetRoots.roots)) {
    throw new AssetResolverConfigurationError('Approved asset roots are required');
  }

  const { validateApprovedAssetRoots, validateId, validateRelativePath } =
    await import('../web/src/maps/profileSchema.js');
  validateApprovedAssetRoots(approvedAssetRoots);

  const rootDirectoryEntries = rootDirectories instanceof Map
    ? [...rootDirectories.entries()]
    : Object.entries(rootDirectories || {});
  const approvedRootIds = new Set(approvedAssetRoots.roots.map(root => root.id));
  for (const [rootId] of rootDirectoryEntries) {
    if (!approvedRootIds.has(rootId)) {
      throw new UnknownAssetRootError('An unapproved asset root was configured');
    }
  }

  const canonicalRepositoryRoot = repositoryRoot
    ? await fs.realpath(repositoryRoot)
    : null;
  const canonicalRoots = new Map();
  for (const root of approvedAssetRoots.roots) {
    let registryRoot;
    try {
      registryRoot = registry.getApprovedRoot(root.id);
    } catch {
      throw new UnknownAssetRootError('An asset root is not registered');
    }
    if (registryRoot.path !== root.path || registryRoot.access !== root.access) {
      throw new AssetResolverConfigurationError('Profile registry and approved asset roots do not match');
    }

    const rootDirectory = rootDirectories instanceof Map
      ? rootDirectories.get(root.id)
      : rootDirectories?.[root.id];
    if (typeof rootDirectory !== 'string' || rootDirectory.length === 0) {
      throw new UnknownAssetRootError('An approved asset root has no server directory');
    }

    let canonicalRoot;
    try {
      canonicalRoot = await fs.realpath(rootDirectory);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
        throw new AssetResolverConfigurationError('An approved asset root is unavailable');
      }
      throw error;
    }
    const rootStats = await fs.stat(canonicalRoot);
    if (!rootStats.isDirectory()) {
      throw new AssetResolverConfigurationError('An approved asset root is not a directory');
    }
    if (canonicalRepositoryRoot && !isWithinRoot(canonicalRepositoryRoot, canonicalRoot)) {
      throw new AssetResolverConfigurationError('An approved asset root is outside the repository');
    }
    canonicalRoots.set(root.id, canonicalRoot);
  }

  return Object.freeze({
    async resolveAsset(profileId, resourceId) {
      validateId(profileId, 'profile id');
      validateId(resourceId, 'resource id');
      registry.assertLaunchable(profileId);

      const resource = registry.getResource(profileId, resourceId);
      if (resource.ownerProfileId !== profileId) {
        throw new AssetResolverConfigurationError('Resource ownership does not match the profile');
      }
      if (!approvedRootIds.has(resource.rootId)) {
        throw new UnknownAssetRootError('Resource root is not approved');
      }
      const rootPath = canonicalRoots.get(resource.rootId);
      if (!rootPath) throw new UnknownAssetRootError('Resource root is not configured');

      const resolved = await resolveWithinApprovedRoot(rootPath, resource.path, validateRelativePath);
      return Object.freeze({
        profileId,
        resourceId,
        rootId: resource.rootId,
        fileHandle: resolved.fileHandle,
        extension: path.extname(resource.path).toLowerCase(),
        size: resolved.size,
      });
    },
  });
}

async function createConfiguredAssetResolver({ repositoryRoot = path.resolve(__dirname, '..') } = {}) {
  const [{ ProfileRegistry }, schema] = await Promise.all([
    import('../web/src/maps/profileRegistry.js'),
    import('../web/src/maps/profileSchema.js'),
  ]);
  const canonicalRepositoryRoot = await fs.realpath(repositoryRoot);
  const mapsDirectory = path.join(canonicalRepositoryRoot, 'web', 'maps');
  const profilesDirectory = path.join(mapsDirectory, 'profiles');
  const approvedAssetRoots = await readJson(path.join(mapsDirectory, 'approved-asset-roots.json'));
  const index = await readJson(path.join(profilesDirectory, 'index.json'));
  schema.validateApprovedAssetRoots(approvedAssetRoots);
  schema.validateProfileIndex(index);

  const profiles = [];
  const resourceManifests = {};
  for (const entry of index.profiles) {
    const profilePath = path.resolve(profilesDirectory, ...entry.profilePath.split('/'));
    if (!isWithinRoot(profilesDirectory, profilePath)) {
      throw new AssetResolverConfigurationError('Profile configuration is outside its directory');
    }
    const profile = await readJson(profilePath);
    const manifestPath = path.resolve(profilesDirectory, ...entry.resourceManifestPath.split('/'));
    if (!isWithinRoot(profilesDirectory, manifestPath)) {
      throw new AssetResolverConfigurationError('Resource manifest is outside its directory');
    }
    profiles.push(profile);
    resourceManifests[profile.id] = await readJson(manifestPath);
  }

  const registry = new ProfileRegistry({
    index,
    profiles,
    resourceManifests,
    approvedAssetRoots,
  });
  const rootDirectories = new Map(
    approvedAssetRoots.roots.map(root => [
      root.id,
      path.resolve(canonicalRepositoryRoot, ...root.path.split('/')),
    ]),
  );
  return createAssetResolver({
    registry,
    approvedAssetRoots,
    rootDirectories,
    repositoryRoot: canonicalRepositoryRoot,
  });
}

module.exports = {
  AssetResolverConfigurationError,
  InvalidResourcePathError,
  NonRegularResourceError,
  ResourceFileNotFoundError,
  UnsafeResourcePathError,
  UnknownAssetRootError,
  createAssetResolver,
  createConfiguredAssetResolver,
  resolveWithinApprovedRoot,
};
