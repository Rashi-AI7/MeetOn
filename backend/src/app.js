import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";

import { connectToSocket } from "./controllers/socketManager.js";
import userRoutes from "./routes/users.routes.js";
import roomRoutes from "./routes/rooms.routes.js";
import { User } from "./models/user.model.js";
import { verifyToken } from "./middleware/auth.js";

// ─── Bootstrap ────────────────────────────────────────────────────────────────
const app    = express();
const server = createServer(app);
connectToSocket(server);

// ─── Global middleware ────────────────────────────────────────────────────────
app.set("port", process.env.PORT || 8000);

// Security headers (helmet) — must come before routes
// crossOriginEmbedderPolicy disabled because media tracks need cross-origin access
app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));

const allowedOrigins = (process.env.ALLOWED_ORIGIN || "http://localhost:5173")
    .split(",").map(o => o.trim());

app.use(cors({
    origin: (origin, cb) => {
        // Allow requests with no origin (curl, Postman, server-to-server)
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));

app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/rooms", roomRoutes);


// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.status(200).json({ status: "ok", ts: Date.now() }));

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    const status  = err.status || err.statusCode || 500;
    const message = err.message || "Internal server error.";
    console.error(`[Error ${status}]`, message);
    return res.status(status).json({ message });
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal) => {
    console.log(`\n${signal} received — shutting down gracefully`);
    server.close(async () => {
        await mongoose.connection.close();
        console.log("✅ Closed DB connection. Exiting.");
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000); // force kill after 10s
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

// ─── Start ────────────────────────────────────────────────────────────────────
const start = async () => {
    const required = ["MONGO_URI", "JWT_SECRET"];
    const optional = ["GOOGLE_CLIENT_ID"];
    const missing  = required.filter((k) => !process.env[k]);
    const missingOptional = optional.filter((k) => !process.env[k]);

    if (missing.length) {
        console.error(`❌  Missing required env vars: ${missing.join(", ")}`);
        process.exit(1);
    }
    if (missingOptional.length) {
        console.warn(`⚠️   Optional env vars not set (some features disabled): ${missingOptional.join(", ")}`);
    }

    try {
        const db = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
        });
        console.log(`✅  MongoDB: ${db.connection.host}`);
        server.listen(app.get("port"), () =>
            console.log(`🚀  Server on port ${app.get("port")}`)
        );
    } catch (e) {
        console.error("❌  DB connection failed:", e.message);
        process.exit(1);
    }
};

start();