import Message from './models/Message.js';
import Room from './models/Room.js';
import { verifySocketJWT } from '../middlewares/auth.js';
import User from './models/User.js'; // Required to get username if needed

io.use((socket, next) => {
  verifySocketJWT(socket, next); // Attach userId and maybe username
});

io.on('connection', (socket) => {
  console.log('✅ New socket connected:', socket.id);

  socket.on('joinRoom', async ({ roomId }) => {
    socket.join(roomId);
    console.log(`User ${socket.userId} joined room ${roomId}`);
  
    const room = await Room.findById(roomId);
    if (!room.members.includes(socket.userId)) {
      room.members.push(socket.userId);
      await room.save();
    }
  });

  socket.on('chatMessage', async ({ roomId, text }) => {
    console.log("📥 Received chatMessage:", text, "from user", socket.userId);
    const message = await Message.create({
      room: roomId,
      sender: socket.userId,
      text,
    });

    io.to(roomId).emit('newMessage', {
      _id: message._id,
      room: message.room,
      sender: {
        _id: socket.userId,
        username: socket.username || 'User',
      },
      text: message.text,
      createdAt: message.createdAt,
    });
  });

  // ✅ Typing indicator logic
  socket.on('typing', ({ roomId }) => {
    socket.to(roomId).emit('showTyping', {
      username: socket.username || 'Someone',
    });
  });

  socket.on('stopTyping', ({ roomId }) => {
    socket.to(roomId).emit('hideTyping');
  });

  socket.on('disconnect', () => {
    console.log(`🔌 socket disconnected: ${socket.id}`);
  });
});
