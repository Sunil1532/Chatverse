import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ✅ Replaced localhost with Render deployment URL
const BASE_URL = 'https://chatverse-8ka6.onrender.com/api/rooms';

export default function RoomPage() {
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState('');
  const [joinedRoomIds, setJoinedRoomIds] = useState([]);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  const fetchRooms = async () => {
    try {
      const res = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRooms(data);

      // collect IDs of joined rooms
      const userId = JSON.parse(atob(token.split('.')[1]))?.id;
      const joined = data
        .filter((room) =>
          room.members?.some((m) => m === userId || m._id === userId)
        )
        .map((r) => r._id);
      setJoinedRoomIds(joined);
    } catch {
      setError('Failed to load rooms');
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!roomName.trim()) return setError('Room name is required');
    setError('');
    try {
      const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: roomName, isPrivate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setRooms((prev) => [...prev, data]);
      setRoomName('');
      setIsPrivate(false);
    } catch (err) {
      setError(err.message || 'Room creation failed');
    }
  };

  const handleJoinRoom = async (roomId) => {
    try {
      await fetch(`${BASE_URL}/join/${roomId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRooms(); // refresh list
    } catch {
      alert('Failed to join room');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-purple-600 via-pink-500 to-red-400 p-6 text-white">
      <div className="max-w-md mx-auto bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-lg">
        <h2 className="text-3xl font-bold mb-6 text-center">Create Chat Room</h2>
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <input
            type="text"
            placeholder="Room name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/70"
          />
          <label className="flex items-center text-sm space-x-2">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
            <span>Private Room</span>
          </label>
          <button className="w-full bg-yellow-300 text-purple-900 py-2 rounded hover:scale-[1.01] transition">
            Create Room
          </button>
          {error && <p className="text-red-200 text-sm">{error}</p>}
        </form>
      </div>

      <div className="max-w-md mx-auto mt-10">
        <h3 className="text-2xl font-semibold mb-4 text-center">Available Rooms</h3>
        <ul className="space-y-3">
          {rooms.map((room) => {
            const joined = joinedRoomIds.includes(room._id);
            return (
              <li
                key={room._id}
                className="bg-white/20 p-4 rounded-xl shadow hover:bg-white/30 backdrop-blur-sm"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{room.name}</span>
                  <div className="flex gap-2 items-center">
                    <span>{room.isPrivate ? '🔒' : '🌐'}</span>
                    {!joined ? (
                      <button
                        className="bg-yellow-300 text-purple-800 px-3 py-1 rounded text-sm"
                        onClick={() => handleJoinRoom(room._id)}
                      >
                        Join
                      </button>
                    ) : (
                      <button
                        className="bg-white text-purple-800 px-3 py-1 rounded text-sm"
                        onClick={() => navigate(`/chat/${room._id}`)}
                      >
                        Chat
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
