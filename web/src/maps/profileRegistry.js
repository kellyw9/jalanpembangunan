import {
  cloneJson,
  deepFreeze,
  ProfileValidationError,
  validateApprovedAssetRoots,
  validateProfileDefinition,
  validateProfileIndex,
  validateResourceManifest,
} from './profileSchema.js';

export class ProfileNotFoundError extends Error {
  constructor(profileId) {
    super(`Unknown map profile: ${profileId}`);
    this.name = 'ProfileNotFoundError';
  }
}

export class ProfileNotLaunchableError extends Error {
  constructor(profileId) {
    super(`Map profile ${profileId} is not verified and launchable`);
    this.name = 'ProfileNotLaunchableError';
  }
}

export class ResourceNotFoundError extends Error {
  constructor(profileId, resourceId) {
    super(`Resource ${resourceId} is not registered for profile ${profileId}`);
    this.name = 'ResourceNotFoundError';
  }
}

export class ProfileRegistry {
  #profiles = new Map();
  #resources = new Map();
  #roots = new Map();

  constructor({ index, profiles, resourceManifests, approvedAssetRoots }) {
    validateProfileIndex(index);
    validateApprovedAssetRoots(approvedAssetRoots);

    this.#roots = new Map(approvedAssetRoots.roots.map(root => [root.id, deepFreeze(cloneJson(root))]));
    const indexedProfiles = new Map(index.profiles.map(entry => [entry.id, entry]));
    const profileList = Array.isArray(profiles) ? profiles : [];
    if (profileList.length !== indexedProfiles.size) {
      throw new ProfileValidationError('Every indexed profile must have exactly one profile definition');
    }

    const suppliedResourceManifests = resourceManifests ?? {};
    for (const profileInput of profileList) {
      const profile = cloneJson(validateProfileDefinition(profileInput));
      const entry = indexedProfiles.get(profile.id);
      if (!entry) throw new ProfileValidationError(`Profile ${profile.id} is absent from the profile index`);
      const profileDirectory = entry.profilePath.slice(0, entry.profilePath.lastIndexOf('/') + 1);
      if (`${profileDirectory}${profile.resourceManifest}` !== entry.resourceManifestPath) {
        throw new ProfileValidationError(`Profile ${profile.id} resource manifest does not match its indexed path`);
      }
      if (this.#profiles.has(profile.id)) throw new ProfileValidationError(`Duplicate profile id: ${profile.id}`);

      const manifest = suppliedResourceManifests[profile.id];
      if (!manifest) throw new ProfileValidationError(`Missing resource manifest for profile ${profile.id}`);
      const validatedManifest = cloneJson(
        validateResourceManifest(manifest, profile.id, new Set(this.#roots.keys())),
      );
      if (profile.status === 'verified' && profile.launchable && validatedManifest.resources.length === 0) {
        throw new ProfileValidationError(`Launchable profile ${profile.id} has no registered resources`);
      }

      this.#profiles.set(profile.id, deepFreeze(profile));
      this.#resources.set(profile.id, deepFreeze(validatedManifest.resources));
    }

    for (const profileId of indexedProfiles.keys()) {
      if (!this.#profiles.has(profileId)) throw new ProfileValidationError(`Missing profile definition: ${profileId}`);
    }
  }

  listProfiles() {
    return [...this.#profiles.values()].map(cloneJson);
  }

  getProfile(profileId) {
    const profile = this.#profiles.get(profileId);
    if (!profile) throw new ProfileNotFoundError(profileId);
    return cloneJson(profile);
  }

  assertLaunchable(profileId) {
    const profile = this.#profiles.get(profileId);
    if (!profile) throw new ProfileNotFoundError(profileId);
    if (profile.status !== 'verified' || profile.launchable !== true || profile.mapIdentity === null) {
      throw new ProfileNotLaunchableError(profileId);
    }
    if ((this.#resources.get(profileId) ?? []).length === 0) {
      throw new ProfileNotLaunchableError(profileId);
    }
    return cloneJson(profile);
  }

  getResource(profileId, resourceId) {
    if (!this.#profiles.has(profileId)) throw new ProfileNotFoundError(profileId);
    const resource = (this.#resources.get(profileId) ?? []).find(item => item.id === resourceId);
    if (!resource) throw new ResourceNotFoundError(profileId, resourceId);
    if (resource.ownerProfileId !== profileId) {
      throw new ProfileValidationError(`Resource ${resourceId} is not owned by profile ${profileId}`);
    }
    return cloneJson(resource);
  }

  getApprovedRoot(rootId) {
    const root = this.#roots.get(rootId);
    if (!root) throw new ProfileValidationError(`Unapproved asset root: ${rootId}`);
    return cloneJson(root);
  }
}
