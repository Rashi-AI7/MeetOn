import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Tooltip, Skeleton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ReplayIcon from '@mui/icons-material/Replay';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ThemeToggle from "../components/ThemeToggle";
import { MeetonBrand } from '../components/MeetonLogo';
import PageTitle from '../components/PageTitle';
import server from '../environment';
import "../App.css";

function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date)) return '—';
    return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function History() {
    const { getHistoryOfUser } = useContext(AuthContext);
    // FIX: removed addToUserHistory from destructure — handleRejoin was calling it
    // before navigating, which created a duplicate DB entry for the same meeting.
    // The server-side upsert now handles deduplication, but the frontend call is
    // still redundant here: VideoMeet already calls addToUserHistory on connect.
    // Removing the call from handleRejoin keeps history clean and saves a round-trip.

    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(null);
    const [roomStatus, setRoomStatus] = useState({}); // { code: "active"|"ended" }
    const navigate = useNavigate();

    useEffect(() => {
        (async () => {
            try {
                const history = await getHistoryOfUser();
                const list = Array.isArray(history) ? history : [];
                setMeetings(list);
                // Check which rooms are still active
                const statusMap = {};
                await Promise.all(list.slice(0, 20).map(async (m) => {
                    try {
                        const r = await fetch(`${server}/api/v1/rooms/${m.meetingCode}/validate`);
                        statusMap[m.meetingCode] = r.ok ? "active" : "ended";
                    } catch { statusMap[m.meetingCode] = "unknown"; }
                }));
                setRoomStatus(statusMap);
            } catch (e) {
                setError("Couldn't load your meeting history. Please try again.");
                setMeetings([]);
            } finally {
                setLoading(false);
            }
        })();
    }, [getHistoryOfUser]);

    // FIX: no longer calls addToUserHistory here — VideoMeet records history on join.
    const handleRejoin = (code) => {
        navigate(`/meet/${code}`);
    };

    const handleCopy = (code) => {
        navigator.clipboard.writeText(code);
        setCopied(code);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="historyContainer">
            <PageTitle title="Meeting History" />

            {/* NAVBAR */}
            <nav className="meeton-nav">
                <MeetonBrand size={34} />
                <div className="nav-actions">
                    <button className="btn-outline" style={{ padding: '8px 18px', fontSize: '0.88rem' }}
                        onClick={() => navigate("/home")}>
                        <ArrowBackIcon style={{ fontSize: '1rem' }} />
                        Back to Home
                    </button>
                    <ThemeToggle />
                </div>
            </nav>

            {/* BODY */}
            <div className="history-body">
                <div className="history-header">
                    <h1>Meeting History</h1>
                    <p>Your recent calls.</p>
                </div>

                {error && (
                    <div role="alert" style={{
                        background: '#fff0f0', border: '1px solid #fcc', borderRadius: 10,
                        padding: '14px 18px', color: '#c0392b', fontSize: '0.9rem',
                        marginBottom: 24, fontWeight: 500
                    }}>{error}</div>
                )}

                <div className="history-grid">
                    {loading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} variant="rounded" height={130}
                                sx={{ borderRadius: '14px', bgcolor: '#f0f5f1' }} />
                        ))
                    ) : meetings.length > 0 ? (
                        meetings.map((m, i) => (
                            <div className="history-card" key={m._id || i}>
                                <div className="history-card-code">{m.meetingCode}</div>
                                <div className="history-card-date">
                                    <CalendarTodayIcon sx={{ fontSize: '0.8rem', color: '#9aab9d' }} />
                                    {formatDate(m.date)}
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    {roomStatus[m.meetingCode] === "active" ? (
                                        <button className="history-rejoin-btn"
                                            onClick={() => handleRejoin(m.meetingCode)}
                                            aria-label={`Join meeting ${m.meetingCode}`}>
                                            <ReplayIcon style={{ fontSize: '0.9rem' }} />
                                            Join
                                        </button>
                                    ) : (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)',
                                            padding: '4px 10px', borderRadius: 20,
                                            border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <i className="ti ti-lock" style={{ fontSize: '0.75rem' }} />
                                            {roomStatus[m.meetingCode] === "unknown" ? "Unavailable" : "Ended"}
                                        </span>
                                    )}
                                    <Tooltip title={copied === m.meetingCode ? "Copied!" : "Copy code"}>
                                        <button className="history-rejoin-btn"
                                            onClick={() => handleCopy(m.meetingCode)}
                                            aria-label={`Copy meeting code ${m.meetingCode}`}
                                            style={{ background: copied === m.meetingCode ? 'var(--primary-light)' : undefined }}>
                                            <ContentCopyIcon style={{ fontSize: '0.9rem' }} />
                                            {copied === m.meetingCode ? 'Copied' : 'Copy'}
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="history-empty">
                            <div className="history-empty-icon"><i className="ti ti-video" aria-hidden="true"></i></div>
                            <h3>No meetings yet</h3>
                            <p>Your meeting history will appear here once you start or join a call.</p>
                            <button className="btn-primary" style={{ marginTop: 20 }}
                                onClick={() => navigate("/home")}>
                                Start Your First Meeting
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}