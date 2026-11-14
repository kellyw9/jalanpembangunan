# Phase 1 Resource Resolution Boundary

`web/src/maps/resourceResolver.js` resolves a profile-owned resource ID to an `asset://` URI. That URI is a logical resource identifier, not a physical filesystem path or a filesystem security boundary. The Phase 1 resolver validates registered resource ownership, approved root IDs, and relative paths, then calls an injected availability checker. It does not open or canonicalize a filesystem path, establish canonical root containment, or prevent symlink escapes.

Actual filesystem resolution must be implemented server-side in a later phase. The server resolver must:

- Accept only registered resource IDs and approved root IDs; never accept arbitrary browser-supplied filesystem paths.
- Resolve each approved root and resource target to canonical filesystem paths.
- Enforce canonical containment of the target within its approved root after resolving symlinks, rejecting symlink escapes.
- Verify that the resolved target is a regular file before serving or reading it.

The Phase 1 `asset://` URI must not be treated as proof that any of these server-side checks have occurred.
