import mongoose from "mongoose";

export default async function connectDB(){
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Mongodb connected');
    }
    catch(err){
        console.log('ERROR',err.message);
        process.exit(1);
    }
}