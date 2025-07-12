import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    default: '' // no longer required
  },
  file: {
    type: String,
    default: null
  }
}, { timestamps: true });

export default mongoose.model('Message', MessageSchema);
