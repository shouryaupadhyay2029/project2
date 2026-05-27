# Database Schema

MongoDB is accessed through Mongoose models in `backend/models`.

## Collections and responsibilities

| Model | Purpose | Important relationships |
| --- | --- | --- |
| `user` | Accounts, profile data, preferences, security flags, online/last-seen state. | Referenced by projects, messages, collaborations, reports, workspaces, and activity. |
| `Project` | User-created project records, engagement counters, feature/like/view data. | Owned by a user; referenced by analytics, bookmarks, collaboration requests, reports, trending/feed logic. |
| `Activity` | User activity timeline and contribution-style events. | References users and related project/activity targets. |
| `Conversation` | Direct or group messaging conversation metadata. | Contains participants and latest message reference. |
| `Message` | Individual chat messages, attachments, read receipts. | Belongs to a conversation and sender. |
| `CollaborationRequest` | Project collaboration invites and status. | Links sender, receiver, and project. |
| `Workspace` | Team/workspace membership and roles. | Has owner and members; emits workspace activity. |
| `ProjectAnalytics` | Impressions/clicks and project analytics summaries. | Linked to projects and viewed by owners. |
| `Achievement` | Earned achievement records for users. | Linked to user profile and achievement type. |
| `AuditLog` | Security/account audit events. | Scoped to the authenticated user. |
| `Report` | User-submitted abuse/content reports. | References reporter and target content/user/project. |
| `ContactMessage` | Public contact form and inbox messages. | Read through contact inbox for authenticated users. |

## Data access patterns

- Public reads: profiles, project listings, search, trending, public activity, public health endpoints.
- Authenticated writes: profile updates, project CRUD, messages, bookmarks, collaborations, workspaces, reports.
- Realtime state: Socket.IO updates MongoDB `isOnline` / `lastSeen`, while room membership remains in memory.
- Analytics: public tracking endpoints record impressions/clicks; protected endpoints expose owner/user summaries.

## Backup coverage

`backend/backup/backupManager.js` uses `mongodump --uri <MONGO_URI> --out <backupPath>`, so all collections in the target database are included unless the MongoDB URI scopes to a specific database with limited privileges.
