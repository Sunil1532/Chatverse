// backend/socket.js

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

    // Join room
    socket.on('joinRoom', async ({ roomId }) => {
      try {
        socket.join(roomId);
        console.log(`User ${socket.userId} joined room ${roomId}`);

        // Fetch and store username on the socket
        const user = await User.findById(socket.userId);
        socket.username = user?.username || 'User';

        // Add user to room members if not already
        const room = await Room.findById(roomId);
        if (room && !room.members.includes(socket.userId)) {
          room.members.push(socket.userId);
          await room.save();
        }
      } catch (err) {
        console.error('❌ joinRoom error:', err);
      }
    });

    // Handle chat message (text + optional file)
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

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
}
