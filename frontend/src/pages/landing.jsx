import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MeetonLogo, MeetonBrand } from '../components/MeetonLogo';
import ThemeToggle from '../components/ThemeToggle';
import PageTitle from '../components/PageTitle';
import "../App.css";

/* ─── Inline SVG icons — no emoji, no external deps ─────────────────────── */
const Icon = {
    Video: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
            <rect x="2" y="7" width="15" height="10" rx="2"/><polyline points="17 11 22 7 22 17 17 13"/>
        </svg>
    ),
    Lock: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
            <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
        </svg>
    ),
    Chat: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
    ),
    Monitor: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
            <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
    ),
    History: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/><polyline points="12 7 12 12 15 15"/>
        </svg>
    ),
    Globe: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
    ),
    Phone: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.58 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.73a16 16 0 0 0 6.29 6.29l1.62-1.62a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
    ),
    Mic: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
    ),
    Shield: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
    ),
    Bolt: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
    ),
};

const features = [
    { Icon: Icon.Video,   title: 'HD Video',          desc: '1080p with adaptive quality — looks good even on a bad connection.' },
    { Icon: Icon.Lock,    title: 'Encrypted',         desc: 'End-to-end on every call. No logs, no recordings, nothing stored.' },
    { Icon: Icon.Chat,    title: 'Live Chat',          desc: 'Drop a link, share a note, send a reaction — without unmuting.' },
    { Icon: Icon.Monitor, title: 'Screen Share',       desc: 'One click to share your whole screen or just one window.' },
    { Icon: Icon.History, title: 'History',            desc: 'Every meeting you have been in, one tap to rejoin.' },
    { Icon: Icon.Globe,   title: 'No Install',         desc: 'Works in Chrome, Firefox, Safari. No download, no account required to join.' },
];

export default function LandingPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [showLogoutSplash, setShowLogoutSplash] = React.useState(
        location.state?.fromLogout === true
    );

    React.useEffect(() => {
        if (showLogoutSplash) {
            const t = setTimeout(() => setShowLogoutSplash(false), 1600);
            return () => clearTimeout(t);
        }
    }, [showLogoutSplash]);

    return (
        <>
        {showLogoutSplash && (
            <div className="logout-splash">
                <MeetonLogo size={72} />
                <div style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
                    You've been signed out
                </div>
                <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>See you next time 👋</div>
            </div>
        )}
        <div className="landingPageContainer" style={{ opacity: showLogoutSplash ? 0 : 1, transition: "opacity 0.4s ease" }}>
            <PageTitle title={null} />

            {/* ── NAVBAR ── */}
            <nav className="meeton-nav">
                <MeetonBrand size={36} />
                <div className="nav-actions">
                    <ThemeToggle />
                    <button className="nav-link" onClick={() => navigate("/auth")}>Sign In</button>
                    <button className="btn-primary" onClick={() => navigate("/auth", { state: { isSignUp: true } })}>
                        Get Started Free
                    </button>
                </div>
            </nav>

            {/* ── HERO ── */}
            <section className="landing-hero">
                <div className="hero-content">
                    <div className="hero-eyebrow">
                        <span className="hero-eyebrow-dot"></span>
                        Free · No credit card · No install
                    </div>

                    <h1 className="hero-title">
                        Video calls,<br/>
                        <span className="accent">without the fuss.</span>
                    </h1>

                    <p className="hero-subtitle">
                        Open a link, start talking. No account needed to join,
                        no app to install. Just works.
                    </p>

                    <div className="hero-cta-row">
                        <button className="btn-primary" style={{ fontSize: '1rem', padding: '15px 34px' }}
                            onClick={() => navigate("/auth", { state: { isSignUp: true } })}>
                            Start for Free
                        </button>
                        <button className="btn-outline" style={{ fontSize: '1rem' }}
                            onClick={() => navigate("/auth")}>
                            Sign In
                        </button>
                    </div>

                    {/* Portfolio-honest social proof — no fake numbers */}
                    <div className="hero-trust">
                        <div className="hero-trust-avatars">
                            <span>RS</span><span>GS</span><span>AK</span>
                        </div>
                        <span className="hero-trust-text">
                            Built with <strong>WebRTC + Socket.IO</strong> — source on GitHub
                        </span>
                    </div>
                </div>

                <div className="hero-visual">
                    <div className="hero-image-wrapper">
                        <div className="hero-image-placeholder" aria-hidden="true">
                            <div className="hero-image-mock">
                                <div className="mock-header">
                                    <div className="mock-dot red"></div>
                                    <div className="mock-dot yellow"></div>
                                    <div className="mock-dot green"></div>
                                    <span>MeetOn — Live</span>
                                </div>
                                <div className="mock-grid">
                                    {['AK','TM','RJ','SP','YO','ZK'].map((init,i) => (
                                        <div className="mock-tile" key={i}>
                                            <div className="mock-avatar">{init}</div>
                                            <div className="mock-name">{init}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mock-bar">
                                    <div className="mock-bar-btn red"><Icon.Phone /></div>
                                    <div className="mock-bar-btn"><Icon.Mic /></div>
                                    <div className="mock-bar-btn"><Icon.Video /></div>
                                    <div className="mock-bar-btn"><Icon.Chat /></div>
                                </div>
                            </div>
                        </div>
                        <div className="hero-badge hero-badge-top">
                            <div className="hero-badge-icon"><Icon.Shield /></div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>End-to-end</div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Encrypted</div>
                            </div>
                        </div>
                        <div className="hero-badge hero-badge-bottom">
                            <div className="hero-badge-icon"><Icon.Bolt /></div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ultra</div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Low Latency</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FEATURES ── */}
            <section className="features-strip">
                <h2 className="features-strip-title">What you get</h2>
                <div className="features-grid">
                    {features.map(({ Icon: FeatureIcon, title, desc }, i) => (
                        <div className="feature-card" key={i}>
                            <div className="feature-icon"><FeatureIcon /></div>
                            <h3>{title}</h3>
                            <p>{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer className="landing-footer">
                <MeetonBrand size={26} />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>© {new Date().getFullYear()} MeetOn — made with React + WebRTC</p>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <button className="nav-link" style={{ fontSize: '0.82rem' }} onClick={() => navigate("/auth")}>Login</button>
                    <button className="btn-primary" style={{ fontSize: '0.82rem', padding: '8px 18px' }}
                        onClick={() => navigate("/auth", { state: { isSignUp: true } })}>Sign Up Free</button>
                </div>
            </footer>
        </div>
        </>
    );
}