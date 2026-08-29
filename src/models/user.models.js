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
        fullName:{
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

// so just like the plugin we use the `pre` hook ki jaisse hi hamar data save hone hi wala ho tab tum ye operation perform karna 

// iska matlab hai ki jaisse hi ham userSchema se save karne wale ho usse pahle hai ye task perform kare

// and the thing is ki ham yaha pe ek callback function dete toh hai but callback function me hamare pass this ka acces nahi hota hai iske liye ham fucntion ka use karte hai == async fucntion ka use karte hai kyuki ham password decrypt karne me thoda time lag sakta hai 
userSchema.pre("save", async function(){
    // also we will check ki hamara password tabhi bycrypt hoga jab hamara password modified hoga na ki har baar 
    if(!this.isModified("password")){
        // return next();
        return ;
    }
    // iska matlab hua ki hamre password ko bcrypt kar do hash of 10 times 
    this.password = await bcrypt.hash(this.password, 10);
    // next();
} )


// now we will check ki hamara password correct hai ki nahi 
// usko check karne ke liye hame dekhna parega ki hamara jo password hai woh toh encrypted hai and usko hame decrypt kar ke check karna parega 

// so we have the feature ki ham userSchema ka use kar ke khud ka method bana sakte hai then usko check kar sakte hai ki woh chal raha hai ya nahi 

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)

    // so the bcrypt.compare takes the two things first one is the string that is comes from the user and the 2nd one is the encrypted password jo ki hamare pass yaha this se aayega
}


// lets create the access token generator 

userSchema.methods.generateAccessToken = function(){
    // in the jwt we have the sign method jo ki genrate karta hai tokens ko jwt token isko ham apne databse se id username and other ddata dete hai toh ye genrate karta hai 

    // sabse pahle ham isko denge apna payload ki kya kya information aap rakh sakte ho 

    // so at the last we have to return the jwt response isse ham varible me rakh ke ya aisse hi return kar sakte hai
    return jwt.sign(
        {
            _id : this._id,
            email : this.email,
            username : this.username,
            fullname : this.fullname
        },
        // then it takes the access token jo hame .env file me rakha hua hai 
        process.env.ACCESS_TOKEN_SECRET,
        // then we need the epiry ka token but woh hame object me bana ke deni parti hai 
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

// and we make the generate refress token 
// jo ki as it is generateAccessToken jsisa hi hota hai

userSchema.methods.generateRefressToken = function(){
    return jwt.sign(
        {
            _id : this._id,
            // email : this.email,
            // username : this.username,
            // fullname : this.fullname
        },
        // then it takes the access token jo hame .env file me rakha hua hai 
        process.env.REFRESH_TOKEN_SECRET,
        // then we need the epiry ka token but woh hame object me bana ke deni parti hai 
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema)