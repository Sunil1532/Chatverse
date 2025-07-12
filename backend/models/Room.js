import mongoose from 'mongoose';

const RoomSchema=new mongoose.Schema({
    name:{type:String,required:true},
    isPrivate:{type:Boolean,default:false},
    members:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}]
},{timestamps:true});

export default mongoose.model('Room',RoomSchema);
