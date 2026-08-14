import mongoose , {Schema}from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema = new Schema(
    {
        username:{
            type:String,
            required : true,
            unique : true,
            lowercase : true,
            trim : true,
            index : true,
        },
        email:{
            type:String,
            required : true,
            unique : true,
            lowercase : true,
            trim : true,
        },
        fullname:{
            type:String,
            required : true,
            trim : true,
            index : true,
        },
        avatar:{
            type: String, // from cloudinery
            required : true 
        },
        coverImage:{
            type: String
        },
        watchHistory:[
            {
                type: Schema.Types.ObjectId,
                ref : "Video"
            }
        ],
        password:{
            type:String, // we store password in the database in the form of encryption TODO:
            required : [true, "Password is required "]
            // this is just a massage ki true rakho nahi toh massage do 
        },
        refressToken:{
            type: String,
        }
    },
    {
        // here we write the created at with the help of 2nd object = timestamps
        timestamps:true  
    }
)

export const User = mongoose.model("User", userSchema)