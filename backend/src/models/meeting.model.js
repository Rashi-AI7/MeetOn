import mongoose, { Schema } from "mongoose";

/**
 * Meeting — a history record written when a user joins or starts a call.
 * Intentionally separate from Room (which tracks the live session).
 *
 * FIX: original model had isActive/title/passcodeHash mixed in — those
 * belong exclusively in room.model.js.
 */
const meetingSchema = new Schema({
    // The user whose history this entry belongs to (username string)
    user_id: { type: String, required: true, index: true },

    // The opaque 8-char hex room code (e.g. "3a9fc1b2")
    meetingCode: { type: String, required: true },

    // Last-visited timestamp (updated on rejoin via upsert, not duplicated)
    date: { type: Date, default: Date.now, required: true },

    // Auto-expire history records after 90 days
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        index: { expires: 0 },
    },
}, { timestamps: true });

// Compound index — enforces one record per (user, meeting) pair,
// and makes the upsert in addToHistory an indexed O(log n) lookup.
meetingSchema.index({ user_id: 1, meetingCode: 1 }, { unique: true });

const Meeting = mongoose.model("Meeting", meetingSchema);
export { Meeting };
