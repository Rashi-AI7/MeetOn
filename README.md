# MeetOn — Video Conferencing App

Secure, real-time video meetings. Node.js + Socket.IO backend, React frontend.

---

## Project Structure

```
meeton-synced/
├── backend/
│   ├── src/
│   │   ├── app.js                        # Express + Socket.IO bootstrap
│   │   ├── controllers/
│   │   │   ├── user.controller.js        # Auth: register, login, history
│   │   │   ├── room.controller.js        # Room: create, validate, end
│   │   │   └── socketManager.js          # WebRTC signalling + chat
│   │   ├── middleware/
│   │   │   └── auth.js                   # verifyToken, optionalAuth, requireFullAccount
│   │   ├── models/
│   │   │   ├── user.model.js             # User (local + Google + phone + guest)
│   │   │   ├── room.model.js             # Active meeting room
│   │   │   ├── meeting.model.js          # History record (one per user+room, upserted)
│   │   │   └── otp.model.js              # Phone OTP (TTL 10 min)
│   │   └── routes/
│   │       ├── users.routes.js           # /api/v1/users/*
│   │       └── rooms.routes.js           # /api/v1/rooms/*
│   ├── .env.example                      # Copy to .env and fill in
│   └── package.json
│
└── frontend/
    ├── public/
    │   ├── index.html
    │   ├── favicon.svg
    │   └── manifest.json
    ├── src/
    │   ├── index.js                      # React entry + BrowserRouter
    │   ├── App.js                        # Routes + RequireAuth guards
    │   ├── App.css                       # All global styles
    │   ├── index.css                     # Minimal reset
    │   ├── environment.js                # Backend URL (single source of truth)
    │   ├── contexts/
    │   │   └── AuthContext.jsx           # API calls: login, register, history
    │   ├── components/
    │   │   ├── MeetonLogo.jsx
    │   │   └── PageTitle.jsx
    │   ├── pages/
    │   │   ├── landing.jsx               # Public home page
    │   │   ├── authentication.jsx        # Login / Register
    │   │   ├── home.jsx                  # Dashboard (create/join meeting)
    │   │   ├── VideoMeet.jsx             # Video call (WebRTC + Socket.IO)
    │   │   ├── history.jsx               # Past meetings
    │   │   └── NotFound.jsx
    │   ├── styles/
    │   │   └── videoComponent.module.css
    │   └── utils/                        # (withAuth.jsx excluded — dead code)
    └── package.json
```

---

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A **MongoDB** database (Atlas free tier works fine)

---

## 1 — Backend Setup

```bash
cd backend
cp .env.example .env
```

Open `.env` and set **at minimum** these two values:

```env
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/meeton
JWT_SECRET=<64-char random hex — see below>
```

Generate a JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

All other `.env` keys are optional for local development:
- `GOOGLE_CLIENT_ID` — only needed if you use Google Sign-In
- `TWILIO_*` — only needed for phone OTP; without it OTPs are printed to the console
- `PORT` defaults to `8000`
- `ALLOWED_ORIGIN` defaults to `http://localhost:5173`

Install and start:
```bash
npm install
npm run dev        # nodemon (hot-reload)
# or
npm start          # plain node
```

You should see:
```
✅  MongoDB: cluster0.xxxxx.mongodb.net
🚀  Server on port 8000
```

---

## 2 — Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file (optional — only needed if your backend runs somewhere other than localhost):
```env
REACT_APP_SERVER_URL=http://localhost:8000
```

Start:
```bash
npm start
```

App opens at **http://localhost:5173** (or port 3000 if using create-react-app defaults).

> The `"proxy": "http://localhost:8000"` in `frontend/package.json` proxies all
> `/api/*` requests in development so you don't need CORS config changes locally.

---

## 3 — Full Local Run (both at once)

Terminal 1:
```bash
cd backend && npm run dev
```

Terminal 2:
```bash
cd frontend && npm start
```

---

## API Reference

### Auth — `/api/v1/users`

