import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
    name:     { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String },          // null for OAuth-only users

    // ── Auth providers ────────────────────────────────────────────────────────
    googleId: { type: String, sparse: true, unique: true },
    phone:    { type: String, sparse: true, unique: true },
    authProvider: {
        type: String,
        enum: ["local", "google", "phone"],
        default: "local"
    },

    // ── Avatar ────────────────────────────────────────────────────────────────
    avatar: { type: String },

    // ── Guest tracking (fingerprint-based) ───────────────────────────────────
    // Stored on "virtual" guest accounts keyed by fingerprint
    guestFingerprint: { type: String, sparse: true, unique: true },
    guestMeetingsUsed: { type: Number, default: 0 },
    isGuest: { type: Boolean, default: false }

}, { timestamps: true });

const User = mongoose.model("User", userSchema);
export { User };
