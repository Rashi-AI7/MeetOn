# MeetOn — Production Hosting Guide

A complete guide to deploying MeetOn for real users with HTTPS, Socket.IO,
WebRTC/TURN, and production-grade configuration.

---

## Architecture Overview

```
Internet
   │
   ├─ HTTPS (443)  →  Frontend CDN (Netlify / Vercel / Render Static)
   │                     └─ build/ of React app
   │
   ├─ HTTPS (443) / WSS (443)  →  Backend (Render / Railway / Heroku / VPS)
   │                               ├─ Express REST API  /api/v1/*
   │                               └─ Socket.IO  /socket.io
   │
   ├─ MongoDB Atlas (managed, free M0 or paid)
   │
   └─ TURN server (Twilio / Metered / self-hosted coturn)
```

---

## 1 — MongoDB Atlas

1. **Create cluster** at https://cloud.mongodb.com (M0 free or M10+ for production)
2. **Database Access** → Add Database User → password auth → read/write on `meeton` DB
3. **Network Access** → Add IP `0.0.0.0/0` (allow all) or your server's static IP
4. **Connect** → Drivers → copy `mongodb+srv://...` connection string

> ⚠️ Rotate the password before deploying — replace `<password>` in the URI.

---

## 2 — Backend Deployment

### Option A — Render (easiest, free tier available)

1. Push code to GitHub
2. New → Web Service → connect your repo
3. **Root Directory**: `backend`
4. **Build Command**: `npm install`
5. **Start Command**: `npm start`
6. **Environment Variables** (set all in the Render dashboard):

```
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/meeton
JWT_SECRET=<64-char hex — generate with node -e "require('crypto').randomBytes(64).toString('hex')">
JWT_EXPIRES_IN=7d
PORT=10000
BASE_URL=https://your-backend.onrender.com
ALLOWED_ORIGIN=https://your-frontend.netlify.app,https://your-custom-domain.com
NODE_ENV=production
```

Optional services:
```
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

### Option B — Railway

1. New Project → Deploy from GitHub → select `backend/` directory
2. Set the same environment variables as above
3. Railway auto-detects Node.js and runs `npm start`

### Option C — VPS (DigitalOcean / Hetzner / Linode)

```bash
# On the server:
git clone <repo> /var/www/meeton
cd /var/www/meeton/backend
npm install --omit=dev
cp .env.example .env
# Edit .env with production values

# Install pm2
npm install -g pm2

# Start
pm2 start src/app.js --name meeton-backend
pm2 save
pm2 startup   # enable on boot

