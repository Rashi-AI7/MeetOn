import { Router } from "express";
import { createRoom, validateRoom, endRoom } from "../controllers/room.controller.js";
import { verifyToken, optionalAuth, requireFullAccount } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";

const router = Router();

const createLimiter = rateLimit({
    windowMs: 60 * 1000, max: 10,
    standardHeaders: true, legacyHeaders: false,
    message: { message: "Too many rooms created. Please wait." }
});

// Create room — full account only (guests cannot host)
router.post("/create", verifyToken, requireFullAccount, createLimiter, createRoom);

// Validate room — guests allowed (needed before joining)
router.get("/:code/validate", optionalAuth, validateRoom);

// End room — host only
router.patch("/:code/end", verifyToken, requireFullAccount, endRoom);

export default router;
