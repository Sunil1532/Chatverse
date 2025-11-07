import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { FaPhone, FaVideo, FaTimes, FaMicrophoneSlash, FaMicrophone, FaStopCircle, FaVideoSlash } from 'react-icons/fa';

// ✅ Backend URLs
const API_BASE_URL = 'https://chatverse-8ka6.onrender.com';
const SOCKET_URL = 'https://chatverse-8ka6.onrender.com';

export default function ChatPage() {
  const { roomId } = useParams();
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [file, setFile] = useState(null);
  const [typingUser, setTypingUser] = useState(null);
  const messagesEndRef = useRef();
  const token = localStorage.getItem('token');

  const currentUser = useMemo(() => {
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      return decoded;
    } catch {
      return null;
    }
  }, [token]);

  /***** ==== CALL / WEBRTC STATE ==== *****/
  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [inCall, setInCall] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [showCallPopup, setShowCallPopup] = useState(false);
  const [callMode, setCallMode] = useState('video');

  // ✅ ✅ ✅ TURN SERVER ADDED HERE
  const RTC_CONFIG = {
  iceServers: [
    { urls: import.meta.env.VITE_STUN_URL },
    {
      urls: import.meta.env.VITE_TURN_URL_80,
      username: import.meta.env.VITE_TURN_USERNAME,
      credential: import.meta.env.VITE_TURN_CREDENTIAL,
    },
    {
      urls: import.meta.env.VITE_TURN_URL_80_TCP,
      username: import.meta.env.VITE_TURN_USERNAME,
      credential: import.meta.env.VITE_TURN_CREDENTIAL,
    },
    {
      urls: import.meta.env.VITE_TURN_URL_443,
      username: import.meta.env.VITE_TURN_USERNAME,
      credential: import.meta.env.VITE_TURN_CREDENTIAL,
    },
    {
      urls: import.meta.env.VITE_TURN_URL_443_TCP,
      username: import.meta.env.VITE_TURN_USERNAME,
      credential: import.meta.env.VITE_TURN_CREDENTIAL,
    },
  ],
};

  /***** ==== SOCKET + CHAT ==== *****/
  useEffect(() => {
    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    s.on('connect', () => {
      s.emit('joinRoom', { roomId });
    });

    s.on('newMessage', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    s.on('showTyping', ({ username }) => setTypingUser(username));
    s.on('hideTyping', () => setTypingUser(null));

    s.on('messageDeleted', ({ messageId }) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    });

    // ✅ WebRTC signaling
    s.on('all-call-users', (users) => {
      for (const id of users) createOffer(id, s);
    });

    s.on('signal', async ({ from, signal }) => {
      await handleSignal(from, signal);
    });

    s.on('user-joined-call', ({ socketId }) => {
      setTimeout(() => createOffer(socketId, s), 300);
    });

    s.on('user-left-call', ({ socketId }) => {
      cleanupPeer(socketId);
    });

    setSocket(s);

    return () => {
      try { s.disconnect(); } catch {}
    };
  }, [roomId, token]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setMessages(data);
      } catch (err) {
        console.error('Failed to load messages', err);
      }
    };
    fetchMessages();
  }, [roomId, token]);

  const handleChange = (e) => {
    setNewMsg(e.target.value);
    if (socket) {
      socket.emit('typing', { roomId });
      clearTimeout(window.typingTimeout);
      window.typingTimeout = setTimeout(() => {
        socket.emit('stopTyping', { roomId });
      }, 1000);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() && !file) return;

    let fileUrl = null;

    if (file) {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      fileUrl = data.url;
    }

    socket.emit('chatMessage', {
      roomId,
      text: newMsg,
      file: fileUrl,
    });

    setNewMsg('');
    setFile(null);
  };

  const handleDeleteMessage = (messageId) => {
    socket.emit('deleteMessage', { messageId, roomId });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /***** ==== WEBRTC CORE ==== *****/

  const getLocalMedia = async (wantVideo = true) => {
    try {
      if (localStreamRef.current) {
        if (!wantVideo)
          localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = false));
        else
          localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = true));

        return localStreamRef.current;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: wantVideo,
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      setIsAudioEnabled(stream.getAudioTracks()[0]?.enabled ?? true);
      setIsVideoEnabled(stream.getVideoTracks()[0]?.enabled ?? true);

      return stream;
    } catch (err) {
      console.error('getUserMedia error', err);
      throw err;
    }
  };

  const createPeer = (socketId) => {
    if (peersRef.current[socketId]) return peersRef.current[socketId].pc;

    const pc = new RTCPeerConnection(RTC_CONFIG);
    const remoteStream = new MediaStream();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) =>
        pc.addTrack(track, localStreamRef.current)
      );
    }

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((t) => remoteStream.addTrack(t));
      setRemoteStreams((prev) => ({ ...prev, [socketId]: remoteStream }));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('signal', {
          to: socketId,
          from: socket.id,
          signal: { type: 'ice', candidate: event.candidate },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState))
        cleanupPeer(socketId);
    };

    peersRef.current[socketId] = { pc, remoteStream };
    return pc;
  };

  const createOffer = async (socketId, s = socket) => {
    try {
      await getLocalMedia(callMode === 'video');
      const pc = createPeer(socketId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      s.emit('signal', {
        to: socketId,
        from: s.id,
        signal: { type: 'offer', sdp: offer },
      });
    } catch (err) {
      console.error('createOffer error', err);
    }
  };

  const handleSignal = async (from, signal) => {
    try {
      if (signal.type === 'ice') {
        const entry = peersRef.current[from];
        if (entry?.pc) await entry.pc.addIceCandidate(signal.candidate).catch(() => {});
        return;
      }

      if (signal.type === 'offer') {
        await getLocalMedia(callMode === 'video');
        const pc = createPeer(from);
        await pc.setRemoteDescription(signal.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('signal', {
          to: from,
          from: socket.id,
          signal: { type: 'answer', sdp: answer },
        });
        return;
      }

      if (signal.type === 'answer') {
        const entry = peersRef.current[from];
        if (entry?.pc) await entry.pc.setRemoteDescription(signal.sdp);
      }
    } catch (err) {
      console.error('handleSignal error', err);
    }
  };

  const cleanupPeer = (socketId) => {
    const entry = peersRef.current[socketId];
    if (!entry) return;

    try {
      entry.pc.close();
    } catch {}

    delete peersRef.current[socketId];

    setRemoteStreams((prev) => {
      const copy = { ...prev };
      delete copy[socketId];
      return copy;
    });
  };

  const joinCall = async (mode = 'video') => {
    if (!socket) return alert('No connection');
    setCallMode(mode);

    try {
      await getLocalMedia(mode === 'video');
      socket.emit('joinCall', { roomId });
      setInCall(true);
      setShowCallPopup(true);
    } catch {
      alert('Camera/mic blocked');
    }
  };

  const leaveCall = () => {
    socket.emit('leaveCall', { roomId });

    Object.keys(peersRef.current).forEach((id) => {
      try {
        peersRef.current[id].pc.close();
      } catch {}
    });

    peersRef.current = {};

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    setLocalStream(null);
    setRemoteStreams({});
    setInCall(false);
    setShowCallPopup(false);
  };

  const toggleAudio = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
      setIsAudioEnabled(t.enabled);
    });
  };

  const toggleVideo = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
      setIsVideoEnabled(t.enabled);
    });
  };

  /***** ==== UI RENDER ==== *****/
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-500 text-white">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm p-4 text-xl font-semibold flex justify-between items-center">
        <div>
          🗨️ Chatting as <span className="text-yellow-300">{currentUser?.username || 'You'}</span>
        </div>

        <div className="flex gap-4 text-2xl items-center">
          <button onClick={() => joinCall('audio')} className="p-2 hover:bg-white/10 rounded">
            <FaPhone />
          </button>
          <button onClick={() => joinCall('video')} className="p-2 hover:bg-white/10 rounded">
            <FaVideo />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {typingUser && (
          <div className="italic text-white/80 animate-pulse">{typingUser} is typing...</div>
        )}

        {messages.map((msg, i) => {
          const sender = msg.sender || {};
          const senderId = sender._id;
          const username = sender.username;

          const isSelf = String(senderId) === String(currentUser?.id || currentUser?._id);
          const isImage = msg.file?.match(/\.(jpg|jpeg|png|gif)$/i);

          return (
            <div key={msg._id || i} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-xs relative group">
                {!isSelf && <div className="text-xs text-white/70 font-semibold mb-1">{username}</div>}

                <div
                  className={`p-3 rounded-xl shadow-md break-words ${
                    isSelf
                      ? 'bg-yellow-300 text-gray-900 rounded-br-none'
                      : 'bg-white/20 text-white rounded-bl-none'
                  }`}
                >
                  {msg.text && <div>{msg.text}</div>}
                  {msg.file && (
                    <div className="mt-2">
                      {isImage ? (
                        <img
                          src={API_BASE_URL + msg.file}
                          alt="uploaded"
                          className="rounded max-w-[200px]"
                        />
                      ) : (
                        <a
                          href={API_BASE_URL + msg.file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-300 underline"
                        >
                          📎 Download File
                        </a>
                      )}
                    </div>
                  )}
                  <div className="text-right text-xs mt-1 text-white/60">
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ''}
                  </div>
                </div>

                {isSelf && (
                  <button
                    onClick={() => handleDeleteMessage(msg._id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-xs px-2 py-0.5 rounded-full hidden group-hover:block"
                    title="Delete message"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef}></div>
      </div>

      {/* Message input */}
      <form
        onSubmit={handleSend}
        className="p-4 flex gap-2 bg-white/10 border-t border-white/20 items-center"
      >
        <input
          value={newMsg}
          onChange={handleChange}
          placeholder="Type a message..."
          className="flex-1 bg-white/20 placeholder-white/70 text-white p-2 rounded-lg"
        />

        <label className="relative cursor-pointer bg-white/20 text-white px-3 py-2 rounded-lg">
          <span className="text-lg font-bold">+</span>
          <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0" />
        </label>

        <button className="bg-yellow-300 text-purple-800 px-4 rounded-lg font-semibold">
          Send
        </button>
      </form>

      {/* CALL POPUP */}
      {showCallPopup && (
        <div className="fixed right-6 bottom-24 z-50 w-[460px] h-[360px] bg-black/80 border border-white/20 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="text-sm font-semibold">{inCall ? 'In Call' : 'Call Preview'}</div>
              <div className="text-xs text-white/60">{callMode === 'video' ? 'Video' : 'Audio'}</div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={toggleAudio} className="p-2">
                {isAudioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
              </button>
              <button onClick={toggleVideo} className="p-2">
                {isVideoEnabled ? <FaVideo /> : <FaVideoSlash />}
              </button>
              <button onClick={leaveCall} className="p-2 bg-red-600 rounded text-white ml-2">
                <FaStopCircle />
              </button>
              <button onClick={() => setShowCallPopup(false)} className="p-2">
                <FaTimes />
              </button>
            </div>
          </div>

          <div className="p-3 h-[calc(100%-64px)] grid grid-cols-2 gap-3 overflow-auto">
            {/* Local stream */}
            <div className="bg-black rounded flex flex-col overflow-hidden">
              <div className="flex-1">
                {localStream ? (
                  <video
                    className="w-full h-full object-cover"
                    ref={(el) => el && (el.srcObject = localStream)}
                    autoPlay
                    playsInline
                    muted
                  />
                ) : (
                  <div className="w-full h-40 flex items-center justify-center text-white/60">
                    No camera
                  </div>
                )}
              </div>
              <div className="p-2 text-xs text-center bg-black/50">You</div>
            </div>

            {/* Remote peers */}
            {Object.keys(remoteStreams).length === 0 ? (
              <div className="bg-black rounded flex items-center justify-center text-white/60">
                No peers yet
              </div>
            ) : (
              Object.entries(remoteStreams).map(([id, stream]) => (
                <div key={id} className="bg-black rounded flex flex-col overflow-hidden">
                  <div className="flex-1">
                    <video
                      className="w-full h-full object-cover"
                      ref={(el) => el && (el.srcObject = stream)}
                      autoPlay
                      playsInline
                    />
                  </div>
                  <div className="p-2 text-xs text-center bg-black/50">{id.slice(0, 6)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
