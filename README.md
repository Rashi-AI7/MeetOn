# MeetOn 🎥

A full-stack real-time video conferencing web app built with React, Node.js, Socket.IO and WebRTC. Create instant meetings, invite anyone with a link, and collaborate with video, audio, chat, screen sharing and reactions — all in the browser.

![MeetOn](https://img.shields.io/badge/version-2.0.0-C62E65?style=flat-square)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-ESM-339933?style=flat-square&logo=node.js)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?style=flat-square&logo=socket.io)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb)

---

## Features

- **Video & Audio Calls** — Multi-user real-time video calls using WebRTC peer-to-peer mesh networking (up to 6 participants)
- **Perfect Negotiation** — Collision-safe WebRTC signaling following the W3C Perfect Negotiation pattern
- **Screen Sharing** — Share your screen with a single click, switch back to camera seamlessly
- **In-Meeting Chat** — Public group chat with message history replay for late joiners
- **Private DMs** — Send direct messages to individual participants mid-call
- **Emoji Reactions** — Floating emoji reactions visible to all participants
- **Raise Hand** — Signal the host without interrupting
- **Cam / Mic Controls** — Toggle camera and microphone independently, with live status shown to peers
- **Dark / Light Mode** — Persistent theme toggle
- **Authentication**
  - Email & password (bcrypt hashed)
  - Google OAuth 2.0
  - Fingerprint-based guest access (1 free meeting)
- **Meeting History** — Browse and rejoin past meetings (90-day TTL)
- **Duplicate Join Prevention** — Same account can't join the same meeting twice
- **Host Controls** — Host can end the meeting for all participants
- **Responsive UI** — Works on desktop and mobile browsers

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| React Router v6 | Client-side routing |
| Socket.IO Client | Real-time signaling |
| WebRTC (native) | Peer-to-peer video/audio |
| Material UI v5 | Component library |
| Axios | HTTP client |

### Backend
| Technology | Purpose |
|---|---|
| Node.js (ESM) | Runtime |
| Express 5 | HTTP server |
| Socket.IO 4 | WebSocket signaling server |
| Mongoose 9 | MongoDB ODM |
| JWT | Authentication tokens |
| bcrypt | Password hashing |
| Helmet | Security headers |
| express-rate-limit | Brute force protection |
| Google Auth Library | OAuth token verification |

### Database
| Technology | Purpose |
|---|---|
| MongoDB Atlas | Users, rooms, meeting history |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Frontend (React)                    │
│  Landing → Auth → Home → VideoMeet → History        │
│  AuthContext · ThemeContext · environment.js         │
└──────────────────┬──────────────────────────────────┘
                   │  REST (Axios) + WebSocket (Socket.IO)
┌──────────────────▼──────────────────────────────────┐
│               Backend (Express + Socket.IO)          │
│  /api/v1/users  ·  /api/v1/rooms                    │
│  user.controller · room.controller · socketManager  │
│  JWT middleware · rate limiting · Helmet             │
└──────────────────┬──────────────────────────────────┘
                   │  Mongoose
┌──────────────────▼──────────────────────────────────┐
│                 MongoDB Atlas                        │
│  Users · Rooms (24h TTL) · Meetings (90d TTL)       │
└─────────────────────────────────────────────────────┘

WebRTC: Direct P2P between browsers (STUN: Google public servers)
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Google Cloud project with OAuth 2.0 credentials (optional)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/MeetOn.git
cd MeetOn
```

### 2. Set up the backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in your values in .env
npm run dev
```

**`backend/.env`**
```env
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=7d
PORT=8000
ALLOWED_ORIGIN=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id   # optional
```

### 3. Set up the frontend

```bash
cd frontend
npm install
cp .env.example .env
npm start
```

**`frontend/.env`**
```env
REACT_APP_SERVER_URL=http://localhost:8000
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id   # optional
```

### 4. Open the app

Visit `http://localhost:3000`

---

## Deployment

### Backend → Railway
1. New Project → Deploy from GitHub → set root to `backend/`
2. Add all env vars from `backend/.env.example`
3. Settings → Networking → Generate Domain

### Frontend → Vercel
1. New Project → Import repo → set root to `frontend/`
2. Framework: Create React App
3. Add env vars:
   ```
   REACT_APP_SERVER_URL=https://your-backend.railway.app
   REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
   ```

### After deploying both
- Update `ALLOWED_ORIGIN` on Railway to your Vercel URL
- Add your Vercel URL to Google OAuth authorized origins
- MongoDB Atlas → Network Access → allow `0.0.0.0/0`

---

## Project Structure

```
MeetOn/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── user.controller.js
│   │   │   ├── room.controller.js
│   │   │   └── socketManager.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── models/
│   │   │   ├── user.model.js
│   │   │   ├── room.model.js
│   │   │   └── meeting.model.js
│   │   ├── routes/
│   │   │   ├── users.routes.js
│   │   │   └── rooms.routes.js
│   │   └── app.js
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── contexts/
    │   │   ├── AuthContext.jsx
    │   │   └── ThemeContext.jsx
    │   ├── pages/
    │   │   ├── VideoMeet.jsx
    │   │   ├── home.jsx
    │   │   ├── authentication.jsx
    │   │   ├── history.jsx
    │   │   └── landing.jsx
    │   ├── utils/
    │   │   └── environment.js
    │   └── App.js
    ├── .env.example
    └── package.json
```

---

## Security Highlights

- JWT verified at both HTTP and Socket.IO handshake layers
- Anti-enumeration: identical error for wrong username or wrong password
- `requireFullAccount` middleware blocks guests from protected routes
- Rate limiting on all auth, guest, and profile endpoints
- Helmet security headers (COEP disabled for WebRTC compatibility)
- bcrypt password hashing (10 rounds)
- NoSQL injection protection via mongo-sanitize
- Duplicate session prevention — same account can't join the same room twice

---

## Known Limitations

- **No TURN server** — calls may fail between users on strict symmetric NAT (corporate/mobile networks). Planned for a future release.
- **In-memory socket state** — room state resets on server restart. Redis pub/sub needed for horizontal scaling.
- **Mesh WebRTC** — capped at 6 participants. SFU architecture (e.g. mediasoup) needed for larger calls.

---

## Author

**Rashi-AI7**

