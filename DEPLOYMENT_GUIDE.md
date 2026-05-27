# Deployment Guide

## Prerequisites

- Node.js compatible with Express 5 and Socket.IO 4.
- MongoDB connection string.
- Optional: MongoDB Database Tools for `mongodump` / `mongorestore` backups.

## Environment variables

Create `backend/.env` in each environment:

```env
NODE_ENV=production
PORT=5000
CLIENT_URL=https://your-frontend.example.com
MONGO_URI=mongodb+srv://user:password@cluster/db
JWT_SECRET=replace-with-a-long-random-secret

# Optional backups
BACKUP_DIR=backend/backups
BACKUP_RETENTION_DAYS=7
BACKUP_SCHEDULE_ENABLED=false
BACKUP_INTERVAL_HOURS=24
```

For restores only:

```env
RESTORE_CONFIRM=true
```

## Local run

```bash
cd backend
npm install
npm run dev
```

Open `http://localhost:5000/health` to verify the API.

## Production steps

1. Provision MongoDB and set `MONGO_URI`.
2. Set a strong `JWT_SECRET` and exact `CLIENT_URL`.
3. Install dependencies with `npm ci` inside `backend`.
4. Start the API with `npm start` under a process manager or container runtime.
5. Serve the static frontend (`index.html`, `pages`, `js`, `styles`) from a web server or static hosting provider.
6. Configure TLS at the load balancer/reverse proxy.
7. Enable log collection for stdout/stderr and files under `backend/logs` if used.
8. Configure scheduled backups if required.

## Backup and restore

Manual backup:

```bash
cd backend
node -e "require('./backup/backupManager').createBackup().then(console.log).catch(err => { console.error(err.message); process.exit(1); })"
```

Restore is intentionally guarded:

```bash
cd backend
RESTORE_CONFIRM=true node backup/restore.js ./backups/backup-YYYY-MM-DDTHH-MM-SS-sssZ
```

## Scaling notes

- Use a shared MongoDB deployment with connection pooling.
- Socket.IO currently stores active socket IDs in memory. For multiple API instances, use sticky sessions and add a Socket.IO Redis adapter.
- Rate limiting is process-local unless backed by an external store; use Redis or gateway-level rate limiting for multi-instance deployments.
- Keep `CLIENT_URL` strict in production instead of using `*`.
- Run backups from one designated instance or external scheduler to avoid duplicate dumps.

## Operational checks

- `GET /health` returns `status: ok`.
- Auth login/register succeeds.
- Socket connection authenticates and receives presence events.
- Backups can be created and pruned in a staging environment.
