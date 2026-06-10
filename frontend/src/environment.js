// ─── Backend base URL ─────────────────────────────────────────────────────────
// Used by both AuthContext (HTTP) and VideoMeet (socket.io connection).
// In production, set REACT_APP_SERVER_URL in your hosting dashboard (.env is
// not committed). Falls back to localhost for local development.

const server = process.env.REACT_APP_SERVER_URL || "http://localhost:8000";

export default server;
