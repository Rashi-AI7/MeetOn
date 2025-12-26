import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, TextField, IconButton } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import { AuthContext } from '../contexts/AuthContext';
import "../App.css"; 

export default function HomeComponent() {

    const { addToUserHistory } = useContext(AuthContext);
    const router = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");

    let handleJoinVideoCall = async () => {
        if(meetingCode.trim() === "") return; 
        await addToUserHistory(meetingCode);
        router(`/${meetingCode}`);
    }

    const handleLogout = () => {
        localStorage.removeItem("token");
        router("/auth");
    }

    return (
        <div className='homeContainer'>
            
            {/* White Navbar with Green Logo */}
            <div style={{
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                padding: "20px 50px", 
                background: "white", 
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
            }}>
                <div style={{display: "flex", alignItems: "center"}}>
                    <h2 style={{color: "#16B844", margin: 0, fontWeight: "800"}}>MeetOn</h2>
                </div>

                <div style={{display: "flex", alignItems: "center", gap: "15px"}}>
                    <IconButton onClick={() => router("/history")}>
                        <RestoreIcon style={{color: "#555"}} />
                    </IconButton>
                    <Button onClick={handleLogout} style={{backgroundColor: "#ff4d4d", color: "white"}}>
                        Logout
                    </Button>
                </div>
            </div>

            <div className='meetContainer'>
                <div className='leftPanel'>
                    <h1 style={{fontSize: "3rem", color: "#333", marginBottom: "10px", lineHeight: "1.1"}}>
                        Premium video meetings. <br/>
                        <span style={{color: "#16B844"}}>Now free for everyone.</span>
                    </h1>
                    <p style={{fontSize: "1.2rem", color: "#666", marginBottom: "40px"}}>
                        We re-engineered the service we built for secure business meetings, to make it free and available for all.
                    </p>

                    <div style={{display: 'flex', gap: '15px'}}>
                        <TextField 
                            onChange={e => setMeetingCode(e.target.value)} 
                            id="outlined-basic" 
                            label="Enter meeting code" 
                            variant="outlined" 
                            sx={{
                                width: "300px",
                                "& .MuiOutlinedInput-root": {
                                    "&.Mui-focused fieldset": { borderColor: "#16B844" }, // Green border on focus
                                },
                                "& .MuiInputLabel-root.Mui-focused": { color: "#16B844" } // Green label on focus
                            }}
                        />
                        <Button 
                            onClick={handleJoinVideoCall} 
                            variant='contained' 
                            size="large"
                            style={{
                                backgroundColor: "#16B844", // Green Button
                                padding: "0 30px",
                                fontSize: "1rem",
                                fontWeight: "bold"
                            }}
                        >
                            Join
                        </Button>
                    </div>
                    
                    <div style={{marginTop: '30px', width: '100%', height: '1px', background: '#eee'}}></div>
                </div>

                <div className='rightPanel'>
                    <img src="/vidc.png" alt="Video Call" />
                </div>
            </div>
        </div>
    )
}