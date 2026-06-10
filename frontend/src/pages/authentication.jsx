import React, { useState, useEffect, useContext, useRef } from "react";
import {
    TextField, Snackbar, Alert, CircularProgress,
    InputAdornment, IconButton
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "../contexts/ThemeContext";
import { MeetonLogo } from "../components/MeetonLogo";
import PageTitle from "../components/PageTitle";
import "../App.css";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

const fieldSx = {
    "& .MuiOutlinedInput-root": {
        borderRadius: "10px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        "&.Mui-focused fieldset": { borderColor: "#C62E65", borderWidth: "2px" },
    },
    "& .MuiInputLabel-root.Mui-focused": { color: "#C62E65" },
    "& .MuiInputLabel-root": { fontFamily: "'Plus Jakarta Sans', sans-serif" },
    "& .MuiInputBase-input": { fontFamily: "'Plus Jakarta Sans', sans-serif" },
};

export default function Authentication() {
    const location = useLocation();
    const navigate = useNavigate();
    const { handleRegister, handleLogin, handleGoogleAuth } = useContext(AuthContext);

    const [tab, setTab]           = useState(location.state?.isSignUp ? 1 : 0);
    const [name, setName]         = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [error, setError]       = useState("");
    const [loading, setLoading]   = useState(false);
    const { dark: isDark } = useTheme();
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
    const [showSplash, setShowSplash] = useState(false);
    const [formKey, setFormKey] = useState(0); // triggers re-mount animation

    const googleBtnRef = useRef(null);
    const [googleReady, setGoogleReady] = useState(false);

    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) return;
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => {
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: async ({ credential }) => {
                    setLoading(true);
                    setError("");
                    const res = await handleGoogleAuth(credential);
                    setLoading(false);
                    if (res?.status === 200) {
                        setShowSplash(true);
                        setTimeout(() => navigate("/home"), 1400);
                    } else {
                        setError(res?.data?.message || "Google sign-in failed.");
                    }
                },
            });
            setGoogleReady(true);
        };
        document.body.appendChild(script);
        return () => { document.body.removeChild(script); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!googleReady || !googleBtnRef.current) return;
        window.google.accounts.id.renderButton(googleBtnRef.current, {
            type: "standard", theme: isDark ? "filled_black" : "outline", size: "large",
            text: "continue_with", shape: "rectangular", width: 320,
        });
    }, [googleReady, tab, isDark]);

    const switchTab = (t) => { setTab(t); setError(""); setPassword(""); setFormKey(k => k + 1); };

    const handleAuth = async () => {
        if (tab === 1 && !name.trim())  { setError("Please enter your full name."); return; }
        if (!username.trim())           { setError("Please enter a username."); return; }
        if (!password.trim())           { setError("Please enter your password."); return; }
        setLoading(true);
        setError("");
        try {
            if (tab === 0) {
                const res = await handleLogin(username, password);
                if (!res) { setError("Server not responding."); return; }
                if (res.status === 200) {
                    setShowSplash(true);
                    setTimeout(() => navigate("/home"), 1400);
                } else {
                    setError(res.data?.message || "Invalid username or password.");
                }
            } else {
                await handleRegister(name, username, password);
                setSnackbar({ open: true, message: "Account created! Please sign in.", severity: "success" });
                switchTab(0);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => { if (e.key === "Enter") handleAuth(); };

    return (
        <>
        {showSplash && (
            <div className="auth-splash">
                <div className="auth-splash-logo">
                    <MeetonLogo size={72} />
                </div>
                <div className="auth-splash-text">Welcome to MeetOn</div>
                <div className="auth-splash-sub">Setting things up…</div>
            </div>
        )}
        <div className="authPageContainer" style={{ opacity: showSplash ? 0 : 1, transition: "opacity 0.3s ease" }}>
            <PageTitle title={tab === 0 ? "Sign In" : "Create Account"} />

            {/* Floating theme toggle */}
            <div style={{ position: "fixed", top: 16, right: 16, zIndex: 200 }}>
                <ThemeToggle />
            </div>

            {/* LEFT PANEL */}
            <div className="auth-left">
                <div className="auth-left-content">
                    <div className="auth-left-logo">
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <MeetonLogo size={40} />
                            <span style={{
                                fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
                                fontSize: "1.6rem", fontWeight: 700, color: "white", letterSpacing: "-0.5px"
                            }}>MeetOn</span>
                        </div>
                    </div>
                    <h2 className="auth-left-tagline">
                        Your meeting,<br />
                        <span className="accent">whenever.</span>
                    </h2>
                    <p className="auth-left-sub">
                        No downloads. No setup. Works in any browser.
                    </p>
                </div>
                <div className="auth-left-features">
                    {[
                        {
                            svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="15" height="10" rx="2"/><polyline points="17 11 22 7 22 17 17 13"/></svg>,
                            text: "HD video & crystal-clear audio"
                        },
                        {
                            svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>,
                            text: "End-to-end encrypted calls"
                        },
                        {
                            svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
                            text: "Real-time in-meeting chat"
                        },
                        {
                            svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
                            text: "One-click screen sharing"
                        },
                    ].map((f, i) => (
                        <div className="auth-left-feature" key={i}>
                            <div className="auth-left-feature-icon">
                                {f.svg}
                            </div>
                            <span className="auth-left-feature-text">{f.text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT PANEL */}
            <div className="auth-right">
                <div className="auth-form-box">
                    <div className="auth-form-header">
                        <h1 className="auth-form-title">
                            {tab === 0 ? "Sign in" : "Create account"}
                        </h1>
                        <p className="auth-form-subtitle">
                            {tab === 0
                                ? "Welcome back"
                                : "Create your account — takes 10 seconds"}
                        </p>
                    </div>

                    {/* TABS */}
                    <div className="auth-tab-row" role="tablist">
                        <button role="tab" aria-selected={tab === 0}
                            className={`auth-tab ${tab === 0 ? "active" : ""}`}
                            onClick={() => switchTab(0)}>Sign In</button>
                        <button role="tab" aria-selected={tab === 1}
                            className={`auth-tab ${tab === 1 ? "active" : ""}`}
                            onClick={() => switchTab(1)}>Sign Up</button>
                    </div>

                    {/* FIELDS — re-keyed on tab switch for slide-in animation */}
                    <div key={formKey} className="auth-form-content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {tab === 1 && (
                            <TextField fullWidth label="Full Name" value={name}
                                onChange={e => setName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoFocus autoComplete="name" sx={fieldSx} />
                        )}
                        <TextField fullWidth label="Username" value={username}
                            onChange={e => setUsername(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus={tab === 0} sx={fieldSx} />
                        <TextField fullWidth label="Password"
                            type={showPass ? "text" : "password"}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={handleKeyDown}
                            sx={fieldSx}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowPass(v => !v)}
                                            edge="end" size="small"
                                            aria-label={showPass ? "Hide password" : "Show password"}>
                                            {showPass
                                                ? <VisibilityOff fontSize="small" />
                                                : <Visibility fontSize="small" />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }} />
                    </div>

                    {/* ERROR */}
                    {error && (
                        <div role="alert" style={{
                            marginTop: 12, padding: "10px 14px",
                            background: "#fff0f0", border: "1px solid #fcc",
                            borderRadius: 8, fontSize: "0.87rem", color: "#c0392b", fontWeight: 500
                        }}>
                            {error}
                        </div>
                    )}

                    {/* SUBMIT */}
                    <button className="btn-primary" onClick={handleAuth} disabled={loading}
                        style={{ width: "100%", marginTop: 24, justifyContent: "center", padding: "14px", fontSize: "0.97rem", borderRadius: "10px" }}>
                        {loading
                            ? <CircularProgress size={18} sx={{ color: "white" }} />
                            : tab === 0 ? "Sign In" : "Create Account"}
                    </button>

                    {/* GOOGLE */}
                    {GOOGLE_CLIENT_ID && (
                        <div style={{ marginTop: 16 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0" }}>
                                <div style={{ flex: 1, height: 1, background: "#e0e0e0" }} />
                                <span style={{ fontSize: "0.78rem", color: "#9aab9d" }}>or</span>
                                <div style={{ flex: 1, height: 1, background: "#e0e0e0" }} />
                            </div>
                            <div ref={googleBtnRef} style={{ display: "flex", justifyContent: "center" }} />
                        </div>
                    )}

                    {/* SWITCH TAB */}
                    <p style={{ marginTop: 20, textAlign: "center", fontSize: "0.85rem", color: "#9aab9d" }}>
                        {tab === 0
                            ? <>Don't have an account?{" "}
                                <button onClick={() => switchTab(1)}
                                    style={{ background: "none", border: "none", color: "#C62E65", fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "0.85rem" }}>
                                    Sign up free
                                </button></>
                            : <>Already have an account?{" "}
                                <button onClick={() => switchTab(0)}
                                    style={{ background: "none", border: "none", color: "#C62E65", fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "0.85rem" }}>
                                    Sign in
                                </button></>
                        }
                    </p>
                </div>
            </div>

            <Snackbar open={snackbar.open} autoHideDuration={4000}
                onClose={() => setSnackbar(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
                <Alert severity={snackbar.severity}
                    sx={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
        </>
    );
}