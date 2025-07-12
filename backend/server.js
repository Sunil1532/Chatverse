import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import uploadRoutes from './routes/uploads.js';

import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import User from './models/User.js';
import socketHandler from './socket.js'; // ✅ ADD THIS

dotenv.config();
connectDB();

User.deleteMany({ username: null })
  .then(async () => {
    const indexes = await User.collection.indexes();
    const badIndex = indexes.find(idx => idx.name === 'Username_1');
    if (badIndex) {
      await User.collection.dropIndex('Username_1');
    }
  })
  .catch(err => console.error("DB cleanup error:", err));

const app = express();
app.use(express.json());
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/uploads', express.static('uploads')); // Serve files
app.use('/api', uploadRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    credentials: true
  }
});

// ✅ Now use the socket handler!
socketHandler(io);
app.get('/', (req, res) => {
  res.send('✅ ChatVerse Backend is running!');
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
