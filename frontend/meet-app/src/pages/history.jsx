import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/Home';
import { IconButton } from '@mui/material';

export default function History() {

    const { getHistoryOfUser } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([])
    const routeTo = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                
                // ✅ SAFETY CHECK: Only set state if it's a valid array
                // If the backend sends {message: "No history"}, we treat it as []
                if (Array.isArray(history)) {
                    setMeetings(history);
                } else {
                    console.error("Invalid history data:", history);
                    setMeetings([]); 
                }
                
            } catch (e) {
                console.error("Failed to fetch history:", e);
                setMeetings([]); // Fallback to empty list on error
            }
        }

        fetchHistory();
    }, [])

    let formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0")
        const year = date.getFullYear();
        return `${day}/${month}/${year}`
    }

    return (
        <div style={{padding: '20px'}}>
            
            <div style={{display: 'flex', alignItems: 'center', marginBottom: '20px'}}>
                <IconButton onClick={() => routeTo("/home")}>
                    <HomeIcon style={{color: 'black'}} />
                </IconButton>
                <Typography variant="h5" component="h2" style={{marginLeft: '10px'}}>
                    Meeting History
                </Typography>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {/* ✅ CRASH FIX: Check if Array.isArray before mapping */}
                {Array.isArray(meetings) && meetings.length > 0 ? (
                    meetings.map((e, i) => {
                        return (
                            <Card key={i} variant="outlined" style={{ boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                                <CardContent>
                                    <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                                        Code: <strong>{e.meetingCode}</strong>
                                    </Typography>
                                    <Typography sx={{ mb: 1.5 }} color="text.secondary">
                                        Date: {formatDate(e.date)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        )
                    })
                ) : (
                    <Typography variant="body1" style={{ color: 'gray', marginTop: '20px' }}>
                        No history found.
                    </Typography>
                )}
            </div>

        </div>
    )
}