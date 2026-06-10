# MeetOn — Quick Start (Local Development)

Everything you need to run MeetOn on your machine from a fresh clone.

---

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | ≥ 18 | `node -v` |
| npm | ≥ 9 | `npm -v` |
| MongoDB | Atlas free tier or local | — |

---

## Step 1 — Clone & Install

```bash
git clone <your-repo-url> meeton
cd meeton

# Install both halves
cd backend  && npm install
cd ../frontend && npm install
```

---

## Step 2 — Backend Environment

```bash
cd backend
cp .env.example .env
```

Open `.env` and fill in **at minimum** these two values:

```env
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/meeton
JWT_SECRET=<64-char random hex>
```

**Generate a JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**MongoDB Atlas free cluster** (if you don't have one):
1. Sign up at https://cloud.mongodb.com
2. Create a free M0 cluster
3. Database Access → Add user with read/write permissions
4. Network Access → Allow access from anywhere (`0.0.0.0/0`) for dev
5. Connect → Drivers → copy the SRV connection string

All other `.env` keys are optional for local dev:
- `GOOGLE_CLIENT_ID` — Google Sign-In (skip if not needed)
- `TWILIO_*` — Phone OTP (OTPs print to console without these)
- `PORT` — defaults to `8000`
- `ALLOWED_ORIGIN` — defaults to `http://localhost:5173`

---

## Step 3 — Start the Backend

```bash
cd backend
npm run dev        # nodemon hot-reload
# or
npm start          # plain node
```

You should see:
```
✅  MongoDB: cluster0.xxxxx.mongodb.net
🚀  Server on port 8000
```

Test the health endpoint:
```bash
curl http://localhost:8000/health
# → {"status":"ok","ts":...}
```

---

## Step 4 — Frontend Environment (optional)

Only needed if your backend is NOT on `http://localhost:8000`.

```bash
cd frontend
echo "REACT_APP_SERVER_URL=http://localhost:8000" > .env
```

For TURN server (needed for video behind symmetric NAT — optional for local LAN):
```env
REACT_APP_TURN_SERVER=turn:your.turn.server:3478
REACT_APP_TURN_USERNAME=your_turn_username
REACT_APP_TURN_CREDENTIAL=your_turn_password
```

---

## Step 5 — Start the Frontend

```bash
cd frontend
npm start
```

Opens at **http://localhost:3000** (CRA default) or **http://localhost:5173**.  
The `"proxy": "http://localhost:8000"` in `package.json` forwards all `/api/*`
requests in dev — no CORS changes needed.

---

## Step 6 — Full Local Run (two terminals)

**Terminal 1 — Backend:**
```bash
cd backend && npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend && npm start
```

---

## Test the Key Flows

| Flow | Steps |
|------|-------|
| Register | Go to `/auth` → Sign Up tab → fill form → submit |
| Login | Sign In tab → username + password |
| New meeting | Home → "Start a New Meeting" → share modal → Join Now |
| Join meeting | Home → enter code in field → Join |
| Video call | Confirm display name → Join Meeting → test cam/mic/chat |
| History | Nav bar → clock icon → past meetings listed |
| Logout | Nav bar → logout icon |

---

## Common Issues

### "Missing required env vars: MONGO_URI, JWT_SECRET"
You haven't created `backend/.env`. Follow Step 2.

### "DB connection failed"
- Wrong MONGO_URI format
- Atlas network access not set to allow your IP
- Wrong username/password in the URI

### Camera/microphone blocked
Browser needs HTTPS for camera access in production. Locally, `localhost` is treated as secure by all browsers — no HTTPS needed.

### Video calls not connecting between devices on different networks
You need a TURN server. See the HOSTING guide for options.

### Port already in use
```bash
# Change backend port
echo "PORT=8001" >> backend/.env
# Change frontend proxy
# Edit frontend/package.json → "proxy": "http://localhost:8001"
```

---

## Project Layout

```
meeton/
├── backend/
│   ├── src/
│   │   ├── app.js                  Express + Socket.IO bootstrap
│   │   ├── controllers/
│   │   │   ├── user.controller.js  Auth: register, login, guest, OTP
│   │   │   ├── room.controller.js  Room: create, validate, end
│   │   │   └── socketManager.js    WebRTC signalling + chat
│   │   ├── middleware/auth.js      JWT verification
│   │   ├── models/                 Mongoose schemas
│   │   └── routes/                 Express routers
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── public/
    └── src/
        ├── App.js                  Routes + auth guards
        ├── contexts/AuthContext.jsx API calls: login, register, history
        ├── environment.js          Backend URL (single source)
        └── pages/
            ├── landing.jsx         Public homepage
            ├── authentication.jsx  Login / Register
            ├── home.jsx            Dashboard
            ├── VideoMeet.jsx       WebRTC video call
            └── history.jsx         Past meetings
```
