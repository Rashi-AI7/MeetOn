import { Router } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import {
    register, login, googleAuth,
    guestAccess,
    getUserHistory, addToHistory,
    getProfile, updateProfile, uploadAvatar, changePassword
} from "../controllers/user.controller.js";
import { verifyToken, requireFullAccount } from "../middleware/auth.js";

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
    fileFilter: (_, file, cb) => {
        if (file.mimetype.startsWith("image/")) cb(null, true);
        else cb(new Error("Only image files allowed."));
    },
});

const router = Router();

// ── Rate limiters ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, max: 20,
    standardHeaders: true, legacyHeaders: false,
    message: { message: "Too many attempts. Try again in 15 minutes." }
});

const guestLimiter = rateLimit({
    windowMs: 60 * 1000, max: 10,
    standardHeaders: true, legacyHeaders: false,
    message: { message: "Too many guest requests." }
});

// ── Local auth ────────────────────────────────────────────────────────────────
router.post("/register", authLimiter, register);
router.post("/login",    authLimiter, login);

// ── Google OAuth ──────────────────────────────────────────────────────────────
router.post("/google",   authLimiter, googleAuth);

// ── Guest access (fingerprint-gated) ─────────────────────────────────────────
router.post("/guest", guestLimiter, guestAccess);

// ── Protected ─────────────────────────────────────────────────────────────────
router.get( "/get_all_activity", verifyToken, requireFullAccount, getUserHistory);
router.post("/add_to_activity",  verifyToken, addToHistory);

// ── Profile ───────────────────────────────────────────────────────────────────
const profileLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20,
    message: { message: "Too many requests, please try again later." } });

router.get( "/profile",         verifyToken, getProfile);
router.patch("/profile",        verifyToken, profileLimiter, updateProfile);
router.post("/avatar",          verifyToken, profileLimiter, upload.single("avatar"), uploadAvatar);
router.post("/change-password", verifyToken, profileLimiter, changePassword);

export default router;
