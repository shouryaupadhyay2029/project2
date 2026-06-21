# API Documentation

Base URL: `http://localhost:5000` in development. JSON responses generally use a `success` flag plus data or `message` fields.

## Authentication

Protected endpoints expect a bearer token issued by `POST /api/auth/login` or `POST /api/auth/register`:

```http
Authorization: Bearer <jwt>
Content-Type: application/json
```

## Health and public service endpoints

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/` | Public service status and Socket.IO status. |
| `GET` | `/health` | Public lightweight health check. |

## Route groups

| Group | Base path | Main endpoints | Auth |
| --- | --- | --- | --- |
| Public | `/`, `/health` | Service metadata and health checks | Public |
| Auth | `/api/auth` | `POST /register`, `POST /login`, `GET /me`, `PUT /update` | Mixed |
| Users | `/api/users` | `GET /profile/:username`, `POST /view-profile/:username`, `PUT /update-profile`, `DELETE /delete-account` | Mixed |
| Projects | `/api/projects` | `POST /view/:id`, `POST /create`, `GET /my-projects`, `PUT /update/:id`, `DELETE /delete/:id`, `PUT /feature/:id`, `POST /like/:id`, `GET /all` | Mixed |
| Activity | `/api/activity` | `GET /me`, `GET /user/:username`, `GET /heatmap/:username`, `GET /contributions/:username` | Mixed |
| Messages | `/api/messages` | `POST /start`, `POST /send`, `GET /conversations`, `GET /conversation/:id`, `PUT /read/:id` | Protected |
| Notifications | `/api/notifications` | `GET /me`, `PUT /read-all`, `PUT /read/:id`, `DELETE /delete/:id` | Protected |
| Presence | `/api/presence` | `PUT /online`, `PUT /heartbeat`, `PUT /offline`, `GET /user/:userId` | Protected |
| Collaboration | `/api/collaboration` | `POST /send`, `PUT /accept/:id`, `PUT /reject/:id`, `GET /incoming`, `GET /outgoing` | Protected |
| Workspaces | `/api/workspaces` | `POST /create`, `GET /my-workspaces`, `GET /:id`, `PUT /add-member`, `PUT /remove-member`, `PUT /change-role`, `DELETE /delete/:id`, `GET /activity/:workspaceId` | Protected |
| Search | `/api/search` | `GET /users`, `GET /projects`, `GET /global`, `GET /trending` | Public, rate-limited |
| Analytics | `/api/analytics` | `POST /impression/:projectId`, `POST /click/:projectId`, `GET /project/:projectId`, `GET /me` | Mixed |
| Achievements | `/api/achievements` | `GET /me`, `GET /:username` | Protected |
| Bookmarks | `/api/bookmarks` | `POST /project/:id`, `DELETE /project/:id`, `GET /projects`, `POST /profile/:id`, `DELETE /profile/:id`, `GET /profiles`, `GET /status` | Protected |
| Trending | `/api/trending` | `GET /projects`, `GET /users` | Public |
| Feed | `/api/feed` | `GET /me` | Protected |
| Audit | `/api/audit` | `GET /me` | Protected |
| Reports | `/api/reports` | `POST /create`, `GET /me` | Protected |
| Follow | `/api/follow` | `GET /followers/:username`, `GET /following/:username`, `POST /:userId`, `POST /unfollow/:userId` | Mixed |
| Contact | `/api/contact` | `POST /send`, `GET /inbox` | Mixed |
| Settings | `/api/settings` | `GET /me`, `PUT /notifications`, `PUT /appearance`, `PUT /projects`, `PUT /ecosystem`, `PUT /security`, `PUT /advanced`, `DELETE /delete-account` | Protected |

## Request examples

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

```bash
curl http://localhost:5000/api/search/global?q=node
```

## Rate limits and middleware

The server applies global rate limiting plus stricter limits for auth, messages, search, presence, and contact routes. Requests also pass through Helmet, CORS, compression, JSON body parsing, Mongo sanitization, and body sanitization middleware.