# Nginx reverse proxy (see nginx config below)
```

**Nginx config** (`/etc/nginx/sites-available/meeton-api`):
```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # Socket.IO needs upgrade headers
    location / {
        proxy_pass         http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host       $host;
        proxy_set_header   X-Real-IP  $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;    # keep WebSocket alive
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

Get SSL cert with Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

---

## 3 — Frontend Deployment

### Build

```bash
cd frontend

# Set production env vars (create a .env.production or pass inline)
cat > .env.production << 'EOF'
REACT_APP_SERVER_URL=https://api.yourdomain.com
REACT_APP_TURN_SERVER=turn:your.turn.server:3478
REACT_APP_TURN_USERNAME=your_turn_username
REACT_APP_TURN_CREDENTIAL=your_turn_password
EOF

npm run build
# Output: build/ directory — upload this to your static host
```

### Option A — Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# One-time login
netlify login

# Deploy
cd frontend
npm run build
netlify deploy --prod --dir=build
```

Or connect via Netlify dashboard → New site from Git → set:
- **Base directory**: `frontend`
- **Build command**: `npm run build`
- **Publish directory**: `frontend/build`
- **Environment variables**: add `REACT_APP_SERVER_URL` etc.

Add a `frontend/public/_redirects` file to make React Router work:
```
/*    /index.html   200
```

### Option B — Vercel

```bash
npm install -g vercel
cd frontend
vercel --prod
```

Set environment variables in the Vercel dashboard under Settings → Environment Variables.

Add `frontend/vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Option C — Serve from Backend (same origin, simpler CORS)

```bash
cd frontend
npm run build

# Copy build to backend
cp -r build ../backend/public

# In backend/src/app.js add before the 404 handler:
# app.use(express.static(path.join(__dirname, '../public')));
# app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
```

Then set `ALLOWED_ORIGIN` to the same domain as the backend.

---

## 4 — TURN Server (Critical for Production Video)

WebRTC works fine on the same local network but **will fail for users behind
symmetric NAT** (most corporate firewalls, some home routers) without a TURN server.

### Option A — Twilio Network Traversal Service (easiest)

1. Sign up at https://www.twilio.com
2. Console → Network Traversal Service → enable it
3. Get your Account SID and Auth Token
4. Generate ephemeral credentials server-side and pass to the frontend

Simple free-tier approach — add to backend (create `/api/v1/turn-credentials`):
```javascript
// route handler
import twilio from 'twilio';
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const token  = await client.tokens.create();
res.json({ iceServers: token.iceServers });
```

Then in VideoMeet.jsx, fetch from this endpoint instead of using the hardcoded STUN config.

### Option B — Metered.ca (generous free tier)

1. Sign up at https://metered.ca
2. Create an app → get a TURN domain + API key
3. Set in frontend `.env.production`:
```env
REACT_APP_TURN_SERVER=turn:yourdomain.metered.live:80
REACT_APP_TURN_USERNAME=your_username
REACT_APP_TURN_CREDENTIAL=your_password
```

### Option C — Self-hosted coturn (VPS)

```bash
sudo apt install coturn

# /etc/turnserver.conf
realm=yourdomain.com
fingerprint
listening-ip=0.0.0.0
external-ip=YOUR_PUBLIC_IP
min-port=49152
max-port=65535
lt-cred-mech
user=meeton:your_strong_password
cli-password=your_cli_password
pidfile=/var/run/turnserver.pid
log-file=/var/log/coturn/turnserver.log
no-stdout-log

sudo systemctl enable coturn
sudo systemctl start coturn

# Open firewall: UDP 3478, UDP 49152-65535
```

Frontend env:
```env
REACT_APP_TURN_SERVER=turn:yourdomain.com:3478
REACT_APP_TURN_USERNAME=meeton
REACT_APP_TURN_CREDENTIAL=your_strong_password
```

---

## 5 — Environment Variables Reference

### Backend (`.env` / hosting dashboard)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | 64-char random hex secret |
| `JWT_EXPIRES_IN` | | Token lifetime (default: `7d`) |
| `PORT` | | Server port (default: `8000`) |
| `BASE_URL` | | Full URL of this server (for avatar URLs) |
| `ALLOWED_ORIGIN` | | Comma-separated list of allowed frontend origins |
| `NODE_ENV` | | Set to `production` in prod |
| `GOOGLE_CLIENT_ID` | | Google OAuth Client ID |
| `TWILIO_ACCOUNT_SID` | | Twilio SID (for phone OTP) |
| `TWILIO_AUTH_TOKEN` | | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | | Twilio sender phone number |

### Frontend (`.env.production`)

| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_SERVER_URL` | ✅ | Backend URL e.g. `https://api.yourdomain.com` |
| `REACT_APP_TURN_SERVER` | Recommended | TURN server URL |
| `REACT_APP_TURN_USERNAME` | Recommended | TURN username |
| `REACT_APP_TURN_CREDENTIAL` | Recommended | TURN password |

---

## 6 — Socket.IO in Production

Socket.IO needs WebSocket upgrade support. Most cloud platforms support this:

- **Render**: WebSockets enabled by default ✅
- **Railway**: WebSockets enabled by default ✅
- **Heroku**: Enable with `heroku config:set DYNO=1` (uses polling fallback) — dyno sleeping breaks WS on free tier
- **Nginx**: Requires `Upgrade` and `Connection` headers (see nginx config above) ✅
- **Cloudflare**: Enable WebSockets in the Cloudflare dashboard → Network ✅

**Sticky sessions** are required if you run multiple backend instances (Socket.IO requires the same server to handle all connections from one client). In the current single-server deployment this is not an issue. For multi-instance, use Redis adapter:

```bash
npm install @socket.io/redis-adapter ioredis
```

```javascript
// In socketManager.js
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
const pubClient = new Redis(process.env.REDIS_URL);
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

---

## 7 — Scaling Considerations

| Scale | Recommendation |
|-------|---------------|
| 1–50 concurrent users | Single Render/Railway instance (free tier) |
| 50–500 users | Render paid instance + Redis adapter for Socket.IO |
| 500+ users | SFU architecture (mediasoup / Janus) — mesh WebRTC doesn't scale beyond ~6 per room |
| Video at scale | Consider LiveKit, Daily.co, or Agora instead of raw WebRTC mesh |

The current architecture uses **full-mesh WebRTC** — every participant sends video
to every other participant. This is why `MAX_PARTICIPANTS_MESH = 6` is enforced
in `socketManager.js`. Beyond ~6 people the CPU/bandwidth cost becomes prohibitive.
For larger meetings you'd need an SFU (Selective Forwarding Unit).

---

## 8 — Launch Checklist

### Security
- [ ] `JWT_SECRET` is a fresh 64-char random hex (not the example placeholder)
- [ ] MongoDB password rotated (old password may be in git history)
- [ ] `ALLOWED_ORIGIN` set to your real frontend domain (not `*`)
- [ ] `NODE_ENV=production` set in backend
- [ ] `.env` files NOT committed to git (check `.gitignore`)
- [ ] HTTPS enabled on both frontend and backend
- [ ] Rate limiting active (already in code — verify it's not bypassed by a proxy)

### Functionality
- [ ] Backend `/health` endpoint returns `{"status":"ok"}`
- [ ] Register + login flow works end-to-end
- [ ] Video call connects between two different devices/networks
- [ ] Chat messages appear in real-time
- [ ] Meeting history records correctly
- [ ] Logout clears session

### Performance
- [ ] Frontend build: `npm run build` (not `npm start`)
- [ ] Backend: running with `npm start` or `pm2`, NOT `nodemon`
- [ ] MongoDB indexes in place (auto-created by Mongoose schemas on first run)

### Monitoring (recommended)
- [ ] Set up uptime monitoring (UptimeRobot free tier)
- [ ] Add error tracking (Sentry free tier):
  ```bash
  npm install @sentry/node
  # In app.js: Sentry.init({ dsn: process.env.SENTRY_DSN })
  ```

---

## 9 — Remaining Blockers (Require External Services)

These features require paid/external accounts and **cannot be self-configured**:

1. **Google Sign-In** — requires a Google Cloud project and OAuth 2.0 Client ID
   - Setup: https://console.cloud.google.com → APIs & Services → Credentials
   - Add your frontend domain to "Authorised JavaScript origins"
   - Backend only needs the Client ID (not the secret)

2. **Phone OTP (SMS)** — requires a Twilio account + phone number
   - Free trial available at https://www.twilio.com
   - Without credentials, OTPs print to the server console (fine for dev)

3. **TURN server** — required for video calls between users on different NAT networks
   - Free options: Metered.ca, Twilio NTS (limited free)
   - Without TURN, calls work on LAN but may fail over the internet

4. **Custom domain + SSL** — needed for camera/microphone access in production
   - Browsers require HTTPS (or localhost) to access `getUserMedia()`
   - Free SSL via Let's Encrypt + Nginx, or automatic on Render/Netlify/Vercel
