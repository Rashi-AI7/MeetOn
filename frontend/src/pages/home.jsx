import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TextField, IconButton, Tooltip, Snackbar, Alert, CircularProgress } from "@mui/material";
import RestoreIcon from "@mui/icons-material/Restore";
import LogoutIcon from "@mui/icons-material/Logout";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import { MeetonBrand } from "../components/MeetonLogo";
import ThemeToggle from "../components/ThemeToggle";
import PageTitle from "../components/PageTitle";
import server from "../environment";
import "../App.css";

async function createRoomOnServer() {
    const token = localStorage.getItem("token");
    const res = await fetch(`${server}/api/v1/rooms/create`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: "New Meeting" }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Could not create room.");
    }
    return res.json(); // { meetingCode, title, joinUrl }
}

function ShareModal({ code, onClose, onJoin }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(code).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="share-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="share-modal">
                <h2>Meeting created</h2>
                <p>Share this code with people you want to invite.</p>
                <div className="share-code-box">
                    <span className="share-code-value">{code}</span>
                    <button className="share-code-copy" onClick={handleCopy}>
                        {copied ? "✓ Copied" : "Copy"}
                    </button>
                </div>
                <div className="share-modal-actions">
                    <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={onJoin}>
                        Join Now
                    </button>
                    <button className="btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>
                        Later
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function HomeComponent() {
    const navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");
    const [shareCode, setShareCode] = useState(null);
    const [creating, setCreating] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

    const userName  = localStorage.getItem("name") || localStorage.getItem("username") || "there";
    const avatar    = localStorage.getItem("avatar") || null;
    const firstName = userName.split(" ")[0];

    const handleJoinVideoCall = () => {
        const code = meetingCode.trim().toLowerCase();
        if (!code) {
            setSnackbar({ open: true, message: "Please enter a meeting code.", severity: "warning" });
            return;
        }
        // Validate format (8-char hex) before navigating to avoid wasted network roundtrip
        if (!/^[a-f0-9]{8}$/.test(code)) {
            setSnackbar({ open: true, message: "Invalid meeting code format (should be 8 hex characters).", severity: "warning" });
            return;
        }
        // History is recorded by VideoMeet on successful join — not here
        navigate(`/meet/${code}`);
    };

    const handleNewMeeting = async () => {
        setCreating(true);
        try {
            const room = await createRoomOnServer();
            setShareCode(room.meetingCode);
        } catch (e) {
            setSnackbar({ open: true, message: e.message || "Could not create meeting.", severity: "error" });
        } finally {
            setCreating(false);
        }
    };

    const handleJoinNew = () => navigate(`/meet/${shareCode}`);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("name");
        localStorage.removeItem("avatar");
        navigate("/", { state: { fromLogout: true } });
    };

    const handleKeyDown = (e) => { if (e.key === "Enter") handleJoinVideoCall(); };

    return (
        <div className="homeContainer">
            <PageTitle title="Home" />

            {shareCode && (
                <ShareModal
                    code={shareCode}
                    onClose={() => setShareCode(null)}
                    onJoin={handleJoinNew}
                />
            )}

            {/* NAVBAR */}
            <nav className="meeton-nav">
                <MeetonBrand size={34} />
                <div className="nav-actions">
                    <ThemeToggle />
                    <Tooltip title="Meeting History">
                        <IconButton onClick={() => navigate("/history")}
                            sx={{ color: "#5a6b5e" }} aria-label="Meeting history">
                            <RestoreIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Your Profile">
                        <div className="navAvatar" onClick={() => navigate("/profile")}
                            role="button" aria-label="Go to profile">
                            {avatar
                                ? <img src={avatar} alt="avatar" />
                                : <span>{firstName.slice(0,2).toUpperCase()}</span>
                            }
                        </div>
                    </Tooltip>
                    <Tooltip title="Sign Out">
                        <IconButton onClick={handleLogout}
                            sx={{ color: "#e05252" }} aria-label="Sign out">
                            <LogoutIcon />
                        </IconButton>
                    </Tooltip>
                </div>
            </nav>

            {/* BODY */}
            <div className="home-body">
                <div className="home-left">
                    <div className="home-greeting">
                        <i className="ti ti-wave-sine" aria-hidden="true"></i> Welcome back, <strong>{firstName}</strong>
                    </div>

                    <h1 className="home-title">
                        Premium video meetings.<br />
                        <span className="accent">Now free for everyone.</span>
                    </h1>

                    <p className="home-subtitle">
                        Start a new meeting in seconds or join an existing one with a code.
                        No downloads, no hassle.
                    </p>

                    {/* ACTIONS — two separate cards */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                        {/* CREATE */}
                        <div className="home-actions-card" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                            <div className="home-actions-label" style={{ marginBottom: 12 }}>New meeting</div>
                            <button className="btn-primary" onClick={handleNewMeeting} disabled={creating}
                                style={{ justifyContent: "center", padding: "13px", borderRadius: "10px", fontSize: "0.95rem", gap: 8 }}>
                                {creating
                                    ? <CircularProgress size={16} sx={{ color: "white" }} />
                                    : <VideoCallIcon style={{ fontSize: "1.1rem" }} />}
                                {creating ? "Creating…" : "New Meeting"}
                            </button>
                            <p style={{ margin: "10px 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                You'll get a code to share. You're the host.
                            </p>
                        </div>

                        {/* JOIN */}
                        <div className="home-actions-card" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                            <div className="home-actions-label" style={{ marginBottom: 12 }}>Join a meeting</div>
                            <div className="home-join-row">
                                <TextField
                                    value={meetingCode}
                                    onChange={e => setMeetingCode(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Enter 8-character code"
                                    variant="outlined"
                                    size="small"
                                    inputProps={{ "aria-label": "Meeting code", autoComplete: "off", maxLength: 8 }}
                                    sx={{
                                        flex: 1,
                                        "& .MuiOutlinedInput-root": {
                                            borderRadius: "10px",
                                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                                            "&.Mui-focused fieldset": { borderColor: "#C62E65", borderWidth: "2px" },
                                        },
                                    }}
                                />
                                <button className="btn-primary" onClick={handleJoinVideoCall}
                                    style={{ padding: "10px 22px", borderRadius: "10px", fontSize: "0.9rem" }}>
                                    Join
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* STATS */}
                    <div className="home-stats-row">
                        <div className="home-stat">
                            <div className="home-stat-icon"><i className="ti ti-video" aria-hidden="true"></i></div>
                            <div className="home-stat-value">HD</div>
                            <div className="home-stat-label">Video Quality</div>
                        </div>
                        <div className="home-stat">
                            <div className="home-stat-icon"><i className="ti ti-lock" aria-hidden="true"></i></div>
                            <div className="home-stat-value">E2E</div>
                            <div className="home-stat-label">Encrypted</div>
                        </div>
                        <div className="home-stat">
                            <div className="home-stat-icon"><i className="ti ti-sparkles" aria-hidden="true"></i></div>
                            <div className="home-stat-value">Free</div>
                            <div className="home-stat-label">Always & Forever</div>
                        </div>
                    </div>
                </div>

                {/* RIGHT — decorative mock */}
                <div className="home-right">
                    <div className="hero-image-placeholder" style={{ maxWidth: 420 }}>
                        <div className="hero-image-mock">
                            <div className="mock-header">
                                <div className="mock-dot red"></div>
                                <div className="mock-dot yellow"></div>
                                <div className="mock-dot green"></div>
                                <span>Active Meeting</span>
                            </div>
                            <div className="mock-grid">
                                {["You", "Ali", "Tom", "Sara", "Raj", "Mia"].map((n, i) => (
                                    <div className="mock-tile" key={i}>
                                        <div className="mock-avatar">{n.slice(0, 2).toUpperCase()}</div>
                                        <div className="mock-name">{n}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="mock-bar">
                                <div className="mock-bar-btn red"><i className="ti ti-phone-off" aria-hidden="true"></i></div>
                                <div className="mock-bar-btn"><i className="ti ti-microphone" aria-hidden="true"></i></div>
                                <div className="mock-bar-btn"><i className="ti ti-video" aria-hidden="true"></i></div>
                                <div className="mock-bar-btn"><i className="ti ti-message" aria-hidden="true"></i></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Snackbar open={snackbar.open} autoHideDuration={3500}
                onClose={() => setSnackbar(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
                <Alert severity={snackbar.severity}
                    sx={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
}