import httpStatus from "http-status";
import { Room } from "../models/room.model.js";
import { randomBytes } from "crypto";

// ─────────────────────────────────────────────
// POST /api/v1/rooms/create
// ─────────────────────────────────────────────
const createRoom = async (req, res) => {
    const { title } = req.body;

    try {
        let meetingCode, exists;
        do {
            meetingCode = randomBytes(4).toString("hex"); // e.g. "3a9fc1b2"
            exists = await Room.findOne({ meetingCode });
        } while (exists);

        const room = await new Room({
            meetingCode,
            host_id: req.user.username,
            title: title?.trim() || "Untitled Meeting"
        }).save();

        return res.status(httpStatus.CREATED).json({
            meetingCode: room.meetingCode,
            title: room.title,
            // FIX: was `/room/${code}` — frontend routes are /meet/:url not /room/:url
            joinUrl: `/meet/${room.meetingCode}`
        });
    } catch (e) {
        console.error("Create room error:", e);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Could not create room." });
    }
};

// ─────────────────────────────────────────────
// GET /api/v1/rooms/:code/validate
// ─────────────────────────────────────────────
const validateRoom = async (req, res) => {
    const { code } = req.params;

    if (!/^[a-f0-9]{8}$/.test(code))
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Invalid room code format." });

    try {
        const room = await Room.findOne({ meetingCode: code, isActive: true });
        if (!room)
            return res.status(httpStatus.NOT_FOUND).json({ message: "Room not found or has ended." });

        return res.status(httpStatus.OK).json({
            meetingCode: room.meetingCode,
            title: room.title,
            host_id: room.host_id
        });
    } catch (e) {
        console.error("Validate room error:", e);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Something went wrong." });
    }
};

// ─────────────────────────────────────────────
// PATCH /api/v1/rooms/:code/end
// ─────────────────────────────────────────────
const endRoom = async (req, res) => {
    const { code } = req.params;

    try {
        const room = await Room.findOne({ meetingCode: code });
        if (!room)
            return res.status(httpStatus.NOT_FOUND).json({ message: "Room not found." });

        if (room.host_id !== req.user.username)
            return res.status(httpStatus.FORBIDDEN).json({ message: "Only the host can end this meeting." });

        room.isActive = false;
        room.expiresAt = new Date(); // expire immediately so TTL index removes it
        await room.save();

        return res.status(httpStatus.OK).json({ message: "Meeting ended." });
    } catch (e) {
        console.error("End room error:", e);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Something went wrong." });
    }
};

export { createRoom, validateRoom, endRoom };