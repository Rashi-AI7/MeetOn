import React, { useEffect, useRef, useState, useCallback, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import io from "socket.io-client";
import { Badge, IconButton, TextField, Tooltip, CircularProgress } from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import PanToolIcon from "@mui/icons-material/PanTool";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import DmIcon from "@mui/icons-material/Forum";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import styles from "../styles/videoComponent.module.css";
import { MeetonLogo } from "../components/MeetonLogo";
import PageTitle from "../components/PageTitle";
import server from "../environment";
import { AuthContext } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Global map: socketId → <video> DOM element
// ontrack sets srcObject directly here — zero React render cycle involvement.
// ─────────────────────────────────────────────────────────────────────────────
const peerVideoEls = {};

function PeerVideo({ socketId, peerName, peerState, handRaised, onDm }) {
    const camOff = peerState?.video === false;
    const micOff = peerState?.audio === false;
    const initials = (name) => (name || "??").slice(0, 2).toUpperCase();

    // Register this DOM element in the global map the instant it mounts.
    // ontrack will find it here and set srcObject directly.
    const videoRef = useCallback((el) => {
        if (el) {
            peerVideoEls[socketId] = el;
            // If ontrack already fired before this element mounted,
            // the stream was parked in peerVideoEls._pending — grab it now.
            const pending = peerVideoEls._pending?.[socketId];
            if (pending) {
                el.srcObject = pending;
                el.play().catch(() => {});
                delete peerVideoEls._pending[socketId];
            }
        } else {
            delete peerVideoEls[socketId];
        }
    }, [socketId]);

    return (
        <div style={{
            position: "relative", width: "min(600px, 45vw)", aspectRatio: "16/9",
            borderRadius: 16, overflow: "hidden", background: "#0f0f1a",
            display: "inline-block", flexShrink: 0,
        }}>
            {handRaised && (
                <div style={{
                    position: "absolute", top: 10, right: 10, zIndex: 10,
                    background: "rgba(245,158,11,0.9)", borderRadius: 20,
                    padding: "4px 10px", fontSize: "0.78rem", fontWeight: 700,
                    color: "white", display: "flex", alignItems: "center", gap: 5,
                }}>✋ Raised hand</div>
            )}

            {/* Always in DOM — opacity hides it, never unmounted so srcObject persists */}
            <video
                ref={videoRef}
                autoPlay playsInline
                style={{
                    width: "100%", height: "100%", objectFit: "cover",
                    opacity: camOff ? 0 : 1,
                    position: "absolute", inset: 0,
                }}
            />

            {camOff && (
                <div style={{
                    position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", gap: 10, background: "#1a1a2e",
                }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: "50%", background: "#C62E65",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1.4rem", fontWeight: 700, color: "white",
                    }}>{initials(peerName)}</div>
                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 6 }}>
                        <i className="ti ti-video-off" aria-hidden="true" /> Camera off
                    </div>
                </div>
            )}

            {micOff && (
                <div style={{
                    position: "absolute", bottom: 36, left: 10, background: "rgba(220,38,38,0.85)",
                    borderRadius: "50%", width: 28, height: 28, zIndex: 5,
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    <i className="ti ti-microphone-off" style={{ fontSize: 14, color: "white" }} />
                </div>
            )}

            <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 5,
                background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
                borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
                padding: "18px 10px 8px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "white" }}>
                    {peerName || socketId.slice(0, 6)}
                </span>
                <button onClick={onDm} style={{
                    background: "rgba(255,255,255,0.15)", border: "none",
                    borderRadius: 6, padding: "3px 7px", cursor: "pointer",
                    color: "white", fontSize: "0.72rem", fontWeight: 600,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}>DM</button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ICE config — reads TURN creds from env if present
// ─────────────────────────────────────────────────────────────────────────────
const buildIceConfig = () => {
    const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
    if (process.env.REACT_APP_TURN_SERVER) {
        iceServers.push({
            urls:       process.env.REACT_APP_TURN_SERVER,
            username:   process.env.REACT_APP_TURN_USERNAME   || "",
            credential: process.env.REACT_APP_TURN_CREDENTIAL || "",
        });
    }
    return { iceServers };
};
// Called per-component mount so env vars are always fresh
// (relevant if TURN config changes between builds)

export default function VideoMeetComponent() {
    const navigate = useNavigate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const peerConfigConnections = React.useMemo(() => buildIceConfig(), []);
    const { url } = useParams();          // meetingCode from /meet/:url
    const { addToUserHistory } = useContext(AuthContext);

    // Refs — survive re-renders without triggering them
    const socketRef        = useRef(null);
    const socketIdRef      = useRef(null);
    const localVideoRef    = useRef(null);
    const connectionsRef   = useRef({});  // id → RTCPeerConnection (NOT module-level)
    const localStreamRef   = useRef(null);
    const chatDisplayRef   = useRef(null);

    const [videoAvailable, setVideoAvailable] = useState(true);
    const [audioAvailable, setAudioAvailable] = useState(true);
    const [video,          setVideo]          = useState(true);
    const [audio,          setAudio]          = useState(true);
    // Refs so socket callbacks (registered once) always emit current cam/mic state
    const videoStateRef = useRef(true);
    const audioStateRef = useRef(true);
    useEffect(() => { videoStateRef.current = video; }, [video]);
    useEffect(() => { audioStateRef.current = audio; }, [audio]);
    const [screen,         setScreen]         = useState(false);
    const [screenAvailable, setScreenAvailable] = useState(false);
    const [showModal,      setModal]          = useState(false);
    const [messages,       setMessages]       = useState([]);
    const [message,        setMessage]        = useState("");
    const [newMessages,    setNewMessages]    = useState(0);
    const [askForUsername, setAskForUsername] = useState(true);
    const [myAvatar] = React.useState(() => localStorage.getItem("avatar") || null);

    // Prevent body scrollbar from flashing (caused by MUI Tooltip portals)
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    const [username,       setUsername]       = useState(
        () => localStorage.getItem("name") || localStorage.getItem("username") || ""
    );
    const [videos,         setVideos]         = useState([]);
    const [peerMediaState, setPeerMediaState] = useState({}); // { socketId: { video, audio } }
    const { dark: isDarkMode, toggle: toggleGlobalDark } = useTheme();
    const [handRaised,     setHandRaised]     = useState(false);
    const [peerHandState,  setPeerHandState]  = useState({}); // { socketId: bool }
    const [reactions,      setReactions]      = useState([]); // [{ id, socketId, username, emoji }]
    const [chatTab,        setChatTab]        = useState("public"); // "public" | socketId
    const [dmTarget,       setDmTarget]       = useState(null); // { socketId, username }
    const [dmMessages,     setDmMessages]     = useState({}); // { socketId: [{ from, data }] }
    const [dmUnread,       setDmUnread]       = useState({}); // { socketId: count }
    const [callDuration,   setCallDuration]   = useState(0); // seconds
    const [showPicker,     setShowPicker]     = useState(false);
    const [peerNames,      setPeerNames]      = useState({}); // { socketId: username }
    const callStartRef   = useRef(null);
    const meetingStartRef = useRef(null); // when the meeting was created (from server)
    const [codeCopied,     setCodeCopied]     = useState(false);
    const [connecting,     setConnecting]     = useState(false);  // lobby→room spinner
    const [isHost,         setIsHost]         = useState(false);
    const [roomTitle,      setRoomTitle]      = useState("");
    const [roomError,      setRoomError]      = useState(null); // null | string

    // ── Validate room on mount — check it exists and isn't ended ────────────
    useEffect(() => {
        const token = localStorage.getItem("token") || "";
        fetch(`${server}/api/v1/rooms/${url}/validate`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
            .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
            .then(({ ok, data }) => {
                if (!ok) {
                    setRoomError(data.message || "This meeting does not exist or has ended.");
                    return;
                }
                setRoomTitle(data.title || "");
                const myUsername = localStorage.getItem("username") || "";
                setIsHost(data.host_id === myUsername);
            })
            .catch(() => setRoomError("Could not reach the server. Please try again."));
    }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Sync local stream → video element whenever it (re)mounts ───────────
    // Fires when: lobby appears (askForUsername) or screen-share ends (screen).
    // The video toggle useEffect above handles its own srcObject assignment
    // when restarting the camera, so `video` is not needed here.
    useEffect(() => {
        if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
            localVideoRef.current.muted = true;
        }
    }, [askForUsername, screen]);

    // ── Cleanup on unmount ────────────────────────────────────────────────────
    useEffect(() => {
        getPermissions();
        return () => {
            // Stop local media tracks
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
            // Close all peer connections
            for (const pc of Object.values(connectionsRef.current)) {
                try { pc.close(); } catch (_) {}
            }
            connectionsRef.current = {};
            // Clear imperative video element map
            Object.keys(peerVideoEls).forEach(k => delete peerVideoEls[k]);
            // Disconnect socket so backend emits user-left to peers
            if (socketRef.current?.connected) socketRef.current.disconnect();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-scroll chat
    useEffect(() => {
        if (chatDisplayRef.current) {
            chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
        }
    }, [messages]);

    // ── Video toggle: stop track (kills hardware light) or restart camera ───
    useEffect(() => {
        if (askForUsername) return; // don't fire during lobby
        if (video) {
            // Cam ON — always request a fresh track (previous was stopped)
            navigator.mediaDevices
                .getUserMedia({ video: true, audio: false })
                .then(async (newVidStream) => {
                    const newTrack = newVidStream.getVideoTracks()[0];
                    if (!newTrack) return;

                    // Replace in all active peer connections
                    for (const pc of Object.values(connectionsRef.current)) {
                        const sender = pc.getSenders().find(s => s.track?.kind === "video");
                        if (sender) {
                            try { await sender.replaceTrack(newTrack); } catch (_) {}
                        }
                    }

                    // Swap into existing stream (keeps audio track intact)
                    const stream = localStreamRef.current;
                    if (stream) {
                        stream.getVideoTracks().forEach(t => { t.stop(); stream.removeTrack(t); });
                        stream.addTrack(newTrack);
                    } else {
                        localStreamRef.current = newVidStream;
                    }

                    // Re-wire to the video element
                    if (localVideoRef.current) {
                        localVideoRef.current.srcObject = localStreamRef.current;
                        localVideoRef.current.muted = true;
                    }
                })
                .catch(e => {
                    console.warn("Camera restart failed:", e.name);
                    setVideo(false);
                });
        } else {
            // Cam OFF — stop track so the OS releases the hardware (LED turns off)
            const stream = localStreamRef.current;
            if (stream) {
                const tracks = stream.getVideoTracks();
                tracks.forEach(t => {
                    t.enabled = false;   // mute first (immediate visual feedback)
                    t.stop();            // release hardware — LED turns off
                    stream.removeTrack(t);
                });
            }
            // Also null out the video element srcObject so it shows placeholder
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = null;
            }
        }
    }, [video]); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync audio track enabled/disabled
    useEffect(() => {
        localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = audio; });
        // Broadcast updated media state to peers
        if (socketRef.current?.connected) {
            socketRef.current.emit("media-state", { video, audio });
        }
    }, [audio]); // eslint-disable-line react-hooks/exhaustive-deps

    // Broadcast video state change to peers
    useEffect(() => {
        if (socketRef.current?.connected) {
            socketRef.current.emit("media-state", { video, audio });
        }
    }, [video]); // eslint-disable-line react-hooks/exhaustive-deps

    // Screen share
    useEffect(() => {
        if (screen) getDisplayMedia();
    }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Media permissions ─────────────────────────────────────────────────────
    const getPermissions = async () => {
        try {
            // Probe availability first, then get the combined stream
            const vidStream = await navigator.mediaDevices.getUserMedia({ video: true }).catch(() => null);
            const audStream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
            setVideoAvailable(!!vidStream);
            setAudioAvailable(!!audStream);
            vidStream?.getTracks().forEach(t => t.stop());
            audStream?.getTracks().forEach(t => t.stop());

            setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);

            const constraints = {
                video: !!vidStream,
                audio: !!audStream,
            };
            if (!constraints.video && !constraints.audio) return;

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            localStreamRef.current = stream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
                localVideoRef.current.muted     = true;
            }
        } catch (e) {
            console.warn("Media permission error:", e.name, e.message);
            setVideoAvailable(false);
            setAudioAvailable(false);
        }
    };

    // Refs so screen-share's onended handler always reads current permission state
    const videoAvailableRef = useRef(videoAvailable);
    const audioAvailableRef = useRef(audioAvailable);
    useEffect(() => { videoAvailableRef.current = videoAvailable; }, [videoAvailable]);
    useEffect(() => { audioAvailableRef.current = audioAvailable; }, [audioAvailable]);

    // ── Build a peer connection ───────────────────────────────────────────────
    // Uses ontrack (modern) not the deprecated onaddstream API.
    const createPeerConnection = useCallback((id) => {
        if (connectionsRef.current[id]) return connectionsRef.current[id];

        const pc = new RTCPeerConnection(peerConfigConnections);
        connectionsRef.current[id] = pc;

        // ── Perfect Negotiation flags ──────────────────────────────────────────
        // "polite" peer rolls back its own offer when a collision happens.
        // We compare socket IDs lexicographically — deterministic, no server needed.
        // The peer with the LOWER socket ID is polite.
        pc._makingOffer = false;
        pc._ignoreOffer = false;
        const polite = socketIdRef.current < id;

        // ── onnegotiationneeded ────────────────────────────────────────────────
        pc.onnegotiationneeded = async () => {
            try {
                pc._makingOffer = true;
                await pc.setLocalDescription(); // implicit offer
                socketRef.current?.emit("signal", id, JSON.stringify({ sdp: pc.localDescription }));
            } catch (e) {
                console.warn("onnegotiationneeded error:", e);
            } finally {
                pc._makingOffer = false;
            }
        };

        // ── ICE ───────────────────────────────────────────────────────────────
        pc.onicecandidate = (e) => {
            if (e.candidate && socketRef.current?.connected) {
                socketRef.current.emit("ice-candidate", id, e.candidate);
            }
        };

        // ── ontrack ───────────────────────────────────────────────────────────
        pc.ontrack = (e) => {
            const stream = e.streams?.[0] ?? (() => {
                if (!pc._fallbackStream) pc._fallbackStream = new MediaStream();
                const fs = pc._fallbackStream;
                fs.getTracks().filter(t => t.kind === e.track.kind).forEach(t => fs.removeTrack(t));
                fs.addTrack(e.track);
                return fs;
            })();

            // Imperative: set srcObject directly on the DOM element — no React timing
            const el = peerVideoEls[id];
            if (el) {
                if (el.srcObject !== stream) { el.srcObject = stream; el.play().catch(() => {}); }
            } else {
                if (!peerVideoEls._pending) peerVideoEls._pending = {};
                peerVideoEls._pending[id] = stream;
            }

            // React: just track which socket IDs have tiles
            setVideos(vs => vs.some(v => v.socketId === id) ? vs : [...vs, { socketId: id }]);
        };

        // ── Connection state ──────────────────────────────────────────────────
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "failed" || pc.connectionState === "closed") {
                setVideos(vs => vs.filter(v => v.socketId !== id));
                setPeerMediaState(prev => { const s = { ...prev }; delete s[id]; return s; });
                setPeerNames(prev => { const s = { ...prev }; delete s[id]; return s; });
                delete peerVideoEls[id];
                if (peerVideoEls._pending) delete peerVideoEls._pending[id];
                try { connectionsRef.current[id]?.close(); } catch (_) {}
                delete connectionsRef.current[id];
            }
        };

        // Add local tracks — triggers onnegotiationneeded automatically
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                const alreadyAdded = pc.getSenders().some(s => s.track === track);
                if (!alreadyAdded) pc.addTrack(track, localStreamRef.current);
            });
        }

        return pc;
    }, [peerConfigConnections]);

    // ── Replace local stream in all existing peer connections ─────────────────
    const replaceTracksInPeers = useCallback(async (newStream) => {
        for (const [id, pc] of Object.entries(connectionsRef.current)) {
            if (id === socketIdRef.current) continue;
            const senders = pc.getSenders();
            for (const track of newStream.getTracks()) {
                const sender = senders.find(s => s.track?.kind === track.kind);
                if (sender) {
                    try { await sender.replaceTrack(track); } catch (_) {}
                } else {
                    pc.addTrack(track, newStream);
                }
            }
        }
    }, []);

    const getUserMediaSuccess = useCallback(async (stream) => {
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = stream;
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.muted     = true;
        }
        await replaceTracksInPeers(stream);
        stream.getTracks().forEach(track => {
            track.onended = () => { setVideo(false); setAudio(false); };
        });
    }, [replaceTracksInPeers]);

    const getDisplayMedia = useCallback(() => {
        if (!navigator.mediaDevices?.getDisplayMedia) return;
        navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
            .then(getDisplayMediaSuccess)
            .catch(e => { console.warn("Screen share cancelled:", e.name); setScreen(false); });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const getDisplayMediaSuccess = useCallback(async (stream) => {
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        await replaceTracksInPeers(stream);
        stream.getTracks().forEach(track => {
            track.onended = () => {
                setScreen(false);
                navigator.mediaDevices
                    .getUserMedia({ video: videoAvailableRef.current, audio: audioAvailableRef.current })
                    .then(getUserMediaSuccess)
                    .catch(() => {});
            };
        });
    }, [replaceTracksInPeers, getUserMediaSuccess]);

    // ── Handle incoming signal — Perfect Negotiation ──────────────────────────
    // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
    const gotMessageFromServer = useCallback(async (fromId, msg) => {
        if (fromId === socketIdRef.current) return;
        const signal = JSON.parse(msg);
        const pc = createPeerConnection(fromId);
        const polite = socketIdRef.current < fromId;

        if (signal.sdp) {
            const offerCollision = signal.sdp.type === "offer" &&
                (pc._makingOffer || pc.signalingState !== "stable");

            pc._ignoreOffer = !polite && offerCollision;
            if (pc._ignoreOffer) return; // impolite peer ignores colliding offer

            try {
                if (offerCollision) {
                    // Polite peer: roll back own offer, accept incoming offer
                    await Promise.all([
                        pc.setLocalDescription({ type: "rollback" }),
                        pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
                    ]);
                } else {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                }

                if (signal.sdp.type === "offer") {
                    await pc.setLocalDescription(); // implicit answer
                    socketRef.current?.emit("signal", fromId, JSON.stringify({ sdp: pc.localDescription }));
                }
            } catch (e) {
                console.warn("SDP error:", e);
            }
        }
    }, [createPeerConnection]);

    // ── Chat helpers — declared BEFORE connectToSocketServer ─────────────────
    // useCallback keeps the reference stable so the socket listener never
    // captures a stale version. Must be above connectToSocketServer (const
    // declarations are not hoisted — accessing them before their line is a
    // ReferenceError / temporal dead zone crash).
    const addMessage = useCallback((data, sender, socketIdSender) => {
        setMessages(prev => [...prev, { sender, data }]);
        if (socketIdSender !== socketIdRef.current) setNewMessages(n => n + 1);
    }, []);

    // Stable ref so private-message-echo always uses the current display name
    const usernameRef = useRef(username);
    useEffect(() => { usernameRef.current = username; }, [username]);

    // ── Connect to socket and join the call ───────────────────────────────────
    const connectToSocketServer = useCallback(() => {
        const token = localStorage.getItem("token");

        socketRef.current = io(server, {
            auth:            { token },
            transports:      ["websocket", "polling"],
            reconnection:    true,
            reconnectionAttempts: 5,
            reconnectionDelay:   2000,
        });

        socketRef.current.on("signal", gotMessageFromServer);

        // Dedicated ICE candidate handler — separate from SDP signals
        socketRef.current.on("ice-candidate", async (fromId, candidate) => {
            if (fromId === socketIdRef.current) return;
            const pc = createPeerConnection(fromId);
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.warn("ICE candidate error:", e);
            }
        });

        // ── Peer media state ──────────────────────────────────────────
        socketRef.current.on("media-state", (fromId, state) => {
            setPeerMediaState(prev => ({ ...prev, [fromId]: state }));
        });

        // ── Reactions ─────────────────────────────────────────────────
        socketRef.current.on("reaction", (fromId, fromUsername, emoji) => {
            const id = Date.now() + Math.random();
            setReactions(prev => [...prev, { id, socketId: fromId, username: fromUsername, emoji }]);
            setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 3000);
        });

        // ── Raise hand ────────────────────────────────────────────────
        socketRef.current.on("raise-hand", (fromId, fromUsername, raised) => {
            setPeerHandState(prev => ({ ...prev, [fromId]: raised }));
        });

        // ── Private messages ──────────────────────────────────────────
        socketRef.current.on("private-message", (fromId, fromUsername, data) => {
            setDmMessages(prev => ({
                ...prev,
                [fromId]: [...(prev[fromId] || []), { from: fromUsername, data, self: false }]
            }));
            setDmUnread(prev => ({ ...prev, [fromId]: (prev[fromId] || 0) + 1 }));
            setPeerNames(prev => ({ ...prev, [fromId]: fromUsername }));
        });
        socketRef.current.on("private-message-echo", (toId, data) => {
            setDmMessages(prev => ({
                ...prev,
                [toId]: [...(prev[toId] || []), { from: usernameRef.current, data, self: true }]
            }));
        });

        // ── Register ALL listeners before connect fires ──────────────────────
        // This prevents the race where existing-participants arrives before
        // its listener is registered inside the connect callback.

        socketRef.current.on("chat-message", addMessage);

        socketRef.current.on("user-left", (id) => {
            setVideos(vs => vs.filter(v => v.socketId !== id));
            setPeerMediaState(prev => { const s = { ...prev }; delete s[id]; return s; });
            setPeerHandState(prev => { const s = { ...prev }; delete s[id]; return s; });
            setPeerNames(prev => { const s = { ...prev }; delete s[id]; return s; });
            delete peerVideoEls[id];
            if (peerVideoEls._pending) delete peerVideoEls._pending[id];
            try { connectionsRef.current[id]?.close(); } catch (_) {}
            delete connectionsRef.current[id];
        });

        socketRef.current.on("user-joined", async (id, joinedUsername, allIds) => {
            if (id === socketIdRef.current) return;
            setPeerNames(prev => ({ ...prev, [id]: joinedUsername }));
            if (Array.isArray(allIds)) {
                setVideos(vs => vs.filter(v => allIds.includes(v.socketId)));
                setPeerMediaState(prev => {
                    const next = {};
                    allIds.forEach(sid => { if (prev[sid]) next[sid] = prev[sid]; });
                    return next;
                });
            }
            socketRef.current?.emit("media-state", { video: videoStateRef.current, audio: audioStateRef.current });

            // Just create the PC and add tracks.
            // onnegotiationneeded fires automatically and sends the offer.
            const pc = createPeerConnection(id);
            if (localStreamRef.current) {
                const senders = pc.getSenders();
                localStreamRef.current.getTracks().forEach(track => {
                    if (!senders.some(s => s.track === track))
                        pc.addTrack(track, localStreamRef.current);
                });
            }
        });

        // existing-participants: new joiner creates PCs for everyone already there.
        // onnegotiationneeded fires automatically for each PC and sends the offer.
        socketRef.current.on("existing-participants", async (participants) => {
            if (!Array.isArray(participants)) return;
            const nameMap = {};
            participants.forEach(p => { if (p?.id) nameMap[p.id] = p.displayName; });
            setPeerNames(prev => ({ ...prev, ...nameMap }));

            participants.forEach((p) => {
                const sid = p?.id ?? p;
                if (!sid || sid === socketIdRef.current) return;
                const pc = createPeerConnection(sid);
                if (localStreamRef.current) {
                    localStreamRef.current.getTracks().forEach(track => {
                        if (!pc.getSenders().some(s => s.track === track))
                            pc.addTrack(track, localStreamRef.current);
                    });
                }
            });
            socketRef.current?.emit("media-state", { video: videoStateRef.current, audio: audioStateRef.current });
        });

        socketRef.current.on("room-error", ({ code, message: msg }) => {
            console.warn("room-error:", code, msg);
            setRoomError(msg || "Could not join this meeting.");
        });

        socketRef.current.on("room-ended", ({ endedBy }) => {
            setRoomError(`Meeting ended by ${endedBy}.`);
            // Clean up
            try { localStreamRef.current?.getTracks().forEach(t => t.stop()); } catch (_) {}
            setTimeout(() => navigate("/home"), 2500);
        });

        // ── Join once connected ───────────────────────────────────────────────
        // All listeners are registered above BEFORE this fires, preventing
        // the race where existing-participants arrives before its listener.
        socketRef.current.on("connect", () => {
            socketIdRef.current = socketRef.current.id;
            socketRef.current.emit("join-call", url, username, (ack) => {
                setConnecting(false);
                if (ack?.error) {
                    console.error("join-call rejected:", ack.error);
                    if (ack.error === "ALREADY_IN_MEETING") {
                        setRoomError("You are already in this meeting in another tab or window. Please close this tab.");
                    } else {
                        navigate("/home");
                    }
                } else if (ack?.success) {
                    // Store meeting creation time — all participants share this clock
                    if (ack.startedAt) {
                        meetingStartRef.current = ack.startedAt;
                        setCallDuration(Math.floor((Date.now() - ack.startedAt) / 1000));
                    }
                    addToUserHistory(url);
                    // peer-ready MUST be sent AFTER join-call ack so the server
                    // knows which room this socket belongs to before flushing
                    // any queued ICE candidates.
                    socketRef.current.emit("peer-ready");
                }
            });
        });

        socketRef.current.on("connect_error", (err) => {
            console.error("Socket connect error:", err.message);
            setConnecting(false);
            if (["AUTH_REQUIRED", "TOKEN_EXPIRED", "INVALID_TOKEN"].includes(err.message)) {
                localStorage.removeItem("token");
                navigate("/auth");
            }
        });

        socketRef.current.on("reconnect", () => {
            // Close all stale peer connections
            for (const [id, pc] of Object.entries(connectionsRef.current)) {
                try { pc.close(); } catch (_) {}
                delete peerVideoEls[id];
            }
            connectionsRef.current = {};
            setVideos([]);
            setPeerMediaState({});
            setPeerNames({});
            // Re-join on socket.io auto-reconnect — server will re-send existing-participants
            socketRef.current.emit("rejoin-call", url, (ack) => {
                if (ack?.error) navigate("/home");
                else socketRef.current.emit("peer-ready");
            });
        });
    }, [url, navigate, addToUserHistory, gotMessageFromServer, createPeerConnection, addMessage]);

    // ── Chat ──────────────────────────────────────────────────────────────────
    const sendReaction = (emoji) => {
        socketRef.current?.emit("reaction", emoji);
        // Show own reaction locally too
        const id = Date.now() + Math.random();
        setReactions(prev => [...prev, { id, socketId: socketIdRef.current, username, emoji }]);
        setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 3000);
    };

    const toggleHand = () => {
        const newVal = !handRaised;
        setHandRaised(newVal);
        socketRef.current?.emit("raise-hand", newVal);
    };

    const sendDm = (toSocketId, msg) => {
        if (!msg.trim() || !socketRef.current?.connected) return;
        socketRef.current.emit("private-message", toSocketId, msg.trim());
    };

    const sendMessage = () => {
        if (!message.trim() || !socketRef.current?.connected) return;
        socketRef.current.emit("chat-message", message.trim());
        setMessage("");
    };

    // ── Controls ──────────────────────────────────────────────────────────────
    const handleEndCall = () => {
        // Always stop local tracks immediately regardless of host/guest
        try { localStreamRef.current?.getTracks().forEach(t => t.stop()); } catch (_) {}
        localStreamRef.current = null;
        callStartRef.current = null;
        setCallDuration(0);
        if (isHost && socketRef.current?.connected) {
            socketRef.current.emit("host-end-meeting", url);
            // room-ended event navigates all participants after delay
            setTimeout(() => navigate("/home"), 2500);
        } else {
            navigate("/home");
        }
    };

    // ── Call duration timer — shows time since meeting was CREATED (not since you joined) ──
    useEffect(() => {
        if (askForUsername) return; // still in lobby
        if (callStartRef.current) return; // already running
        callStartRef.current = Date.now();
        const t = setInterval(() => {
            // Use meeting creation time if available, otherwise fall back to join time
            const origin = meetingStartRef.current || callStartRef.current;
            setCallDuration(Math.floor((Date.now() - origin) / 1000));
        }, 1000);
        return () => clearInterval(t);
    }, [askForUsername]);

    const fmtDuration = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
        return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
    };

    const connect = () => {
        const trimmed = username.trim();
        if (!trimmed) return;
        // Persist display name for next time
        localStorage.setItem("name", trimmed);
        setAskForUsername(false);
        setConnecting(true);
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();
    };

    const handleCopyCode = () => {
        const fullLink = `${window.location.origin}/meet/${url}`;
        navigator.clipboard.writeText(fullLink).catch(() => {});
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
    };

    const initials = (name) => (name || "??").slice(0, 2).toUpperCase();
    const iconStyle = { fontSize: "1.25rem" };

    return (
        <>
            <PageTitle title={`In Meeting · ${url || ""}`} />

            {roomError ? (
                /* ── Room error / meeting ended screen ── */
                <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", height: "100vh", gap: 20,
                    background: "var(--bg)", color: "var(--text-primary)", textAlign: "center", padding: 40
                }}>
                    <i className="ti ti-video-off" aria-hidden="true"
                        style={{ fontSize: "3rem", color: "var(--primary)", opacity: 0.7 }} />
                    <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, margin: 0 }}>
                        Meeting Unavailable
                    </h2>
                    <p style={{ color: "var(--text-secondary)", maxWidth: 360, margin: 0 }}>{roomError}</p>
                    <button className="btn-primary" onClick={() => navigate("/home")}
                        style={{ padding: "12px 32px", borderRadius: 10 }}>
                        Back to Home
                    </button>
                </div>
            ) : askForUsername ? (
                /* ── LOBBY ── */
                <div className={styles.lobbyContainer}>
                    <div className={styles.lobbyCard}>
                        <div className={styles.lobbyLogoRow}>
                            <MeetonLogo size={32} />
                            <span className={styles.lobbyLogoText}>MeetOn</span>
                        </div>
                        <h2 className={styles.lobbyTitle}>{roomTitle || "Ready to join?"}</h2>
                        <p className={styles.lobbySubtitle}>
                            {isHost ? "You are the host of this meeting" : "Confirm your display name before entering"}
                        </p>

                        {url && (
                            <div style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                background: "rgba(22,184,68,0.06)", border: "1px solid rgba(198,46,101,0.2)",
                                borderRadius: 10, padding: "10px 14px", width: "100%",
                                fontSize: "0.82rem", color: "#5a6b5e", gap: 8, boxSizing: "border-box"
                            }}>
                                <span>Meeting code: <strong style={{ fontFamily: "monospace", letterSpacing: 1, color: "#C62E65" }}>{url}</strong></span>
                                <button onClick={handleCopyCode} style={{
                                    background: "none", border: "none", cursor: "pointer",
                                    color: "#C62E65", fontWeight: 700, fontSize: "0.78rem",
                                    fontFamily: "'Plus Jakarta Sans', sans-serif", padding: "2px 6px", borderRadius: 6
                                }}>
                                    {codeCopied ? "✓ Copied" : "Copy"}
                                </button>
                            </div>
                        )}

                        <TextField
                            label="Your display name"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && connect()}
                            variant="outlined"
                            fullWidth
                            autoFocus
                            inputProps={{ autoComplete: "nickname", maxLength: 40 }}
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: "12px",
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    "&.Mui-focused fieldset": { borderColor: "#C62E65", borderWidth: "2px" },
                                },
                                "& .MuiInputLabel-root.Mui-focused": { color: "#C62E65" },
                                "& .MuiInputLabel-root": { fontFamily: "'Plus Jakarta Sans', sans-serif" },
                            }}
                        />

                        <button
                            className={styles.lobbyConnectBtn}
                            onClick={connect}
                            disabled={!username.trim() || connecting}
                            style={{ opacity: !username.trim() || connecting ? 0.6 : 1, cursor: !username.trim() || connecting ? "not-allowed" : "pointer" }}>
                            {connecting
                                ? <><CircularProgress size={16} sx={{ color: "white", mr: 1 }} /> Connecting…</>
                                : "Join Meeting"}
                        </button>
                    </div>

                    <div className={styles.lobbyVideoWrap}>
                        <video ref={localVideoRef} autoPlay muted playsInline />
                    </div>

                    <Tooltip title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"} placement="bottom">
                        <IconButton onClick={toggleGlobalDark}
                            style={{ position: "fixed", top: 20, right: 20 }}>
                            {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
                        </IconButton>
                    </Tooltip>
                </div>
            ) : (
                /* ── MEET VIEW ── */
                <div className={`${styles.meetVideoContainer} ${isDarkMode ? "" : styles.lightMode}`}>

                    {/* CALL TIMER */}
                    <div style={{
                        position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
                        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
                        borderRadius: 20, padding: "5px 16px", zIndex: 30,
                        fontSize: "0.82rem", fontWeight: 600, color: "rgba(255,255,255,0.85)",
                        fontFamily: "monospace", letterSpacing: 1, border: "1px solid rgba(255,255,255,0.1)"
                    }}>
                        {fmtDuration(callDuration)}
                    </div>

                    {/* FLOATING REACTIONS */}
                    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 200, overflow: "hidden" }}>
                        {reactions.map(r => (
                            <div key={r.id} style={{
                                position: "absolute",
                                bottom: 120, left: `${15 + Math.abs(r.id % 70)}%`,
                                animation: "reactionFloat 3s ease-out forwards",
                                fontSize: "2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: 2
                            }}>
                                <span>{r.emoji}</span>
                                <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
                                    {r.username === username ? "You" : r.username}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* CHAT PANEL */}
                    {showModal && (
                        <div className={styles.chatRoom}>
                            <div className={styles.chatHeader}>
                                <h2>Chat</h2>
                                <button className={styles.chatCloseBtn} onClick={() => setModal(false)}>
                                    <CloseIcon sx={{ fontSize: "0.9rem" }} />
                                </button>
                            </div>

                            {/* CHAT TABS */}
                            <div style={{ display: "flex", borderBottom: "1px solid var(--border)", overflowX: "auto", flexShrink: 0 }}>
                                <button onClick={() => { setChatTab("public"); setDmTarget(null); }}
                                    style={{
                                        padding: "8px 14px", fontSize: "0.8rem", fontWeight: 600,
                                        background: "none", border: "none", cursor: "pointer",
                                        color: chatTab === "public" ? "var(--primary)" : "var(--text-sub)",
                                        borderBottom: chatTab === "public" ? "2px solid var(--primary)" : "2px solid transparent",
                                        fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: "nowrap"
                                    }}>
                                    Everyone
                                </button>
                                {Object.entries(peerNames).map(([sid, uname]) => {
                                    const unread = dmUnread[sid] || 0;
                                    return (
                                        <button key={sid} onClick={() => { setChatTab(sid); setDmTarget({ socketId: sid, username: uname }); setDmUnread(p => ({ ...p, [sid]: 0 })); }}
                                            style={{
                                                padding: "8px 14px", fontSize: "0.8rem", fontWeight: 600,
                                                background: "none", border: "none", cursor: "pointer",
                                                color: chatTab === sid ? "var(--primary)" : "var(--text-sub)",
                                                borderBottom: chatTab === sid ? "2px solid var(--primary)" : "2px solid transparent",
                                                fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: "nowrap",
                                                display: "flex", alignItems: "center", gap: 5, position: "relative"
                                            }}>
                                            {uname}
                                            {unread > 0 && (
                                                <span style={{ background: "#ef4444", color: "white", borderRadius: "50%", width: 16, height: 16, fontSize: "0.65rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                    {unread}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* MESSAGES */}
                            <div className={styles.chattingDisplay} ref={chatDisplayRef}>
                                {chatTab === "public" ? (
                                    messages.length === 0
                                        ? <div className={styles.emptyChat}>
                                            <i className="ti ti-message-circle" aria-hidden="true" style={{ fontSize: 28, opacity: 0.4, marginBottom: 8 }}></i>
                                            No messages yet. Say hello!
                                        </div>
                                        : messages.map((item, i) => (
                                            <div key={i} className={`${styles.msgBlock} ${item.sender === username ? styles.selfMessage : styles.otherMessage}`}>
                                                <strong>{item.sender === username ? "You" : item.sender}</strong>
                                                {item.data}
                                            </div>
                                        ))
                                ) : (
                                    (dmMessages[chatTab] || []).length === 0
                                        ? <div className={styles.emptyChat}>
                                            <DmIcon style={{ fontSize: 28, opacity: 0.4 }} />
                                            <span style={{ marginTop: 8 }}>Start a private conversation with {dmTarget?.username}</span>
                                        </div>
                                        : (dmMessages[chatTab] || []).map((item, i) => (
                                            <div key={i} className={`${styles.msgBlock} ${item.self ? styles.selfMessage : styles.otherMessage}`}>
                                                <strong>{item.self ? "You" : item.from}</strong>
                                                {item.data}
                                            </div>
                                        ))
                                )}
                            </div>
                            <div className={styles.chattingArea}>
                                <TextField
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            if (chatTab === "public") sendMessage();
                                            else if (dmTarget) { sendDm(dmTarget.socketId, message); setMessage(""); }
                                        }
                                    }}
                                    placeholder={chatTab === "public" ? "Message everyone…" : `Message ${dmTarget?.username || ""}…`}
                                    variant="outlined" size="small" multiline maxRows={3}
                                    inputProps={{ maxLength: 1000 }}
                                    sx={{
                                        flex: 1,
                                        "& .MuiOutlinedInput-root": {
                                            borderRadius: "10px", fontFamily: "'Plus Jakarta Sans', sans-serif",
                                            fontSize: "0.88rem", "&.Mui-focused fieldset": { borderColor: "#C62E65" },
                                        },
                                    }}
                                />
                                <button className={styles.chatSendBtn}
                                    onClick={() => {
                                        if (chatTab === "public") sendMessage();
                                        else if (dmTarget) { sendDm(dmTarget.socketId, message); setMessage(""); }
                                    }}
                                    disabled={!message.trim()}>
                                    <SendIcon sx={{ fontSize: "0.95rem" }} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* CONTROL BAR */}
                    <div className={styles.buttonContainers}>
                        <Tooltip title={video ? "Turn off camera" : "Turn on camera"} placement="bottom">
                            <button
                                className={`${styles.controlBtn} ${video ? styles.controlBtnActive : ""}`}
                                onClick={() => setVideo(v => !v)}>
                                {video ? <VideocamIcon sx={iconStyle} /> : <VideocamOffIcon sx={iconStyle} />}
                            </button>
                        </Tooltip>

                        <Tooltip title={audio ? "Mute microphone" : "Unmute microphone"} placement="bottom">
                            <button
                                className={`${styles.controlBtn} ${audio ? styles.controlBtnActive : ""}`}
                                onClick={() => setAudio(v => !v)}>
                                {audio ? <MicIcon sx={iconStyle} /> : <MicOffIcon sx={iconStyle} />}
                            </button>
                        </Tooltip>

                        <Tooltip title={handRaised ? "Lower hand" : "Raise hand"} placement="bottom">
                            <button className={`${styles.controlBtn} ${handRaised ? styles.controlBtnActive : ""}`}
                                onClick={toggleHand}>
                                <PanToolIcon sx={{ ...iconStyle, color: handRaised ? "#f59e0b" : undefined }} />
                            </button>
                        </Tooltip>

                        {/* Reaction picker — click to open, click outside to close */}
                        <div style={{ position: "relative" }}>
                            <Tooltip title="Send reaction" placement="bottom">
                                <button className={`${styles.controlBtn} ${showPicker ? styles.controlBtnActive : ""}`}
                                    onClick={() => setShowPicker(v => !v)}>
                                    <EmojiEmotionsIcon sx={iconStyle} />
                                </button>
                            </Tooltip>
                            {showPicker && (
                                <>
                                    {/* Invisible overlay to close picker on outside click */}
                                    <div onClick={() => setShowPicker(false)}
                                        style={{ position: "fixed", inset: 0, zIndex: 199 }} />
                                    <div style={{
                                        position: "absolute", bottom: "calc(100% + 12px)",
                                        left: "50%", transform: "translateX(-50%)",
                                        background: "var(--bar-bg)", backdropFilter: "blur(20px)",
                                        borderRadius: 40, padding: "10px 14px",
                                        gap: 6, border: "1px solid var(--border)",
                                        boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
                                        zIndex: 200, whiteSpace: "nowrap",
                                        display: "flex", alignItems: "center",
                                        animation: "pickerPop 0.15s cubic-bezier(0.34,1.56,0.64,1) both"
                                    }}>
                                        {["👍","❤️","😂","🎉","😮","🙌","🔥","👏"].map(emoji => (
                                            <button key={emoji}
                                                onClick={() => { sendReaction(emoji); setShowPicker(false); }}
                                                style={{
                                                    background: "none", border: "none", cursor: "pointer",
                                                    fontSize: "1.5rem", padding: "4px 6px", borderRadius: 10,
                                                    transition: "transform 0.12s ease", lineHeight: 1,
                                                    display: "flex", alignItems: "center", justifyContent: "center"
                                                }}
                                                onMouseEnter={ev => ev.currentTarget.style.transform = "scale(1.35)"}
                                                onMouseLeave={ev => ev.currentTarget.style.transform = "scale(1)"}>
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className={styles.controlSeparator} />

                        <Tooltip title={isHost ? "End meeting for everyone" : "Leave meeting"} placement="bottom">
                            <button className={`${styles.controlBtn} ${styles.controlBtnDanger}`} onClick={handleEndCall}
                                style={isHost ? { background: "rgba(220,38,38,0.9)", minWidth: 80 } : {}}>
                                <CallEndIcon sx={iconStyle} />
                                {isHost && <span style={{ fontSize: "0.7rem", marginLeft: 4, fontWeight: 700 }}>End</span>}
                            </button>
                        </Tooltip>

                        <div className={styles.controlSeparator} />

                        {screenAvailable && (
                            <Tooltip title={screen ? "Stop sharing" : "Share screen"} placement="bottom">
                                <button
                                    className={`${styles.controlBtn} ${screen ? styles.controlBtnActive : ""}`}
                                    onClick={() => setScreen(v => !v)}>
                                    {screen ? <StopScreenShareIcon sx={iconStyle} /> : <ScreenShareIcon sx={iconStyle} />}
                                </button>
                            </Tooltip>
                        )}

                        <Tooltip title={showModal ? "Hide chat" : "Show chat"} placement="bottom">
                            <button
                                className={`${styles.controlBtn} ${showModal ? styles.controlBtnActive : ""}`}
                                onClick={() => { setModal(v => !v); setNewMessages(0); }}>
                                <Badge badgeContent={!showModal ? (newMessages + Object.values(dmUnread).reduce((a,b)=>a+b,0)) : 0} max={99}
                                    sx={{ "& .MuiBadge-badge": { background: "#C62E65", color: "white", fontSize: "0.65rem" } }}>
                                    <ChatIcon sx={iconStyle} />
                                </Badge>
                            </button>
                        </Tooltip>

                        <Tooltip title={codeCopied ? "Copied!" : `Copy code: ${url}`} placement="bottom">
                            <button className={styles.controlBtn} onClick={handleCopyCode}>
                                <ContentCopyIcon sx={iconStyle} />
                            </button>
                        </Tooltip>

                        <Tooltip title={isDarkMode ? "Light mode" : "Dark mode"} placement="bottom">
                            <button className={styles.controlBtn} onClick={toggleGlobalDark}>
                                {isDarkMode ? <LightModeIcon sx={iconStyle} /> : <DarkModeIcon sx={iconStyle} />}
                            </button>
                        </Tooltip>
                    </div>

                    {/* LOCAL VIDEO (Picture-in-Picture) */}
                    {/* Always keep <video> mounted — toggling display instead of
                        unmounting prevents the srcObject from being lost when
                        the user turns cam off then back on. */}
                    <div className={styles.meetUserVideo}>
                        <video ref={localVideoRef} autoPlay muted playsInline
                            style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", display: video ? "block" : "none" }} />
                        {!video && (
                            <div className={styles.camOffPlaceholder}>
                                <div className={styles.camOffAvatar}>{initials(username)}</div>
                                <span style={{ fontSize: "0.78rem", marginTop: 4 }}>Cam off</span>
                            </div>
                        )}
                    </div>

                    {/* REMOTE VIDEOS */}
                    <div className={styles.conferenceView}>
                        {videos.length === 0 ? (
                            <div style={{
                                display: "flex", flexDirection: "column", alignItems: "center",
                                justifyContent: "center", gap: 16, textAlign: "center", padding: "60px 20px",
                                opacity: 0.6
                            }}>
                                <i className="ti ti-antenna-bars-5" aria-hidden="true" style={{ fontSize: "2.5rem", opacity: 0.5 }}></i>
                                <div style={{ fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif", fontSize: "1.1rem", fontWeight: 600 }}>
                                    Waiting for others to join…
                                </div>
                                <div style={{ fontSize: "0.85rem" }}>
                                    Share the link or code <strong style={{ fontFamily: "monospace", letterSpacing: 1 }}>{url}</strong> to invite people
                                </div>
                                <button onClick={handleCopyCode} style={{
                                    background: "rgba(198,46,101,0.12)", border: "1px solid rgba(198,46,101,0.25)",
                                    borderRadius: 20, padding: "8px 18px", cursor: "pointer",
                                    color: "#C62E65", fontWeight: 700, fontSize: "0.85rem",
                                    fontFamily: "'Plus Jakarta Sans', sans-serif"
                                }}>
                                    {codeCopied ? "✓ Copied!" : "Copy invite code"}
                                </button>
                            </div>
                        ) : (
                            videos.map((vid) => (
                                <PeerVideo
                                    key={vid.socketId}
                                    socketId={vid.socketId}
                                    peerName={peerNames[vid.socketId]}
                                    peerState={peerMediaState[vid.socketId]}
                                    handRaised={peerHandState[vid.socketId]}
                                    onDm={() => {
                                        const uname = peerNames[vid.socketId] || vid.socketId.slice(0, 6);
                                        setDmTarget({ socketId: vid.socketId, username: uname });
                                        setChatTab(vid.socketId);
                                        setDmUnread(p => ({ ...p, [vid.socketId]: 0 }));
                                        setModal(true);
                                    }}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}
        <style>{`
            @keyframes reactionFloat {
                0%   { transform: translateY(0) scale(1); opacity: 1; }
                60%  { transform: translateY(-120px) scale(1.2); opacity: 0.9; }
                100% { transform: translateY(-200px) scale(0.8); opacity: 0; }
            }
            @keyframes pickerPop {
                from { transform: translateX(-50%) scale(0.8); opacity: 0; }
                to   { transform: translateX(-50%) scale(1); opacity: 1; }
            }
        `}</style>
        </>
    );
}