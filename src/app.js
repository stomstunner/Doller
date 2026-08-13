// now we import the express 

import express from "express";
// now we import the cors 
import cors from "cors"
// and the cookieparser
import cookieParser from "cookie-parser";

const app = express();

// we use the cors to give the acces to the valid authenticator 

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true

}))
// for using the cors we just have to use the app.use method = for using the middlewares 
// and the cors accesps the objects // we can configure the setting of cors 

//so hamare pass data kabhi kabhi json se data aayega , body me data aayega form se aayega direct json aayega aur kabhi kabhi url se data aayega toh sab ko handle kaisse karte hai 

// so we have to set the middlewares or configurations
app.use(express.json({limit:"16kb"}));
//now we have some encoder for the url ke liye like ager space hai toh %20 laga do something like this 
app.use(express.urlencoded({extended:true, limit: "16kb"}))

//now we make a folder that store something such image or pdf public

app.use(express.static("public"))
// something we have to check or set the cookie of browers in a secure way only server can read that that 
app.use(cookieParser())




export {app}