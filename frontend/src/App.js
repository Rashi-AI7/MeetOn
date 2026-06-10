import './App.css';
import { ThemeProvider } from './contexts/ThemeContext';
import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/landing.jsx";
import Authentication from './pages/authentication.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import VideoMeetComponent from './pages/VideoMeet.jsx';
import HomeComponent from './pages/home';
import History from './pages/history';
import ProfilePage from './pages/profile';
import NotFound from './pages/NotFound';

// Redirects to /auth if no token, otherwise renders children
function RequireAuth({ children }) {
    const token = localStorage.getItem("token");
    if (!token) return <Navigate to="/auth" replace />;
    return children;
}

// Redirects already-logged-in users away from auth page
function RedirectIfAuth({ children }) {
    const token = localStorage.getItem("token");
    if (token) return <Navigate to="/home" replace />;
    return children;
}

function App() {
    return (
        <ThemeProvider>
        <AuthProvider>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={
                    <RedirectIfAuth><Authentication /></RedirectIfAuth>
                } />
                <Route path="/home" element={
                    <RequireAuth><HomeComponent /></RequireAuth>
                } />
                <Route path="/history" element={
                    <RequireAuth><History /></RequireAuth>
                } />
                <Route path="/meet/:url" element={
                    <RequireAuth><VideoMeetComponent /></RequireAuth>
                } />
                <Route path="/profile" element={
                    <RequireAuth><ProfilePage /></RequireAuth>
                } />
                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </AuthProvider>
        </ThemeProvider>
    );
}

export default App;