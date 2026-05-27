# Contributing

## Project layout

- `backend/server.js` - Express app, middleware, routes, Socket.IO startup.
- `backend/routes` - API route definitions.
- `backend/api` - Route controller logic.
- `backend/models` - Mongoose models.
- `backend/socket` - Socket.IO authentication, presence, messaging, collaboration, workspace events.
- `backend/backup` - Backup, restore, and scheduler utilities.
- `pages`, `js`, `styles`, `index.html` - Frontend assets.

## Setup

```bash
cd backend
npm install
cp .env.example .env # if an example file exists, otherwise create .env manually
npm run dev
```

Required environment values:

```env
MONGO_URI=mongodb://localhost:27017/project2
JWT_SECRET=local-development-secret
CLIENT_URL=http://localhost:3000
PORT=5000
```

## Development guidelines

- Keep route files thin; put business logic in controllers under `backend/api`.
- Reuse existing auth, validation, rate-limit, and error-handling middleware.
- Do not log passwords, tokens, MongoDB URIs, or personal data.
- Prefer targeted controller/model tests for behavior changes when tests are added.
- Keep realtime events documented in `SOCKET_EVENTS.md` when adding or renaming events.
- Update `API_DOCUMENTATION.md` for new route groups or endpoint changes.

## Before opening a PR

1. Install dependencies with `npm install` or `npm ci`.
2. Run the relevant server command from `backend`.
3. Exercise changed API routes manually or with tests.
4. Check for obvious security regressions: missing auth, unbounded input, unsafe file paths, or secret exposure.
5. Update documentation for API, schema, deployment, and security-impacting changes.

## Commit style

Use clear, scoped messages such as:

- `feat(messages): add read receipt endpoint`
- `fix(auth): reject expired tokens`
- `docs(api): document workspace routes`
