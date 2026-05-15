# Real-time Chat App — Node.js Interview Project

A multi-room chat app demonstrating: Express, Socket.io, JWT auth, bcrypt, SQLite, async/await, and middleware patterns.

## Stack
- **Express** — HTTP server + routing + middleware
- **Socket.io** — WebSocket real-time messaging
- **better-sqlite3** — file-based database, no setup needed
- **jsonwebtoken** — JWT auth for HTTP routes and WebSocket connections
- **bcryptjs** — password hashing
- **dotenv** — environment config

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env (already included — edit JWT_SECRET in production)
# PORT=3000
# JWT_SECRET=super_secret_jwt_key_change_this_in_production

# 3. Start the server
npm start

# Development mode (auto-restart on file changes)
npm run dev
```

---

## HTTP API Endpoints

### Register
```
POST /auth/register
Content-Type: application/json

{ "username": "rondel", "password": "secret123" }
```
Response: `{ "token": "eyJ...", "username": "rondel" }`

---

### Login
```
POST /auth/login
Content-Type: application/json

{ "username": "rondel", "password": "secret123" }
```
Response: `{ "token": "eyJ...", "username": "rondel" }`

---

### Message History (Protected)
```
GET /rooms/general/history
Authorization: Bearer <token>
```
Response: `{ "room": "general", "messages": [...] }`

---

### Health Check
```
GET /health
```
Response: `{ "status": "ok", "timestamp": "..." }`

---

## WebSocket Events

Connect with the JWT token:
```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'your_jwt_token_here' }
});
```

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `join_room` | `{ room }` | Join a chat room |
| `send_message` | `{ room, content }` | Send a message |
| `leave_room` | `{ room }` | Leave a room |
| `typing` | `{ room, isTyping }` | Broadcast typing indicator |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `message_history` | `[...messages]` | Last 50 messages on join |
| `new_message` | `{ username, content, room, created_at }` | New message in room |
| `user_joined` | `{ username, message, timestamp }` | Someone joined |
| `user_left` | `{ username, message, timestamp }` | Someone left |
| `user_typing` | `{ username, isTyping }` | Typing indicator |
| `error_message` | `{ error }` | Error from server |

---

## Key Interview Talking Points

### Why wrap Express in http.createServer()?
Socket.io needs the raw `http.Server` instance to upgrade HTTP connections to WebSocket. Express alone can't do this.

### Why is better-sqlite3 synchronous?
SQLite is an embedded database (no network hop). Synchronous calls are fast enough and actually simplify the code in event handlers.

### How does JWT auth work for WebSockets?
HTTP headers aren't available after the WebSocket handshake, so the token is passed via `socket.handshake.auth.token` — a Socket.io-specific channel set on connect.

### Why "Invalid credentials" for both wrong username and wrong password?
Security: revealing which field is wrong helps attackers enumerate valid usernames.

### What does the 4-argument error handler do?
`(err, req, res, next)` — Express identifies error-handling middleware by the 4-argument signature. It catches anything passed via `next(err)`.

---

## Folder Structure
```
chat-app/
├── src/
│   ├── db.js          # SQLite setup + prepared statements
│   ├── auth.js        # /auth/register + /auth/login routes
│   ├── middleware.js  # JWT middleware for HTTP + WebSocket
│   ├── socket.js      # All Socket.io event handlers
│   └── server.js      # Entry point — wires everything together
├── .env
├── package.json
└── README.md
```
