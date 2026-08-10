// for the env file we have to wrrite the all env variable top of the file jisse hamara variables sabse pahale sabhi jaagah chala jaye 

// require('dotenv').config({path: './env'})

// require('dotenv').config({path: './env'}) = iska hamlab hua ki hamre root directory se hi env file kp laao but ye consistancy ko bigar raha hai 

// now we are going to connect out db 
// import mongoose from "mongoose";
// import { DB_NAME } from "./constants";

import dotenv from "dotenv";
import connectDB from "./db/index.js";
dotenv.config({
    path:"./env"
})
connectDB()



//#region 
/*
// now for connection we jsut make a connect funtion and execute that connect funtion but the better approach it ki ham iffi use kare 
// matlab function likha aur usko wohi pe call kar diya 

// and we use the asynce await for the fucntion also and we can use the iffi start with semicolor kyuki kabhi kabhi ham uper ke lines me bhul jate hai semicolon

(async ()=>{
    try {
        // now we conntect the databse with the help og mongoose 
        // and the dabtabse name bhi after a slash ke baad 
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

        // now in the professional code we make sure ki hamara db connect hone ke badd express baat kar pa rha ho hamre db se 

        app.on("error",(error)=>{
            console.log("error",error);
            throw error
        })

        // and ager connect ho hi gaya hai toh listen bhi kar lo 

        app.listen(process.env.PORT,()=>{
            console.log(`App is listining on port ${process.env.PORT}`);
            
        })

    } catch (error) {
        console.error("error!!!", error);
        throw error;
    }
})()

*/
//#endregion