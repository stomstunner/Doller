import {asyncHandler} from "../utils/asynchandler.js"
// here we import the api error for error handlinng
import {ApiError} from "../utils/ApiError.js"

// now we want to check the user is already registered or not 

import { User } from "../models/user.models.js"

// import the upload on cloudinary mehtod from the utils 

import {uploadOnCloudinary} from "../utils/cloudinary.js"

// now we import the api response for sending the data
import { ApiResponse } from "../utils/ApiResponse.js"

// so here we register the user with the help of asynchandler = jo ki ek function aceept karta hai // it is an higher order fucntion( fucntion ke liye fucntion)


const registerUser = asyncHandler( async (req, res) =>{
    // res.status(200).json({
    //     message : "Doller app"
    // })

    // here we register the user 

    // steps 

    // 1 get the details of users from frontend 

    // 2 validations - not empty

    // 3 check if account already exits - username , email

    // 4 check for images , avatar

    // 5 upload the coverImage and `avatar` to the cloudinary - after that from cloudinary we get a response as a url 

    // 6 create user object- create entry in db

    // 7 after creating user we get the response but we dont want to send the password to the frontend so we remove the password from the response and then send the response to the frontend

    // 8 check for user creation 

    // 9 return response 

    

    const {fullName, username, password, email} = req.body

    console.log("Email: " , email );

    // now we validate the data
    // if(fullName === ""){
    //     // apierror expect to recive a status code and massage
    //     throw new ApiError(400, "FullName is Required")
    // }

    // so we have another method to check the multiple areas in a one go with the help of some and in the some we write a callbacke fucntion 

    if(
        [fullName, username, password, email].some((field) =>
            field?.trim() === ""
        )
    ){
        throw new ApiError(400, "All fields are required")
        
    }
    

    // now we can check the user existed or not we can use the findOne method for that ki hamara username available hai ya nahi databse me iske liye ham $or ka use kar sakte hai jisme ham array ke ander bahaut sare objects ko checks kar sakte hai 

    const existedUser = User.findOne({
        $or : [ { username }, { email }]
    })

    // if we have exited the username or email then we just have to throw the error
    if(existedUser){
        throw new ApiError(409, "The user with this email and the username is already present")
    }

    // so we have all the access of the data with req.body from express
    // such that we have some other access from the multer 

    // so here we firstly check ki hamare pass files hai bhi yaa nahi then ham apne avatar me janayenge aur 1st avatar ko lenge aur usko bhi chekc karne ke baad ham uske path ko lenge through multer .. jo hamne public/ temp me store kar ke rakha hai 
    
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // here we handle the images 

    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    // also we have to spacially check ki hamare pass avatar toh hona hi chahiye 

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }

    // now the next step is to upload it on the cloudinary with the help of uploadon cloudinary method jaha pe hame bass localfile ka path dena hota hai aur hame woha se ek url response me milta hai cloudinary se 

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400, "Avatar is required")
    }

    // now we want to create the user in the database

    // avatar filed me hame databse me bass avatar image ka url hi upload karna hai bass jo ki hame cloudinary se response me milta hai response me hame baht sare object milte hai, but we want the only avatar url to stored on the database 
    const user = await User.create({
        fullName,
        avatar : avatar.url,
        // for the coverimage we check here only ki hamre pass coverimage ka url hai ya nahi ager nahi hai toh ham empty hi rehne denge kyuki ye databse me required nahi hai but hame ek baar chek bhi karna hai ki url aaya hai ya nahi 

        coverImage : coverImage?.url || "",
        email,
        password, 
        username : username.toLowerCase()

    })

    // now we have to check ki hamra user create hua hai ya nahi ager hua hai toh hamre pass mongoDB se ek unique id generate hota hai whenever we store any entry 

    // also we do not wanted to select 2 filed password and  the refresstoken so we just have to write the select query in the end jisme hame jo jo field selecte nahi karna hai usse in the string me likhn denge with the minus sign
    const createdUser = await User.findById(user._id).select("-password -refressToken")

    if(!createdUser){
        throw new ApiError(500, "something went wrong while registring the user ")
    }

    // now we want to send the apiresponse 
    return res.status(201).json(
        // here we send the api response in a strusctured way because we already write how we want to send the response 
        new ApiResponse(200, createdUser, "User registered successfully ")
    )



})

export {registerUser}