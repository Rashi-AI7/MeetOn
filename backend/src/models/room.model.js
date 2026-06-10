import mongoose, { Schema } from "mongoose";
import { randomBytes } from "crypto";

/**
 * Room — represents an active or recently-ended meeting session.
 * The meetingCode is the opaque URL token (e.g. /room/3a9fc1b2).
 * Separated from Meeting (history) so rooms can exist before anyone joins.
 */
const roomSchema = new Schema({
    meetingCode: {
        type: String,
        required: true,
        unique: true,
        default: () => randomBytes(4).toString("hex")
    },
    host_id:  { type: String, required: true },
    title:    { type: String, default: "Untitled Meeting" },
    isActive: { type: Boolean, default: true },

    // Passcode (optional) — stored hashed
    passcodeHash: { type: String },

    // Max participants (0 = unlimited)
    maxParticipants: { type: Number, default: 0 },

    // Auto-delete 24h after creation
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
        index: { expires: 0 }
    }
}, { timestamps: true });

const Room = mongoose.model("Room", roomSchema);
export { Room };
