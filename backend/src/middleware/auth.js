import jwt from "jsonwebtoken";

/**
 * verifyToken — mandatory auth for protected routes.
 * Reads Authorization: Bearer <token>, verifies JWT, sets req.user.
 */
const verifyToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expired. Please log in again." });
        }
        return res.status(401).json({ message: "Invalid token." });
    }
};

/**
 * optionalAuth — sets req.user if a valid token is present, but does NOT
 * block the request if there is no token. Used for guest-accessible routes
 * that behave differently for logged-in users.
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader?.startsWith("Bearer ")) return next();
    const token = authHeader.split(" ")[1];
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        // invalid token treated same as no token
    }
    next();
};

/**
 * requireFullAccount — blocks guests from accessing certain routes.
 * Must run after verifyToken or optionalAuth.
 */
const requireFullAccount = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "Please log in to continue." });
    }
    if (req.user.isGuest) {
        return res.status(403).json({
            message: "This feature requires a full account.",
            requiresAccount: true
        });
    }
    next();
};

export { verifyToken, optionalAuth, requireFullAccount };
