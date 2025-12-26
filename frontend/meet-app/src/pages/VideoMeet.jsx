import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import io from "socket.io-client";
import { Badge, IconButton, TextField } from '@mui/material';
import { Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import server from '../environment';

let server_url = server;

var connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
    ]
}

export default function VideoMeetComponent() {

    const router = useNavigate();
    var socketRef = useRef();
    let socketIdRef = useRef();
    let localVideoref = useRef();

    let [videoAvailable, setVideoAvailable] = useState(true);
    let [audioAvailable, setAudioAvailable] = useState(true);
    let [video, setVideo] = useState(true);
    let [audio, setAudio] = useState(true);
    let [screen, setScreen] = useState(false);
    let [showModal, setModal] = useState(true);
    let [screenAvailable, setScreenAvailable] = useState();
    let [messages, setMessages] = useState([])
    let [message, setMessage] = useState("");
    let [newMessages, setNewMessages] = useState(0);
    let [askForUsername, setAskForUsername] = useState(true);
    let [username, setUsername] = useState("");
    const videoRef = useRef([])
    let [videos, setVideos] = useState([])
    const [isDarkMode, setIsDarkMode] = useState(true);

    useEffect(() => {
        getPermissions();
        return () => {
             if (window.localStream) {
                 window.localStream.getTracks().forEach(track => track.stop());
             }
             for (let id in connections) {
                 connections[id].close();
             }
             connections = {};
        };
    }, []);

    useEffect(() => {
        if (localVideoref.current && localVideoref.current.srcObject) {
            const tracks = localVideoref.current.srcObject.getVideoTracks();
            if (tracks.length > 0) tracks[0].enabled = video;
        }
        if (window.localStream) {
             const globalTracks = window.localStream.getVideoTracks();
             if (globalTracks.length > 0) globalTracks[0].enabled = video;
        }
    }, [video]);

    useEffect(() => {
        if (localVideoref.current && localVideoref.current.srcObject) {
            const tracks = localVideoref.current.srcObject.getAudioTracks();
            if (tracks.length > 0) tracks[0].enabled = audio;
        }
        if (window.localStream) {
             const globalTracks = window.localStream.getAudioTracks();
             if (globalTracks.length > 0) globalTracks[0].enabled = audio;
        }
    }, [audio]);

    useEffect(() => {
        if (localVideoref.current && window.localStream) {
            // Only attach if it's missing (prevents flickering)
            if (localVideoref.current.srcObject !== window.localStream) {
                localVideoref.current.srcObject = window.localStream;
            }
        }
    });

    let getDislayMedia = () => {
        if (screen) {
            if (navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                    .then(getDislayMediaSuccess)
                    .then((stream) => { })
                    .catch((e) => console.log(e))
            }
        }
    }

    const getPermissions = async () => {
        try {
            const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoPermission) {
                setVideoAvailable(true);
            } else {
                setVideoAvailable(false);
            }

            const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (audioPermission) {
                setAudioAvailable(true);
            } else {
                setAudioAvailable(false);
            }

            if (navigator.mediaDevices.getDisplayMedia) {
                setScreenAvailable(true);
            } else {
                setScreenAvailable(false);
            }

            if (videoAvailable || audioAvailable) {
                const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: videoAvailable, audio: audioAvailable });
                if (userMediaStream) {
                    window.localStream = userMediaStream;
                    if (localVideoref.current) {
                        localVideoref.current.srcObject = userMediaStream;
                    }
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    let getMedia = () => {
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();
    }

    const addIncomingConnection = (id) => {
        if (connections[id]) return; 

        connections[id] = new RTCPeerConnection(peerConfigConnections);

        connections[id].onicecandidate = (event) => {
            if (event.candidate != null) {
                socketRef.current.emit('signal', id, JSON.stringify({ 'ice': event.candidate }));
            }
        }

        connections[id].onaddstream = (event) => {
            let videoExists = videoRef.current.find(video => video.socketId === id);
            if (videoExists) {
                setVideos(videos => {
                    const updatedVideos = videos.map(video =>
                        video.socketId === id ? { ...video, stream: event.stream } : video
                    );
                    videoRef.current = updatedVideos;
                    return updatedVideos;
                });
            } else {
                let newVideo = {
                    socketId: id,
                    stream: event.stream,
                    autoplay: true,
                    playsinline: true
                };
                setVideos(videos => {
                    const updatedVideos = [...videos, newVideo];
                    videoRef.current = updatedVideos;
                    return updatedVideos;
                });
            }
        };

        if (window.localStream !== undefined && window.localStream !== null) {
            connections[id].addStream(window.localStream);
        } else {
            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            connections[id].addStream(window.localStream);
        }
    }


    let getUserMediaSuccess = (stream) => {
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) { console.log(e) }

        window.localStream = stream
        if (localVideoref.current) {
            localVideoref.current.srcObject = stream
            localVideoref.current.muted = true; // Avoid feedback loops
            localVideoref.current.play().catch(e => console.log("Play error:", e));
        }

        for (let id in connections) {
            if (id === socketIdRef.current) continue
            connections[id].addStream(window.localStream)
            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setVideo(false);
            setAudio(false);
            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            localVideoref.current.srcObject = window.localStream

            for (let id in connections) {
                connections[id].addStream(window.localStream)
                connections[id].createOffer().then((description) => {
                    connections[id].setLocalDescription(description)
                        .then(() => {
                            socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                        })
                        .catch(e => console.log(e))
                })
            }
        })
    }

    let getUserMedia = () => {
        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
                .then(getUserMediaSuccess)
                .then((stream) => { })
                .catch((e) => console.log(e))
        } else {
            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { }
        }
    }

    let getDislayMediaSuccess = (stream) => {
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) { console.log(e) }

        window.localStream = stream
        localVideoref.current.srcObject = stream

        for (let id in connections) {
            if (id === socketIdRef.current) continue
            connections[id].addStream(window.localStream)
            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setScreen(false)
            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            localVideoref.current.srcObject = window.localStream
            getUserMedia()
        })
    }

    let gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message)

        if (fromId !== socketIdRef.current) {
            if (!connections[fromId]) {
                addIncomingConnection(fromId);
            }

            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }))
                            }).catch(e => console.log(e))
                        }).catch(e => console.log(e))
                    }
                }).catch(e => console.log(e))
            }

            if (signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
            }
        }
    }

    let connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false })
        socketRef.current.on('signal', gotMessageFromServer)
        socketRef.current.on('connect', () => {
            socketRef.current.emit('join-call', window.location.href)
            socketIdRef.current = socketRef.current.id
            socketRef.current.on('chat-message', addMessage)
            socketRef.current.on('user-left', (id) => {
                setVideos((videos) => videos.filter((video) => video.socketId !== id))
            })
            socketRef.current.on('user-joined', (id, clients) => {
                clients.forEach((socketListId) => {
                    addIncomingConnection(socketListId);
                })
                
                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue
                        try {
                            connections[id2].addStream(window.localStream)
                        } catch (e) { }

                        connections[id2].createOffer().then((description) => {
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }))
                                })
                                .catch(e => console.log(e))
                        })
                    }
                }
            })
        })
    }

    let silence = () => {
        let ctx = new AudioContext()
        let oscillator = ctx.createOscillator()
        let dst = oscillator.connect(ctx.createMediaStreamDestination())
        oscillator.start()
        ctx.resume()
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
    }

    let black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height })
        canvas.getContext('2d').fillRect(0, 0, width, height)
        let stream = canvas.captureStream()
        return Object.assign(stream.getVideoTracks()[0], { enabled: false })
    }

    let handleVideo = () => setVideo(!video);
    let handleAudio = () => setAudio(!audio);
    let handleScreen = () => setScreen(!screen);

    useEffect(() => {
        if (screen !== undefined) {
            getDislayMedia();
        }
    }, [screen])

    let handleEndCall = () => {
        try {
            let tracks = localVideoref.current.srcObject.getTracks()
            tracks.forEach(track => track.stop())
        } catch (e) { }
        router("/home");
    }

    let openChat = () => {
        setModal(true);
        setNewMessages(0);
    }
    let closeChat = () => {
        setModal(false);
    }
    let handleMessage = (e) => {
        setMessage(e.target.value);
    }

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    };

    let sendMessage = () => {
        socketRef.current.emit('chat-message', message, username)
        setMessage("");
    }

    let connect = () => {
        setAskForUsername(false);
        getMedia();
    }

    return (
        <div>
            {askForUsername === true ?
                <div className={`${styles.lobbyContainer} ${!isDarkMode ? styles.lightMode : ''}`}>
                    <div className={styles.lobbyBox}>
                        <h2>Enter Lobby</h2>
                        <TextField 
                            id="outlined-basic" 
                            label="Username" 
                            value={username} 
                            onChange={e => setUsername(e.target.value)} 
                            variant="outlined"
                            // ✅ FIXED: Uses CSS variables to guarantee visibility in both modes
                            sx={{ 
                                "& .MuiOutlinedInput-root": { 
                                    color: 'var(--text-color)', 
                                    "& fieldset": { borderColor: 'var(--video-border)' }, 
                                },
                                "& .MuiInputLabel-root": { color: 'var(--text-color)', opacity: 0.7 },
                                "& .MuiInputBase-input": { color: 'var(--text-color)' } // Ensures typing is visible
                            }}
                        />
                        <Button variant="contained" onClick={connect}>Connect</Button>
                    </div>
                    <div style={{width: '300px', borderRadius: '10px', overflow: 'hidden'}}>
                        <video ref={localVideoref} autoPlay muted style={{width: '100%'}}></video>
                    </div>
                </div> :

                <div className={`${styles.meetVideoContainer} ${!isDarkMode ? styles.lightMode : ''}`}>
                    {showModal ? <div className={styles.chatRoom}>
                        <div className={styles.chatContainer}>
                            <h1>Chat</h1>
                            <div className={styles.chattingDisplay}>
                                {messages.length !== 0 ? messages.map((item, index) => {
                                    return (
                                        // ✅ FIXED: Conditional styles for Self vs Other
                                        <div 
                                            key={index} 
                                            className={`${styles.msgBlock} ${item.sender === username ? styles.selfMessage : styles.otherMessage}`}
                                        >
                                            <strong>{item.sender}</strong>
                                            <p>{item.data}</p>
                                        </div>
                                    )
                                }) : <p>No Messages Yet</p>}
                            </div>
                            <div className={styles.chattingArea}>
                                <TextField 
                                    value={message} 
                                    onChange={(e) => setMessage(e.target.value)} 
                                    id="outlined-basic" 
                                    label="Enter Your chat" 
                                    variant="outlined" 
                                    // ✅ FIXED: Uses CSS variables here too
                                    sx={{ 
                                        "& .MuiOutlinedInput-root": { 
                                            color: 'var(--text-color)', 
                                            "& fieldset": { borderColor: 'var(--video-border)' },
                                        },
                                        "& .MuiInputLabel-root": { color: 'var(--text-color)', opacity: 0.7 },
                                        "& .MuiInputBase-input": { color: 'var(--text-color)' },
                                        width: '100%'
                                    }}
                                />
                                <Button variant='contained' onClick={sendMessage}>Send</Button>
                            </div>
                        </div>
                    </div> : <></>}

                    <div className={styles.buttonContainers}>
                        <IconButton onClick={handleVideo} style={{ color: "white" }}>
                            {(video === true) ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                        <IconButton onClick={handleEndCall} style={{ color: "red" }} aria-label="End Call">
                            <CallEndIcon />
                        </IconButton>
                        <IconButton onClick={handleAudio} style={{ color: "white" }}>
                            {audio === true ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>
                        {screenAvailable === true ?
                            <IconButton onClick={handleScreen} style={{ color: "white" }}>
                                {screen === true ? <ScreenShareIcon /> : <StopScreenShareIcon />}
                            </IconButton> : <></>}
                        <Badge badgeContent={newMessages} max={999} color='orange'>
                            <IconButton onClick={() => setModal(!showModal)} style={{ color: "white" }}>
                                <ChatIcon />
                            </IconButton>
                        </Badge>
                        <IconButton onClick={() => setIsDarkMode(!isDarkMode)}>
                            {isDarkMode ? <LightModeIcon style={{color: 'white'}}/> : <DarkModeIcon />}
                        </IconButton>
                    </div>

                    {/* ✅ FLOATING VIDEO CONTAINER */}
                    <div className={styles.meetUserVideo}>
                        <video 
                            ref={localVideoref} 
                            autoPlay 
                            muted
                            // ✅ SIMPLIFIED: Just control visibility, don't remove it from DOM
                            style={{ 
                                display: video ? 'block' : 'none',
                                width: '100%',
                                height: '100%'
                            }}
                        ></video>
                        
                        {!video && (
                            <div style={{
                                width: '100%',
                                height: '100%',
                                backgroundColor: '#222', // Slightly lighter black for contrast
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                color: 'white'
                            }}>
                                <h6 style={{margin:0}}>Cam Off</h6>
                            </div>
                        )}
                    </div>

                    <div className={styles.conferenceView}>
                        {videos.map((video) => (
                            <div key={video.socketId}>
                                <video
                                    data-socket={video.socketId}
                                    ref={ref => {
                                        if (ref && video.stream) {
                                            ref.srcObject = video.stream;
                                        }
                                    }}
                                    autoPlay
                                >
                                </video>
                            </div>
                        ))}
                    </div>
                </div>
            }
        </div>
    )
}