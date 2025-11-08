import Message from './models/Message.js';
import Room from './models/Room.js';
import { verifySocketJWT } from './middlewares/auth.js';
import User from './models/User.js';

export default function socketHandler(io) {
  io.use((socket, next) => {
    verifySocketJWT(socket, next); // attaches socket.userId
  });

  io.on('connection', async (socket) => {
    console.log('✅ New socket connected:', socket.id);

    // ✅✅ Mark user online instantly
    await User.findByIdAndUpdate(socket.userId, {
      online: true,
      lastSeen: new Date()
    });

    // ✅ Notify all frontend clients
    io.emit('userStatus', {
      userId: socket.userId,
      online: true,
      lastSeen: new Date()
    });

    // Join room
    socket.on('joinRoom', async ({ roomId }) => {
      try {
        socket.join(roomId);
        console.log(`User ${socket.userId} joined room ${roomId}`);

        const user = await User.findById(socket.userId);
        socket.username = user?.username || 'User';

        const room = await Room.findById(roomId);
        if (room && !room.members.includes(socket.userId)) {
          room.members.push(socket.userId);
          await room.save();
        }
      } catch (err) {
        console.error('❌ joinRoom error:', err);
      }
    });

    // Handle chat message
    socket.on('chatMessage', async ({ roomId, text, file }) => {
      try {
        console.log("📥 Received chatMessage:", text, "with file:", file, "from user", socket.userId);

        const user = await User.findById(socket.userId);

        const message = await Message.create({
          room: roomId,
          sender: socket.userId,
          text: text || '',
          file: file || null,
        });

        io.to(roomId).emit('newMessage', {
          _id: message._id,
          room: message.room,
          sender: {
            _id: user._id,
            username: user.username || 'User',
          },
          text: message.text,
          file: message.file || null,
          createdAt: message.createdAt,
        });
      } catch (err) {
        console.error('❌ chatMessage error:', err);
      }
    });

    // Typing indicators
    socket.on('typing', ({ roomId }) => {
      socket.to(roomId).emit('showTyping', {
        username: socket.username || 'Someone',
      });
    });

    socket.on('stopTyping', ({ roomId }) => {
      socket.to(roomId).emit('hideTyping');
    });

    // Delete message
    socket.on('deleteMessage', async ({ messageId, roomId }) => {
      try {
        await Message.findByIdAndDelete(messageId);
        io.to(roomId).emit('messageDeleted', { messageId });
      } catch (err) {
        console.error('❌ deleteMessage error:', err.message);
      }
    });

    // WebRTC signaling
    socket.on('joinCall', async ({ roomId }) => {
      try {
        const callRoom = `call_${roomId}`;
        socket.join(callRoom);

        const clients = Array.from(io.sockets.adapter.rooms.get(callRoom) || []);
        const otherClients = clients.filter(id => id !== socket.id);

        socket.emit('all-call-users', otherClients);
        socket.to(callRoom).emit('user-joined-call', { socketId: socket.id });
      } catch (err) {
        console.error('❌ joinCall error:', err);
      }
    });

    socket.on('signal', ({ to, from, signal }) => {
      if (!to) return;
      io.to(to).emit('signal', { from, signal });
    });

    socket.on('leaveCall', ({ roomId }) => {
      try {
        const callRoom = `call_${roomId}`;
        socket.leave(callRoom);
        socket.to(callRoom).emit('user-left-call', { socketId: socket.id });
      } catch (err) {
        console.error('❌ leaveCall error:', err);
      }
    });

    // ✅✅ UPDATED disconnect handler
    socket.on('disconnect', async () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);

      // ✅ Update status in DB
      await User.findByIdAndUpdate(socket.userId, {
        online: false,
        lastSeen: new Date()
      });

      // ✅ Notify all frontend clients
      io.emit('userStatus', {
        userId: socket.userId,
        online: false,
        lastSeen: new Date()
      });

      // Notify call rooms
      socket.rooms.forEach((r) => {
        if (typeof r === 'string' && r.startsWith('call_')) {
          socket.to(r).emit('user-left-call', { socketId: socket.id });
        }
      });
    });
  });
}
