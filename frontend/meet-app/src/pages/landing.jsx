import React from 'react';
import { useNavigate } from 'react-router-dom';
import "../App.css";

export default function LandingPage() {
    
    const router = useNavigate();

    return (
        <div className='landingPageContainer'>
            <nav>
                <div className='navHeader'>
                    <h2>MeetOn</h2>
                </div>
                <div className='navlist'>
                    <div onClick={() => router("/guest")}>Join as Guest</div>
                    <div onClick={() => router("/auth")}>Register</div>
                    <div role='button' onClick={() => router("/auth")}>Login</div>
                </div>
            </nav>

            <div className="landingmain">
                <div className='hero-text'>
                    <h1>Connect simply. <br/> <span style={{color: '#16B844'}}>Meet anywhere.</span></h1>
                    <p>Secure, fast, and completely free video conferencing designed for everyone.</p>
                    <button role='button' onClick={() => router("/auth")}>Get Started</button>
                </div>
                <div style={{position: 'relative'}}>
                    {/* Placeholder for a nice hero image */}
                    <img src="/vid.png" alt="Mobile Meeting" style={{width: '400px', borderRadius: '20px'}} />
                </div>
            </div>
        </div>
    )
}