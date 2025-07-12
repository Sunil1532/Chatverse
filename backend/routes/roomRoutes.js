import express from 'express';
import { createRoom, getRooms,joinRoom } from '../controllers/roomController.js';
import { protect } from '../middlewares/auth.js';
import Message from '../models/Message.js';

const router = express.Router();

// Create a new chat room
router.post('/', protect, createRoom);

// Get all rooms for logged-in user
router.get('/', protect, getRooms);

// Get messages of a room
router.get('/:roomId/messages', protect, async (req, res) => {
  const { roomId } = req.params;

  try {
    const messages = await Message.find({ room: roomId })
      .populate('sender', 'username') // Just get sender's username
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});
router.post('/join/:roomId', protect, joinRoom);
export default router;
