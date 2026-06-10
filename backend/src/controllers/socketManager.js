import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { Room } from "../models/room.model.js";

// ─── In-memory room state ─────────────────────────────────────────────────────
// connections: { meetingCode: [socketId, ...] }
// messages:    { meetingCode: [{ sender, data, socketId, ts }, ...] }
// Cap messages per room to prevent memory leaks on long meetings
const MAX_MESSAGES_PER_ROOM = 200;
const MAX_PARTICIPANTS_MESH  = 6;   // above this WebRTC mesh degrades badly

let connections    = {};
let messages       = {};
let timeOnline     = {};
let participantNames = {}; // { socketId: displayName }
let socketToRoom     = {}; // { socketId: meetingCode } — O(1) reverse lookup
// Tracks which user (by user.id) is already live in which room.
// Prevents the same account joining a room twice (e.g. two tabs).
// { userId: { meetingCode, socketId } }
let activeUserSession = {};

// ─── ICE candidate queue ──────────────────────────────────────────────────────
// Stores candidates that arrive before remoteDescription is set on the peer.
// Key: socketId, Value: [{ targetId, candidate }, ...]
let pendingCandidates = {};

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: (process.env.ALLOWED_ORIGIN || "http://localhost:5173")
                .split(",")
                .map(o => o.trim()),
            methods: ["GET", "POST"],
            credentials: true
        },
        // Reconnection: allow up to 10s before treating as full disconnect
        pingTimeout: 10000,
        pingInterval: 5000
    });

    // ── JWT handshake auth ────────────────────────────────────────────────────
    // Guests pass a guest JWT; full users pass their normal JWT.
    // Both are verified here — unauthenticated connections are rejected.
    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error("AUTH_REQUIRED"));

        try {
            socket.user = jwt.verify(token, process.env.JWT_SECRET);
            next();
        } catch (err) {
            return next(new Error(err.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "INVALID_TOKEN"));
        }
    });

    io.on("connection", (socket) => {
        console.log(`🔌 Connected: ${socket.id} (${socket.user.username}${socket.user.isGuest ? " [guest]" : ""})`);

        // ── join-call ─────────────────────────────────────────────────────────
        // Client sends the opaque meetingCode, NOT a human name.
        // We validate the room exists in DB before allowing join.
        socket.on("join-call", async (meetingCode, displayName, callback) => {
            // Support both (code, cb) and (code, displayName, cb)
            if (typeof displayName === "function") { callback = displayName; displayName = null; }
            // Use display name if provided, fall back to account username
            if (displayName && typeof displayName === "string")
                socket.displayName = displayName.trim().slice(0, 40) || socket.user.username;
            else
                socket.displayName = socket.user.username;

            try {
                // Validate the room is real and active
                const room = await Room.findOne({ meetingCode, isActive: true });
                if (!room) {
                    socket.emit("room-error", { code: "ROOM_NOT_FOUND", message: "This room does not exist or has ended." });
                    return callback?.({ error: "ROOM_NOT_FOUND" });
                }

                // Block the same account from joining the same room twice.
                // This catches the "two tabs, same Gmail" case.
                const userId = socket.user.id;
                const existing = activeUserSession[userId];
                if (existing && existing.meetingCode === meetingCode) {
                    // Check the old socket is still actually connected
                    const oldSocket = io.sockets.sockets.get(existing.socketId);
                    if (oldSocket) {
                        socket.emit("room-error", {
                            code: "ALREADY_IN_MEETING",
                            message: "You are already in this meeting in another tab or window. Please close this tab."
                        });
                        return callback?.({ error: "ALREADY_IN_MEETING" });
                    }
                    // Old socket is gone (crashed/closed) — clean up stale entry and allow rejoin
                    delete activeUserSession[userId];
                }

                // Enforce guest meeting limit server-side (Option B+C enforcement)
                if (socket.user.isGuest) {
                    const guestUser = await User.findById(socket.user.id);
                    if (!guestUser || guestUser.guestMeetingsUsed >= 1) {
                        socket.emit("room-error", {
                            code: "GUEST_LIMIT",
                            message: "You have used your free guest meeting. Please sign up to continue."
                        });
                        return callback?.({ error: "GUEST_LIMIT" });
                    }
                    // Increment guest meeting counter server-side
                    // (cannot be bypassed by localStorage clearing — it's in the DB)
                    await User.findByIdAndUpdate(socket.user.id, { $inc: { guestMeetingsUsed: 1 } });
                }

                // Mesh WebRTC cap
                if (!connections[meetingCode]) connections[meetingCode] = [];
                if (connections[meetingCode].length >= MAX_PARTICIPANTS_MESH) {
                    socket.emit("room-error", { code: "ROOM_FULL", message: "This meeting is full (max 6 participants)." });
                    return callback?.({ error: "ROOM_FULL" });
                }

                connections[meetingCode].push(socket.id);
                participantNames[socket.id] = socket.displayName || socket.user.username;
                socketToRoom[socket.id] = meetingCode;
                timeOnline[socket.id] = new Date();
                activeUserSession[socket.user.id] = { meetingCode, socketId: socket.id };
                socket.join(meetingCode);

                // Tell existing participants about the new joiner
                socket.to(meetingCode).emit("user-joined", socket.id, socket.displayName, connections[meetingCode]);

                // Tell the new joiner who is already there
                const others = connections[meetingCode].filter(id => id !== socket.id);
                const othersWithNames = others.map(id => ({
                    id,
                    displayName: participantNames[id] || id.slice(0, 6)
                }));
                socket.emit("existing-participants", othersWithNames);

                // Replay capped message history
                if (messages[meetingCode]) {
                    messages[meetingCode].forEach((msg) => {
                        socket.emit("chat-message", msg.data, msg.sender, msg.socketId);
                    });
                }

                callback?.({ success: true, participants: connections[meetingCode].length, startedAt: room.createdAt.getTime() });
            } catch (e) {
                console.error("join-call error:", e);
                socket.emit("room-error", { code: "SERVER_ERROR", message: "Failed to join room." });
            }
        });

        // ── WebRTC: offer/answer/ice-candidate ────────────────────────────────
        // These are relayed between specific peers, not broadcast.
        socket.on("signal", (toSocketId, signalData) => {
            // Only relay if the target is still in the same room
            const sameRoom = Object.keys(connections).some(
                (room) => connections[room].includes(socket.id) && connections[room].includes(toSocketId)
            );
            if (!sameRoom) return;
            io.to(toSocketId).emit("signal", socket.id, signalData);
        });

        // ── ICE candidate relay ───────────────────────────────────────────────
        // Always relay immediately — the frontend queues candidates internally
        // until remoteDescription is set. The pendingCandidates queue here is
        // only for the peer-ready flush (candidates that arrive before the NEW
        // joiner has sent peer-ready after join-call ack).
        socket.on("ice-candidate", (toSocketId, candidate) => {
            const sameRoom = Object.keys(connections).some(
                (room) => connections[room].includes(socket.id) && connections[room].includes(toSocketId)
            );
            if (!sameRoom) return;
            // Always relay — don't check if target socket exists; it will handle it
            io.to(toSocketId).emit("ice-candidate", socket.id, candidate);
        });

        // ── peer-ready: flush queued ICE candidates ───────────────────────────
        socket.on("peer-ready", () => {
            if (pendingCandidates[socket.id]?.length) {
                pendingCandidates[socket.id].forEach(({ fromId, candidate }) => {
                    socket.emit("ice-candidate", fromId, candidate);
                });
                delete pendingCandidates[socket.id];
            }
        });

        // ── reaction: broadcast emoji reaction to room ──────────────────────────
        socket.on("reaction", (emoji) => {
            const ALLOWED = ["👍","❤️","😂","🎉","😮","🙌","🔥","👏"];
            if (!ALLOWED.includes(emoji)) return;
            const room = socketToRoom[socket.id];
            if (!room) return;
            io.to(room).emit("reaction", socket.id, socket.displayName || socket.user.username, emoji);
        });

        // ── raise-hand: toggle raise hand state ──────────────────────────────
        socket.on("raise-hand", (raised) => {
            const room = socketToRoom[socket.id];
            if (!room) return;
            socket.to(room).emit("raise-hand", socket.id, socket.displayName || socket.user.username, raised);
        });

        // ── private-message: relay DM between two peers ──────────────────────
        socket.on("private-message", (toSocketId, data) => {
            if (typeof data !== "string" || data.length > 2000) return;
            const sameRoom = Object.keys(connections).some(
                r => connections[r].includes(socket.id) && connections[r].includes(toSocketId)
            );
            if (!sameRoom) return;
            io.to(toSocketId).emit("private-message", socket.id, socket.displayName || socket.user.username, data);
            // Echo back to sender so they see it in their own DM thread
            socket.emit("private-message-echo", toSocketId, data);
        });

        // ── host-end-meeting: host ends call for everyone ────────────────────────
        socket.on("host-end-meeting", async (meetingCode) => {
            try {
                const room = await Room.findOne({ meetingCode });
                if (!room) return;
                if (room.host_id !== socket.user.username) return; // only host
                room.isActive = false;
                room.expiresAt = new Date(); // expire immediately → frees code
                await room.save();
                // Notify all participants including the host
                io.to(meetingCode).emit("room-ended", { endedBy: socket.displayName || socket.user.username });
            } catch (e) {
                console.error("host-end-meeting error:", e);
            }
        });

        // ── media-state: relay cam/mic on/off to all peers in room ─────────────
        socket.on("media-state", (state) => {
            const room = socketToRoom[socket.id];
            if (!room) return;
            // Relay to everyone else in the room, including the sender's socketId
            socket.to(room).emit("media-state", socket.id, state);
        });

        // ── chat-message ──────────────────────────────────────────────────────
        socket.on("chat-message", (data) => {
            // Sender identity from verified JWT — NOT from client payload
            const sender = socket.displayName || socket.user.username;

            const matchingRoom = socketToRoom[socket.id];
            if (!matchingRoom) return;

            if (!messages[matchingRoom]) messages[matchingRoom] = [];

            // Cap stored messages to prevent memory leaks
            if (messages[matchingRoom].length >= MAX_MESSAGES_PER_ROOM) {
                messages[matchingRoom].shift(); // drop oldest
            }

            const entry = { sender, data, socketId: socket.id, ts: Date.now() };
            messages[matchingRoom].push(entry);

            // Broadcast to all in the native socket.io room
            io.to(matchingRoom).emit("chat-message", data, sender, socket.id);
        });

        // ── disconnect ────────────────────────────────────────────────────────
        socket.on("disconnect", (reason) => {
            console.log(`❌ Disconnected: ${socket.id} (${reason})`);

            delete pendingCandidates[socket.id];
            delete timeOnline[socket.id];
            delete participantNames[socket.id];
            delete socketToRoom[socket.id];
            // Release the user's active session slot so they can rejoin
            if (activeUserSession[socket.user.id]?.socketId === socket.id) {
                delete activeUserSession[socket.user.id];
            }

            for (const [room, participants] of Object.entries(connections)) {
                const idx = participants.indexOf(socket.id);
                if (idx === -1) continue;

                participants.splice(idx, 1);

                // Notify remaining peers
                io.to(room).emit("user-left", socket.id);

                // Clean up empty rooms
                if (participants.length === 0) {
                    delete connections[room];
                    delete messages[room];
                }
                break;
            }
        });

        // ── reconnect-join: client rejoins after brief network blip ──────────
        // Frontend should emit this after socket.io auto-reconnects
        socket.on("rejoin-call", async (meetingCode, callback) => {
            try {
                const room = await Room.findOne({ meetingCode, isActive: true });
                if (!room) return callback?.({ error: "ROOM_NOT_FOUND" });

                if (!connections[meetingCode]) connections[meetingCode] = [];
                if (!connections[meetingCode].includes(socket.id)) {
                    connections[meetingCode].push(socket.id);
                }
                socket.join(meetingCode);
                socketToRoom[socket.id] = meetingCode;
                participantNames[socket.id] = socket.displayName || socket.user.username;
                // Re-register session so ALREADY_IN_MEETING check doesn't block this socket
                activeUserSession[socket.user.id] = { meetingCode, socketId: socket.id };

                // Tell existing peers someone rejoined
                socket.to(meetingCode).emit("user-rejoined", socket.id, socket.displayName || socket.user.username);

                // Re-send existing-participants so the frontend re-establishes peer connections
                const others = connections[meetingCode].filter(id => id !== socket.id);
                const othersWithNames = others.map(id => ({
                    id,
                    displayName: participantNames[id] || id.slice(0, 6)
                }));
                socket.emit("existing-participants", othersWithNames);

                callback?.({ success: true });
            } catch (e) {
                console.error("rejoin-call error:", e);
                callback?.({ error: "SERVER_ERROR" });
            }
        });
    });

    return io;
};