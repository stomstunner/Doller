import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async ()=> {
    try {
        // we can storre the connection in a variable it gives us a process instance 

        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

        console.log(`\n MongoDb Connected !! DB HOST: ${connectionInstance.connection.host}`);
        
    } catch (error) {
        console.error("ERROR in mongodb!!!!",error);
        // throw error
        // we can exit the code with the help of process.exit that is given by the node js 
        process.exit(1);
    }
}

export default connectDB