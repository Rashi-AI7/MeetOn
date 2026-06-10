import mongoose, { Schema } from "mongoose";

/**
 * OTP — stores phone verification codes.
 * Auto-deleted by MongoDB TTL after 10 minutes.
 */
const otpSchema = new Schema({
    phone:     { type: String, required: true },
    otpHash:   { type: String, required: true },  // bcrypt hash of the 6-digit OTP
    attempts:  { type: Number, default: 0 },       // wrong-guess counter
    createdAt: { type: Date, default: Date.now, expires: 600 }  // TTL: 10 min
});

const OTP = mongoose.model("OTP", otpSchema);
export { OTP };
