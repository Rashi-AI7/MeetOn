import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import { Meeting } from "../models/meeting.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const getGoogleClient = () => {
    if (!process.env.GOOGLE_CLIENT_ID) return null;
    return new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const signToken = (payload) =>
    jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

// Returns only the fields the frontend needs — never leaks password / googleId
const safeUser = (user) => ({
    name:         user.name,
    username:     user.username,
    avatar:       user.avatar || null,
    isGuest:      user.isGuest || false,
    authProvider: user.authProvider,
});

// ─────────────────────────────────────────────
// POST /api/v1/users/register  (local)
// ─────────────────────────────────────────────
const register = async (req, res) => {
    const { name, username, password } = req.body;

    if (!name || !username || !password)
        return res.status(httpStatus.BAD_REQUEST).json({ message: "name, username and password are required." });

    if (username.length < 3 || username.length > 30)
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Username must be 3–30 characters." });
    if (!/^[a-zA-Z0-9_.\-]+$/.test(username))
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Username may only contain letters, numbers, _ . -" });

    if (password.length < 8)
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Password must be at least 8 characters." });

    try {
        if (await User.findOne({ username }))
            return res.status(httpStatus.CONFLICT).json({ message: "Username already taken." });

        const hashedPassword = await bcrypt.hash(password, 10);
        await new User({ name, username, password: hashedPassword, authProvider: "local" }).save();

        return res.status(httpStatus.CREATED).json({ message: "Registered successfully." });
    } catch (e) {
        console.error("Register error:", e);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Something went wrong." });
    }
};

// ─────────────────────────────────────────────
// POST /api/v1/users/login  (local)
// ─────────────────────────────────────────────
const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
        return res.status(httpStatus.BAD_REQUEST).json({ message: "username and password are required." });

    try {
        const user  = await User.findOne({ username });
        const valid = user ? await bcrypt.compare(password, user.password) : false;

        // Anti-enumeration: same response for wrong user OR wrong password
        if (!user || !valid)
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid username or password." });

        const token = signToken({ id: user._id, username: user.username, isGuest: false });
        return res.status(httpStatus.OK).json({ token, user: safeUser(user) });
    } catch (e) {
        console.error("Login error:", e);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Something went wrong." });
    }
};

// ─────────────────────────────────────────────
// POST /api/v1/users/google
// Body: { idToken }
// ─────────────────────────────────────────────
const googleAuth = async (req, res) => {
    const googleClient = getGoogleClient();
    if (!googleClient)
        return res.status(httpStatus.SERVICE_UNAVAILABLE).json({ message: "Google Sign-In is not configured on this server." });

    const { idToken } = req.body;
    if (!idToken)
        return res.status(httpStatus.BAD_REQUEST).json({ message: "idToken is required." });

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const { sub: googleId, name, email, picture } = ticket.getPayload();

        let user = await User.findOne({ googleId });

        if (!user) {
            user = await User.findOne({ username: email });
            if (user) {
                user.googleId     = googleId;
                user.authProvider = "google";
                if (!user.avatar && picture) user.avatar = picture;
                await user.save();
            } else {
                const username = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") + "_" + Date.now().toString().slice(-4);
                user = await new User({
                    name, username, googleId, avatar: picture, authProvider: "google",
                }).save();
            }
        }

        const token = signToken({ id: user._id, username: user.username, isGuest: false });
        return res.status(httpStatus.OK).json({ token, user: safeUser(user) });
    } catch (e) {
        console.error("Google auth error:", e);
        if (e.message?.includes("Token used too late") || e.message?.includes("Invalid token"))
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid or expired Google token." });
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Google sign-in failed." });
    }
};

