import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MeetonBrand } from '../components/MeetonLogo';
import PageTitle from '../components/PageTitle';
import '../App.css';

export default function NotFound() {
    const navigate = useNavigate();
    const isLoggedIn = !!localStorage.getItem("token");

    return (
        <div style={{
            width: '100vw', height: '100vh',
            background: 'var(--bg)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24,
            fontFamily: "var(--font-body)", textAlign: 'center'
        }}>
            <PageTitle title="Page Not Found" />
            <MeetonBrand size={40} />
            <div style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(5rem, 15vw, 9rem)',
                fontWeight: 800, color: 'var(--primary)', lineHeight: 1, letterSpacing: '-4px'
            }}>404</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                Page not found
            </h1>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 360, margin: 0, lineHeight: 1.7 }}>
                The page you're looking for doesn't exist or may have been moved.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="btn-primary" onClick={() => navigate(isLoggedIn ? '/home' : '/')}>
                    {isLoggedIn ? 'Back to Home' : 'Back to Landing'}
                </button>
                {isLoggedIn && (
                    <button className="btn-outline" onClick={() => navigate('/history')}>
                        View History
                    </button>
                )}
            </div>
        </div>
    );
}
