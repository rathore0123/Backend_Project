import dotenv from "dotenv"
import connectDB from "./db/index.js"
import app from './app.js'

dotenv.config({
    path: "./.env"
})

connectDB().then(() =>{
    app.on("error", (error) =>{
        console.log(error);
        throw error
    })
    app.listen(process.env.PORT || 4000, () =>{
        console.log(`Server in running on port ${process.env.PORT}`);
    })
    
})
.catch((error) =>{
    console.log(`MongoDB Connection FAILED, ERROR: ${error}`); 
})