import mongoose from "mongoose";
 
import { DB_NAME } from "../constants.js"

async function connectDB(){
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`MongoDB connected Succesfully, DB HOST: ${connectionInstance.connection.host} `);
        
    } catch (error) {
        console.log(`DB Connection FAILED, ERROR: ${error}`);
        
    }
}

export default connectDB;