// ─────────────────────────────────────────────
// POST /api/v1/users/guest
// Body: { fingerprint }
// ─────────────────────────────────────────────
const guestAccess = async (req, res) => {
    const { fingerprint } = req.body;

    if (!fingerprint || fingerprint.length < 16)
        return res.status(httpStatus.BAD_REQUEST).json({ message: "A valid browser fingerprint is required." });

    try {
        let guestUser = await User.findOne({ guestFingerprint: fingerprint });

        if (!guestUser) {
            const guestUsername = "guest_" + fingerprint.slice(0, 10);
            guestUser = await new User({
                name:              "Guest",
                username:          guestUsername,
                guestFingerprint:  fingerprint,
                guestMeetingsUsed: 0,
                isGuest:           true,
                authProvider:      "local",
            }).save();
        }

        if (guestUser.guestMeetingsUsed >= 1) {
            return res.status(httpStatus.FORBIDDEN).json({
                message:          "You've used your free guest meeting. Create a free account to continue.",
                requiresAccount:  true,
                guestMeetingsUsed: guestUser.guestMeetingsUsed,
            });
        }

        const token = signToken({
            id:          guestUser._id,
            username:    guestUser.username,
            isGuest:     true,
            fingerprint,
        });

        return res.status(httpStatus.OK).json({
            token,
            user:                safeUser(guestUser),
            guestMeetingsUsed:   guestUser.guestMeetingsUsed,
            guestMeetingsAllowed: 1,
        });
    } catch (e) {
        console.error("Guest access error:", e);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Something went wrong." });
    }
};

// ─────────────────────────────────────────────
// GET /api/v1/users/get_all_activity  (protected)
// ─────────────────────────────────────────────
const getUserHistory = async (req, res) => {
    try {
        const meetings = await Meeting
            .find({ user_id: req.user.username })
            .sort({ date: -1 });
        return res.status(httpStatus.OK).json(meetings);
    } catch (e) {
        console.error("Get history error:", e);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Something went wrong." });
    }
};

// ─────────────────────────────────────────────
// POST /api/v1/users/add_to_activity  (protected)
// Body: { meeting_code }
// ─────────────────────────────────────────────
const addToHistory = async (req, res) => {
    const { meeting_code } = req.body;
    if (!meeting_code)
        return res.status(httpStatus.BAD_REQUEST).json({ message: "meeting_code is required." });

    try {
        await Meeting.findOneAndUpdate(
            { user_id: req.user.username, meetingCode: meeting_code },
            { $set: { date: new Date() } },
            { upsert: true, new: true }
        );

        return res.status(httpStatus.CREATED).json({ message: "Meeting added to history." });
    } catch (e) {
        console.error("Add history error:", e);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Something went wrong." });
    }
};

// ─────────────────────────────────────────────
// GET /api/v1/users/profile  (protected)
// ─────────────────────────────────────────────
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(httpStatus.NOT_FOUND).json({ message: "User not found." });
        return res.status(httpStatus.OK).json(safeUser(user));
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Something went wrong." });
    }
};

// ─────────────────────────────────────────────
// PATCH /api/v1/users/profile  (protected)
// Body: { name? }
// ─────────────────────────────────────────────
const updateProfile = async (req, res) => {
    const { name } = req.body;
    if (!name?.trim()) return res.status(httpStatus.BAD_REQUEST).json({ message: "name is required." });
    try {
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { name: name.trim() } },
            { new: true }
        );
        return res.status(httpStatus.OK).json({ message: "Profile updated.", user: safeUser(user) });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Something went wrong." });
    }
};

// ─────────────────────────────────────────────
// POST /api/v1/users/avatar  (protected, multipart)
// ─────────────────────────────────────────────
const uploadAvatar = async (req, res) => {
    if (!req.file) return res.status(httpStatus.BAD_REQUEST).json({ message: "No file uploaded." });
    try {
        const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { avatar: dataUrl } },
            { new: true }
        );
        return res.status(httpStatus.OK).json({ message: "Avatar updated.", avatar: user.avatar });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Something went wrong." });
    }
};

// ─────────────────────────────────────────────
// POST /api/v1/users/change-password  (protected, local accounts only)
// Body: { currentPassword, newPassword }
// ─────────────────────────────────────────────
const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
        return res.status(httpStatus.BAD_REQUEST).json({ message: "currentPassword and newPassword are required." });
    if (newPassword.length < 8)
        return res.status(httpStatus.BAD_REQUEST).json({ message: "New password must be at least 8 characters." });
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(httpStatus.NOT_FOUND).json({ message: "User not found." });
        if (user.authProvider !== "local")
            return res.status(httpStatus.BAD_REQUEST).json({ message: "Password change is only available for email/password accounts." });
        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) return res.status(httpStatus.UNAUTHORIZED).json({ message: "Current password is incorrect." });
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        return res.status(httpStatus.OK).json({ message: "Password changed successfully." });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Something went wrong." });
    }
};

export {
    register, login, googleAuth,
    guestAccess,
    getUserHistory, addToHistory,
    getProfile, updateProfile, uploadAvatar, changePassword,
};
