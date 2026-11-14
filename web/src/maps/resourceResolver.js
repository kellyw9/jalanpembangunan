import { validateRelativePath } from './profileSchema.js';

export class ResourceResolutionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ResourceResolutionError';
  }
}

export class MissingResourceFileError extends ResourceResolutionError {
  constructor(profileId, resourceId) {
    super(`Resource file ${resourceId} for profile ${profileId} is missing`);
    this.name = 'MissingResourceFileError';
  }
}

export async function resolveResource(registry, profileId, resourceId, { isAvailable } = {}) {
  if (!registry || typeof registry.assertLaunchable !== 'function') {
    throw new ResourceResolutionError('A validated profile registry is required');
  }
  if (typeof isAvailable !== 'function') {
    throw new ResourceResolutionError('An asset availability checker is required');
  }

  registry.assertLaunchable(profileId);
  const resource = registry.getResource(profileId, resourceId);
  if (resource.ownerProfileId !== profileId) {
    throw new ResourceResolutionError(`Resource ${resourceId} is not owned by profile ${profileId}`);
  }
  const root = registry.getApprovedRoot(resource.rootId);
  const relativePath = validateRelativePath(resource.path, `resource ${resourceId}.path`);
  const available = await isAvailable({
    rootId: root.id,
    rootPath: root.path,
    relativePath,
  });
  if (available !== true) throw new MissingResourceFileError(profileId, resourceId);

  const encodedPath = relativePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
  return Object.freeze({
    profileId,
    resourceId,
    rootId: root.id,
    uri: `asset://${root.id}/${encodedPath}`,
  });
}
