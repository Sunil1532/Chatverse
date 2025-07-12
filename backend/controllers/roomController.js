import Room from '../models/Room.js';

export const createRoom=async(req,res)=>{
    const {name,isPrivate}=req.body;
    try{
        const room=await Room.create({
            name,
            isPrivate:isPrivate||false,
            members:[req.userId]
        });
        res.status(201).json(room);
    }
    catch(err){
        res.status(500).json({message:'Failed to create room'});
    }
};

export const getRooms = async (req, res) => {
    try {
      const rooms = await Room.find({
        $or: [
          { members: req.userId },     // rooms the user is part of
          { isPrivate: false }         // OR public rooms
        ]
      });
      res.json(rooms);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  };
  export const joinRoom = async (req, res) => {
    const { roomId } = req.params;
    try {
      const room = await Room.findById(roomId);
  
      if (!room) return res.status(404).json({ message: "Room not found" });
  
      // If already a member, do nothing
      if (!room.members.includes(req.userId)) {
        room.members.push(req.userId);
        await room.save();
      }
  
      res.json({ message: "Joined room", room });
    } catch (err) {
      res.status(500).json({ message: "Failed to join room" });
    }
  };
    