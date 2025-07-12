import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

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

  useEffect(() => {
    const s = io(SOCKET_URL, { auth: { token } });

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

    setSocket(s);
    return () => s.disconnect();
  }, [roomId, token]);

  useEffect(() => {
    const fetchMessages = async () => {
      const res = await fetch(`${SOCKET_URL}/api/rooms/${roomId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMessages(data);
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

      const res = await fetch(`${SOCKET_URL}/api/upload`, {
        method: 'POST',
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

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-500 text-white">
      <header className="bg-white/10 backdrop-blur-sm p-4 text-xl font-semibold text-center">
        🗨️ Chatting as <span className="text-yellow-300">{currentUser?.username || 'You'}</span>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {typingUser && (
          <div className="italic text-white/80 animate-pulse">{typingUser} is typing...</div>
        )}

        {messages.map((msg, i) => {
          const sender = msg.sender || {};
          const senderId = typeof sender === 'object' ? sender._id : sender;
          const username = typeof sender === 'object' ? sender.username : 'User';

          const isSelf = String(senderId) === String(currentUser?.id || currentUser?._id);
          const isImage = msg.file?.match(/\.(jpg|jpeg|png|gif)$/i);

          return (
            <div key={msg._id || i} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-xs relative group">
                {!isSelf && (
                  <div className="text-xs text-white/70 font-semibold mb-1">
                    {username}
                  </div>
                )}
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
                          src={SOCKET_URL + msg.file}
                          alt="uploaded"
                          className="rounded max-w-[200px]"
                        />
                      ) : (
                        <a
                          href={SOCKET_URL + msg.file}
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
                    className="absolute -top-2 -right-2 bg-red-500 text-xs px-2 py-0.5 rounded-full shadow-lg hidden group-hover:block"
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

      <form
  onSubmit={handleSend}
  className="p-4 flex gap-2 bg-white/10 backdrop-blur-sm border-t border-white/20 items-center"
>
  <input
    value={newMsg}
    onChange={handleChange}
    placeholder="Type a message..."
    className="flex-1 bg-white/20 placeholder-white/70 text-white p-2 rounded-lg focus:outline-none"
  />

  {/* File Upload Button with + icon */}
  <label className="relative cursor-pointer bg-white/20 text-white px-3 py-2 rounded-lg hover:bg-white/30 transition">
    <span className="text-lg font-bold">+</span>
    <input
      type="file"
      onChange={handleFileChange}
      className="absolute inset-0 opacity-0 cursor-pointer"
    />
  </label>

  <button className="bg-yellow-300 text-purple-800 px-4 rounded-lg font-semibold hover:scale-105 transition">
    Send
  </button>
</form>

    </div>
  );
}
