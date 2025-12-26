import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { AuthContext } from '../contexts/AuthContext';
import { Snackbar } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

const defaultTheme = createTheme();

export default function Authentication() {

    const location = useLocation();
    const navigate = useNavigate();
    
    const [formState, setFormState] = React.useState(location.state?.isSignUp ? 1 : 0);
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [name, setName] = React.useState("");
    const [error, setError] = React.useState();
    const [message, setMessage] = React.useState();
    const [open, setOpen] = React.useState(false);

    const { handleRegister, handleLogin } = React.useContext(AuthContext);

    const handleAuth = async () => {
        try {
            if (username.length && password.length) {
                
                let result; 
                
                if (formState === 0) {
                    result = await handleLogin(username, password);
                } else {
                    result = await handleRegister(name, username, password);
                }

                if (!result) {
                    setError("Server not responding");
                    return;
                }

                // Login Success Logic
                if (formState === 0) { 
                    localStorage.setItem("token", result.token);
                    localStorage.setItem("username", result.username);
                    localStorage.setItem("name", result.name || result.username);
                    navigate("/home");
                }
                
                // Register Success Logic
                if (formState === 1) {
                    setMessage("Registration Successful! Please Login.");
                    setOpen(true);
                    setFormState(0);
                    setError("");
                    setPassword(""); 
                }

            } else {
                setError("Please fill in all fields");
            }
        } catch (err) {
            console.error(err);
            let errMsg = err.response?.data?.message || "Something went wrong.";
            setError(errMsg);
        }
    }

    return (
        <ThemeProvider theme={defaultTheme}>
            <Grid container component="main" sx={{ height: '100vh' }}>
                <CssBaseline />
                <Grid
                    item
                    xs={false}
                    sm={4}
                    md={7}
                    sx={{
                        backgroundImage: 'url(https://source.unsplash.com/random?wallpapers)',
                        backgroundRepeat: 'no-repeat',
                        backgroundColor: (t) =>
                            t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />
                
                {/* ✅ UPDATED: Clean White Background, No Heavy Shadow */}
                <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'none', 
                    backgroundColor: 'white'
                }}>
                    <Box
                        sx={{
                            my: 8,
                            mx: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            width: '80%', // Limit width for better look
                            maxWidth: '400px'
                        }}
                    >
                        <Avatar sx={{ m: 1, bgcolor: '#16B844' }}> {/* Green Icon */}
                            <LockOutlinedIcon />
                        </Avatar>

                        <div style={{marginBottom: '20px'}}>
                            <Button 
                                variant={formState === 0 ? "contained" : "text"} 
                                onClick={() => { setFormState(0); setError("") }}
                                sx={{ color: formState === 0 ? 'white' : '#16B844', bgcolor: formState === 0 ? '#16B844' : 'transparent', '&:hover': { bgcolor: formState === 0 ? '#128f35' : '#f0f0f0' } }}
                            >
                                Sign In
                            </Button>
                            <Button 
                                variant={formState === 1 ? "contained" : "text"} 
                                onClick={() => { setFormState(1); setError("") }}
                                sx={{ color: formState === 1 ? 'white' : '#16B844', bgcolor: formState === 1 ? '#16B844' : 'transparent', '&:hover': { bgcolor: formState === 1 ? '#128f35' : '#f0f0f0' } }}
                            >
                                Sign Up
                            </Button>
                        </div>

                        <Box component="form" noValidate sx={{ mt: 1, width: '100%' }}>
                            
                            {formState === 1 ? <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="name"
                                label="Full Name"
                                name="name"
                                value={name}
                                autoFocus
                                onChange={(e) => setName(e.target.value)}
                                sx={{ "& .MuiOutlinedInput-root.Mui-focused fieldset": { borderColor: "#16B844" }, "& .MuiInputLabel-root.Mui-focused": { color: "#16B844" } }}
                            /> : <></>}

                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="username"
                                label="Username"
                                name="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                sx={{ "& .MuiOutlinedInput-root.Mui-focused fieldset": { borderColor: "#16B844" }, "& .MuiInputLabel-root.Mui-focused": { color: "#16B844" } }}
                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="password"
                                label="Password"
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                sx={{ "& .MuiOutlinedInput-root.Mui-focused fieldset": { borderColor: "#16B844" }, "& .MuiInputLabel-root.Mui-focused": { color: "#16B844" } }}
                            />

                            <p style={{ color: "red", textAlign: "center" }}>{error}</p>

                            {/* ✅ UPDATED: Green Action Button */}
                            <Button
                                type="button"
                                fullWidth
                                variant="contained"
                                sx={{ 
                                    mt: 3, 
                                    mb: 2, 
                                    bgcolor: '#16B844', 
                                    fontWeight: 'bold',
                                    padding: '12px',
                                    '&:hover': { bgcolor: '#128f35' } 
                                }}
                                onClick={handleAuth}
                            >
                                {formState === 0 ? "Login" : "Register"}
                            </Button>

                        </Box>
                    </Box>
                </Grid>
            </Grid>

            <Snackbar
                open={open}
                autoHideDuration={4000}
                onClose={() => setOpen(false)}
                message={message}
            />

        </ThemeProvider>
    );
}