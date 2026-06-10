import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { TextField, CircularProgress, Snackbar, Alert } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { MeetonBrand } from "../components/MeetonLogo";
import ThemeToggle from "../components/ThemeToggle";
import PageTitle from "../components/PageTitle";
import server from "../environment";
import "../App.css";

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("token") || ""}` });

const fieldSx = {
    "& .MuiOutlinedInput-root": {
        borderRadius: "10px", fontFamily: "'Plus Jakarta Sans', sans-serif",
        "&.Mui-focused fieldset": { borderColor: "#C62E65", borderWidth: "2px" },
    },
    "& .MuiInputLabel-root.Mui-focused": { color: "#C62E65" },
    "& .MuiInputLabel-root": { fontFamily: "'Plus Jakarta Sans', sans-serif" },
    "& .MuiInputBase-input": { fontFamily: "'Plus Jakarta Sans', sans-serif" },
};

export default function ProfilePage() {
    const navigate = useNavigate();
    const fileRef = useRef(null);

    const [profile, setProfile]         = useState(null);
    const [loading, setLoading]         = useState(true);
    const [saving, setSaving]           = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);

    const [name, setName]               = useState("");
    const [currentPass, setCurrentPass] = useState("");
    const [newPass, setNewPass]         = useState("");
    const [confirmPass, setConfirmPass] = useState("");

    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
    const toast = (message, severity = "success") => setSnackbar({ open: true, message, severity });

    useEffect(() => {
        fetch(`${server}/api/v1/users/profile`, { headers: authHeader() })
            .then(r => r.json())
            .then(data => {
                setProfile(data);
                setName(data.name || "");
                setLoading(false);
            })
            .catch(() => { toast("Could not load profile.", "error"); setLoading(false); });
    }, []);

    const handleSaveName = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            const res = await fetch(`${server}/api/v1/users/profile`, {
                method: "PATCH",
                headers: { ...authHeader(), "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim() }),
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem("name", name.trim());
                setProfile(p => ({ ...p, name: name.trim() }));
                toast("Name updated!");
            } else {
                toast(data.message || "Could not update name.", "error");
            }
        } finally { setSaving(false); }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast("Image must be under 2MB.", "error"); return; }
        setAvatarUploading(true);
        const formData = new FormData();
        formData.append("avatar", file);
        try {
            const res = await fetch(`${server}/api/v1/users/avatar`, {
                method: "POST",
                headers: authHeader(),
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                setProfile(p => ({ ...p, avatar: data.avatar }));
                toast("Avatar updated!");
            } else {
                toast(data.message || "Upload failed.", "error");
            }
        } finally { setAvatarUploading(false); }
    };

    const handleChangePassword = async () => {
        if (!currentPass || !newPass || !confirmPass) { toast("Fill all password fields.", "warning"); return; }
        if (newPass !== confirmPass) { toast("New passwords don't match.", "error"); return; }
        if (newPass.length < 8) { toast("New password must be at least 8 characters.", "error"); return; }
        setSaving(true);
        try {
            const res = await fetch(`${server}/api/v1/users/change-password`, {
                method: "POST",
                headers: { ...authHeader(), "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
            });
            const data = await res.json();
            if (res.ok) {
                setCurrentPass(""); setNewPass(""); setConfirmPass("");
                toast("Password changed!");
            } else {
                toast(data.message || "Could not change password.", "error");
            }
        } finally { setSaving(false); }
    };

    const initials = (n) => (n || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
            <CircularProgress sx={{ color: "#C62E65" }} />
        </div>
    );

    return (
        <div className="profilePage">
            <PageTitle title="Profile" />

            <nav className="meeton-nav">
                <MeetonBrand size={34} />
                <ThemeToggle />
                <button className="nav-link" onClick={() => navigate("/home")}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <ArrowBackIcon style={{ fontSize: 18 }} /> Back to Home
                </button>
            </nav>

            <div className="profileBody">
                {/* AVATAR SECTION */}
                <div className="profileCard">
                    <h2 className="profileSectionTitle">Profile Photo</h2>
                    <div className="profileAvatarRow">
                        <div className="profileAvatarWrap" onClick={() => fileRef.current?.click()}
                            title="Click to change photo">
                            {profile?.avatar
                                ? <img src={profile.avatar} alt="avatar"
                                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                                : <span style={{ fontSize: "2rem", fontWeight: 700, color: "white" }}>
                                    {initials(profile?.name)}
                                </span>
                            }
                            <div className="profileAvatarOverlay">
                                {avatarUploading
                                    ? <CircularProgress size={18} sx={{ color: "white" }} />
                                    : <i className="ti ti-camera" aria-hidden="true" style={{ fontSize: 20, color: "white" }} />}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>{profile?.name}</div>
                            <div style={{ fontSize: "0.85rem", color: "#9aab9d", marginTop: 2 }}>@{profile?.username}</div>
                            <div style={{ fontSize: "0.78rem", color: "#b0bdb3", marginTop: 4 }}>
                                {profile?.authProvider === "google" ? "Google account" : "Local account"}
                            </div>
                            <button className="btn-outline" style={{ marginTop: 12, fontSize: "0.82rem", padding: "7px 16px" }}
                                onClick={() => fileRef.current?.click()}>
                                Change Photo
                            </button>
                        </div>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*"
                        style={{ display: "none" }} onChange={handleAvatarChange} />
                </div>

                {/* NAME SECTION */}
                <div className="profileCard">
                    <h2 className="profileSectionTitle">Display Name</h2>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <TextField fullWidth label="Full Name" value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSaveName()}
                            sx={fieldSx} />
                        <button className="btn-primary" onClick={handleSaveName} disabled={saving || !name.trim()}
                            style={{ padding: "14px 20px", borderRadius: "10px", whiteSpace: "nowrap" }}>
                            {saving ? <CircularProgress size={16} sx={{ color: "white" }} /> : "Save"}
                        </button>
                    </div>
                </div>

                {/* PASSWORD SECTION — local accounts only */}
                {profile?.authProvider === "local" && (
                    <div className="profileCard">
                        <h2 className="profileSectionTitle">Change Password</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            <TextField fullWidth label="Current Password" type="password"
                                value={currentPass} onChange={e => setCurrentPass(e.target.value)} sx={fieldSx} />
                            <TextField fullWidth label="New Password" type="password"
                                value={newPass} onChange={e => setNewPass(e.target.value)} sx={fieldSx} />
                            <TextField fullWidth label="Confirm New Password" type="password"
                                value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleChangePassword()}
                                sx={fieldSx} />
                            <button className="btn-primary" onClick={handleChangePassword} disabled={saving}
                                style={{ padding: "13px", borderRadius: "10px", justifyContent: "center" }}>
                                {saving ? <CircularProgress size={16} sx={{ color: "white" }} /> : "Change Password"}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <Snackbar open={snackbar.open} autoHideDuration={3500}
                onClose={() => setSnackbar(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
                <Alert severity={snackbar.severity} sx={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
}