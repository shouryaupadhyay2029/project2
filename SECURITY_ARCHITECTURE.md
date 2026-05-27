# Security Architecture

## Request security

- `helmet` sets common secure HTTP headers. CSP is currently disabled, so add an application-specific CSP before serving untrusted content.
- CORS is configured from `CLIENT_URL`; production should use an exact origin, not `*`.
- `express.json` and `express.urlencoded` are limited to `10mb`.
- `express-mongo-sanitize` strips MongoDB operator characters from request data.
- `sanitizeBody` applies additional body sanitization.
- `compression` and `morgan` improve operational behavior and logging.

## Authentication and authorization

- REST protected routes use JWT middleware from `backend/middleware`.
- Socket.IO authenticates with `JWT_SECRET`, with a fallback path that maps Google/Firebase-style tokens by email.
- Authorization checks are implemented in route controllers and socket handlers; conversation and workspace socket events verify membership before joining/broadcasting.

## Rate limiting

The server applies a general limiter plus specialized limiters for auth, messages, search, presence, and contact routes. In a horizontally scaled production setup, use an external store or gateway-level limiting so limits are shared across instances.

## Sensitive operations

- Account deletion is protected by auth middleware.
- Database restore is guarded by `RESTORE_CONFIRM=true` and only restores paths inside `BACKUP_DIR`.
- Backup/restore uses `child_process.spawn` with `shell: false` to avoid shell interpolation.

## Recommended hardening

- Use a long random `JWT_SECRET` and rotate it through a managed secret store.
- Enforce HTTPS at the load balancer or reverse proxy.
- Restrict MongoDB network access and use least-privilege database users.
- Validate file uploads and attachment URLs before enabling public serving.
- Add audit events for admin/moderation actions and restore operations.
- Add dependency scanning and run `npm audit` in CI.
- Consider Redis-backed sessions/rate limits and Socket.IO adapter for multi-instance deployments.
