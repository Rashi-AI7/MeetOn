import axios from "axios";
import { createContext } from "react";
import server from "../environment";

export const AuthContext = createContext({});

const client = axios.create({ baseURL: `${server}/api/v1/users` });

// Auto-redirect to /auth on any 401 (expired/invalid token)
client.interceptors.response.use(
    res => res,
    err => {
        if (err.response?.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("username");
            localStorage.removeItem("name");
            localStorage.removeItem("avatar");
            window.location.href = "/auth";
        }
        return Promise.reject(err);
    }
);

const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
});

const saveSession = ({ token, user }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("username", user.username);
    localStorage.setItem("name", user.name || user.username);
    if (user.avatar) localStorage.setItem("avatar", user.avatar);
    else localStorage.removeItem("avatar");
};

export const AuthProvider = ({ children }) => {

    const handleRegister = async (name, username, password) => {
        return await client.post("/register", { name, username, password });
    };

    const handleLogin = async (username, password) => {
        try {
            const res = await client.post("/login", { username, password });
            if (res.status === 200) saveSession(res.data);
            return res;
        } catch (err) { return err.response; }
    };

    const handleGoogleAuth = async (idToken) => {
        try {
            const res = await client.post("/google", { idToken });
            if (res.status === 200) saveSession(res.data);
            return res;
        } catch (err) { return err.response; }
    };

    const getHistoryOfUser = async () => {
        const response = await client.get("/get_all_activity", authHeader());
        return response.data;
    };

    const addToUserHistory = async (meetingCode) => {
        try {
            return await client.post("/add_to_activity", { meeting_code: meetingCode }, authHeader());
        } catch (e) {
            console.warn("Could not save meeting to history:", e?.message);
        }
    };

    return (
        <AuthContext.Provider value={{
            handleRegister, handleLogin, handleGoogleAuth,
            getHistoryOfUser, addToUserHistory
        }}>
            {children}
        </AuthContext.Provider>
    );
};