| Method | Path | Auth | Body | Returns |
|--------|------|------|------|---------|
| POST | `/register` | — | `{ name, username, password }` | `{ message }` |
| POST | `/login` | — | `{ username, password }` | `{ token, user: { name, username, avatar } }` |
| POST | `/google` | — | `{ idToken }` | `{ token, user }` |
| POST | `/phone/send-otp` | — | `{ phone }` | `{ message }` |
| POST | `/phone/verify-otp` | — | `{ phone, otp, name? }` | `{ token, user }` |
| POST | `/guest` | — | `{ fingerprint }` | `{ token, user, guestMeetingsUsed }` |
| GET | `/get_all_activity` | Bearer | — | `Meeting[]` sorted newest-first |
| POST | `/add_to_activity` | Bearer | `{ meeting_code }` | `{ message }` |

### Rooms — `/api/v1/rooms`

| Method | Path | Auth | Body | Returns |
|--------|------|------|------|---------|
| POST | `/create` | Bearer (full account) | `{ title? }` | `{ meetingCode, title, joinUrl }` |
| GET | `/:code/validate` | optional | — | `{ meetingCode, title, host_id }` |
| PATCH | `/:code/end` | Bearer (host only) | — | `{ message }` |

### Socket.IO Events

#### Client → Server
| Event | Args | Description |
|-------|------|-------------|
| `join-call` | `meetingCode, callback` | Join a room (validates DB + guest limits) |
| `signal` | `toSocketId, signalData` | Relay WebRTC offer/answer/ICE |
| `chat-message` | `text` | Send a chat message |
| `peer-ready` | — | Flush queued ICE candidates |
| `rejoin-call` | `meetingCode, callback` | Rejoin after brief disconnect |

#### Server → Client
| Event | Args | Description |
|-------|------|-------------|
| `existing-participants` | `socketId[]` | Sent to joiner with existing peer list |
| `user-joined` | `socketId, username, allIds[]` | Broadcast to existing peers |
| `user-left` | `socketId` | Broadcast on disconnect |
| `signal` | `fromSocketId, signalData` | Relayed WebRTC signal |
| `chat-message` | `text, sender, socketId` | Broadcast to all in room |
| `room-error` | `{ code, message }` | `ROOM_NOT_FOUND` / `ROOM_FULL` / `GUEST_LIMIT` |

---

## User Flows (verified end-to-end)

```
Register  → POST /register → 201 Created → navigate to /auth (login tab)
Login     → POST /login    → { token, user.{ name, username } }
                           → localStorage: token, username, name → /home

New Mtg   → POST /rooms/create (Bearer) → { meetingCode: "3a9fc1b2" }
           → ShareModal shows code
           → navigate /meet/3a9fc1b2

Join Mtg  → GET /rooms/3a9fc1b2/validate (optional)
           → VideoMeet lobby (display name)
           → socket.connect({ auth: { token } })   ← JWT verified by io.use()
           → emit("join-call", "3a9fc1b2")         ← Room.findOne() matches ✓
           → ack.success → addToUserHistory("3a9fc1b2")  ← upsert, no duplicates
           → on("existing-participants", ids)       ← offer to all existing peers
           → on("user-joined", id, name, allIds)    ← 3-arg signature ✓

Hangup    → tracks.stop() → navigate("/home")
           → useEffect cleanup → socket.disconnect()
           → backend emits "user-left" to all remaining peers ✓

History   → GET /get_all_activity (Bearer header ✓, NOT query param)
           → Meeting[] { user_id, meetingCode, date }
           → Rejoin → navigate("/meet/code") — no extra addToUserHistory call
```

---

## Production Checklist

- [ ] Set all `.env` vars in your hosting dashboard (never commit `.env`)
- [ ] Rotate MongoDB password (old one may be exposed in git history)
- [ ] Set `ALLOWED_ORIGIN` to your real frontend domain
- [ ] Add a TURN server for NAT traversal (`VITE_TURN_SERVER` in frontend `.env`)
- [ ] Replace `npm run dev` with `npm start` or `pm2 start src/app.js`
- [ ] Run `npm run build` in frontend and serve the `build/` folder
