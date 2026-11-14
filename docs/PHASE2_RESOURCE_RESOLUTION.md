# Phase 2: Secure Resource Resolution

## Resolution flow

The server reads `web/maps/approved-asset-roots.json` as the root allowlist and loads profiles and resource manifests through the existing profile registry. The browser-facing route is:

```text
GET /api/assets/{profileId}/{resourceId}
```

Both path components are logical IDs. The server looks up the resource in the selected profile, checks that the profile is launchable and that the resource belongs to it, then obtains the resource's root ID and relative path from the validated manifest. The browser cannot supply a root directory or filesystem path.

The server resolves the approved root to a canonical directory, validates the manifest's relative path, resolves the target with `realpath`, and checks containment using `path.relative` rather than a string-prefix comparison. It rejects targets that resolve outside the canonical root, including symlink escapes, and accepts regular files only. After validation, it opens the file and serves its open handle; the endpoint does not return the physical path. Missing or invalid references receive generic HTTP errors that do not disclose server paths.

## Logical IDs and physical paths

`asset://` identifiers are logical resource references; they are not physical paths and do not themselves provide a filesystem security boundary. The HTTP endpoint uses registered profile and resource IDs and does not accept an `asset://` URI or arbitrary path from the browser. Physical resolution is performed only by the server against roots in the approved-root registry.

`resource-data/` is not added to the static web root. A file there can only be served through the endpoint if it is registered to a launchable profile under an approved root. No resource ownership was assigned during this phase.

## Error behavior

- Malformed endpoint references: `400`.
- Unknown profiles/resources, unapproved roots, missing files, non-regular files, or containment violations: generic `404`.
- Registered profiles that are not launchable: `409`.
- Unsupported HTTP methods: `405`.
- Unexpected server failures: generic `500`.

The `Content-Type` is selected from the resource filename extension where known; otherwise the endpoint uses `application/octet-stream`. Responses include `X-Content-Type-Options: nosniff`.

## Remaining work and limitations

- Teammate and Kelly profiles remain pending verification, have empty resource manifests, and are not launchable. The three unknown profiles remain placeholders. Consequently, no existing scientific asset is exposed through this endpoint yet.
- Which `resource-data/` files belong to each map remains unresolved. Filenames alone are not used to assign ownership.
- The endpoint does not load data into Three.js, transform coordinates, switch maps, or change missions or rover behavior.
- The existing static file route is preserved; `resource-data/` remains outside its public root.
- Canonical path checks and an opened file handle prevent the endpoint from returning a path or following a validated target to an outside symlink. Deployment must still keep approved roots and their parent directories under trusted server-side control.
