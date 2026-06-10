import React from 'react';

/**
 * Shared MeetOn logo — single source of truth.
 * Pass `size` (default 36) to control the icon size in px.
 * Text size is derived from icon size in px (not rem).
 * Pass `withText={false}` to hide the brand name.
 */
export function MeetonLogo({ size = 36 }) {
    const id = React.useId();
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
            xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
                <linearGradient id={`logo-bg-${id}`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#C62E65"/>
                    <stop offset="100%" stopColor="#8B1050"/>
                </linearGradient>
            </defs>
            <rect width="64" height="64" rx="16" fill={`url(#logo-bg-${id})`}/>
            <rect x="8" y="16" width="34" height="26" rx="5" fill="white"/>
            <polygon points="42,22 56,14 56,42 42,34" fill="white" opacity="0.92"/>
            <circle cx="25" cy="28" r="5" fill="#D63AF9"/>
        </svg>
    );
}

export function MeetonBrand({ size = 36, textSize, style = {} }) {
    // size is in px — derive text size in px, not rem
    const fontSize = textSize || `${Math.round(size * 0.55)}px`;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...style }}>
            <MeetonLogo size={size} />
            <span style={{
                fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
                fontSize,
                fontWeight: 800,
                color: '#C62E65',
                letterSpacing: '-0.5px',
                lineHeight: 1
            }}>MeetOn</span>
        </div>
    );
}

export default MeetonLogo;