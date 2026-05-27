# Socket Events

Socket.IO is initialized from `backend/socket/socketServer.js` and shares the same backend port as Express.

## Connection

Clients must provide a token in either `socket.auth.token` or the `token` query parameter. The server first verifies the token with `JWT_SECRET`; if that fails, it attempts to map Google/Firebase-style ID tokens by email.

```js
const socket = io(API_URL, {
  auth: { token },
  withCredentials: true,
});
```

On connection, the socket joins `user:<userId>` and the server broadcasts a `presence_update` event.

## Client-to-server events

| Event | Payload | Result |
| --- | --- | --- |
| `join_conversation` | `{ conversationId }` | Valid participants join `conversation:<conversationId>` and receive `joined_conversation`. |
| `leave_conversation` | `{ conversationId }` | Leaves the conversation room. |
| `send_message` | `{ conversationId, content, attachments }` | Persists and emits `receive_message`; sends `notification_created` to other participants. |
| `typing_start` | `{ conversationId }` | Broadcasts `typing_update` with `isTyping: true`. |
| `typing_stop` | `{ conversationId }` | Broadcasts `typing_update` with `isTyping: false`. |
| `message_read` | `{ conversationId }` | Marks messages read and emits `messages_read`. |
| `presence_ping` | none | Updates `lastSeen` and responds with `presence_pong`. |
| `workspace_update` | `{ workspaceId, action, payload }` | Members can broadcast workspace changes to `workspace:<workspaceId>`. |
| `collaboration_update` | `{ requestId, action }` | Notifies sender and receiver with `collaboration_update`. |
| `disconnect` | automatic | Updates presence when the user has no remaining active sockets. |

## Server-to-client events

| Event | Payload | Notes |
| --- | --- | --- |
| `presence_update` | `{ userId, isOnline, lastSeen }` | Broadcast when users connect/disconnect. |
| `joined_conversation` | `{ conversationId }` | Acknowledges room join. |
| `receive_message` | message object | Emitted to conversation room after message persistence. |
| `notification_created` | notification object | Direct user-room notification. |
| `typing_update` | `{ conversationId, userId, isTyping }` | Typing indicator. |
| `messages_read` | `{ conversationId, readBy }` | Read receipt. |
| `presence_pong` | `{ lastSeen }` | Heartbeat response. |
| `workspace_update` | `{ workspaceId, action, payload }` | Workspace realtime update. |
| `collaboration_update` | `{ requestId, action, projectId, status }` | Collaboration status update. |

## Scaling notes

The current `connectedUsers` map is in-memory, so horizontal scaling requires sticky sessions and a Socket.IO adapter such as Redis. Presence state is persisted to MongoDB, but room membership and direct socket maps are process-local.
