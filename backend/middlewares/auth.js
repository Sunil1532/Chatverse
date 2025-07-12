import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const verifySocketJWT = async (socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) return next(new Error('Not authorized'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;

    // ✅ Attach username to socket
    const user = await User.findById(decoded.id).select('username');
    socket.username = user?.username || 'User';

    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
};
