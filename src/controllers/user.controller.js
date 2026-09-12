import {asyncHandler} from "../utils/asynchandler.js"
// here we import the api error for error handlinng
import {ApiError} from "../utils/ApiError.js"

// now we want to check the user is already registered or not 

import { User } from "../models/user.models.js"

// import the upload on cloudinary mehtod from the utils 

import {uploadOnCloudinary} from "../utils/cloudinary.js"

// now we import the api response for sending the data
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt  from "jsonwebtoken"

// so here we register the user with the help of asynchandler = jo ki ek function aceept karta hai // it is an higher order fucntion( fucntion ke liye fucntion)


// here we make the generateaccessandrefresshtoken 
const generateAccessAndRefressTokens = async(userId)=>{
    try {
        // sabse pahle hame user ko find karna parega uska token generate karne ke liye 
        const user = await User.findById(userId)

        // lets hold the access and refress token from the user models 

        const accessToken = user.generateAccessToken()
        const refressToken = user.generateRefressToken()

        // now jo hamra refress token hota hai woh user ke saath saath database me bhi present hota hai , but hamra access token har baar request ke saath jata hai aur woh user ke pass hota hai 

        // so hame refresstoken ko database me save kar ke rakhna hai 

        // uske liye ham `user` ka help lenge kyuki uske ander sara document present hai 

        user.refressToken = refressToken
        await user.save({validateBeforeSave : false})
        // so user.save() method use karne se hamra mongoose ka code active ho jata hai aur woh validation bhi mangata hai ki like password dalo , username daalo but hame yaha koi vlaidation nahi karna hai bass save karna hai , await because we are talking with databse 

        return {accessToken, refressToken}


    } catch (error) {
        throw new ApiError(500, "Something is wrong while generating the access and refress tokens")
    }
}

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

    // console.log("Email: " , email );

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

    const existedUser = await User.findOne({
        $or : [ { username }, { email }]
    })

    // if we have exited the username or email then we just have to throw the error
    if(existedUser){
        throw new ApiError(409, "The user with this email and the username is already present")
    }

    // console.log(req.files);
    

    // so we have all the access of the data with req.body from express
    // such that we have some other access from the multer 

    // so here we firstly check ki hamare pass files hai bhi yaa nahi then ham apne avatar me janayenge aur 1st avatar ko lenge aur usko bhi chekc karne ke baad ham uske path ko lenge through multer .. jo hamne public/ temp me store kar ke rakha hai 
    
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // here we handle the images 

    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    // also we have to spacially check ki hamare pass avatar toh hona hi chahiye 

    // now we check the coverimage with the classic method
    let coverImageLocalPath;
    if( req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0 ){
        // now we know ki hamre pass cover image hai hi hai

        coverImageLocalPath = req.files.coverImage[0].path
    }

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

// lets create the login user
const loginUser = asyncHandler( async(req,res ) => {
    // Chaliye login ke steps samajhte hain:
    // 1. Request body se user ka login data (username/email aur password) lena.
    // 2. User ka username ya email identify karna.
    // 3. Database me us user ko find karna.
    // 4. Diya gaya password sahi hai ya nahi, ye check karna.
    // 5. Login successful hone par access token aur refresh token banana.
    // 6. Tokens ko secure cookies ke through client ko bhejna.

    const {email, username, password} = req.body

    if(!username && !email){
        throw new ApiError(400, "Username or email is required")
    }

    // now we want ki ham check kare user ko username ya email se toh iske liye ham databse me query langene ki dono me se jo pahle mil jaye toh uska data return kar do 

    // if(!(username || email)){
    // throw new ApiError(400, "Username or email is required")
    // }

    const user = await User.findOne({
        $or : [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User not found")
    }

    // if we found the user then how we can check the password 

    // hamne ek checkpassword naam ka method banaya hua hai jisme hame apna abhi jo user ne password daala hai woh dalna hai aur request body se then hamra jo returned user hai user wlaa na ki mongodb wala usme hamne ispasswordcorrect naam ka method banaya the jisse ham yaha use kar sakte hai kyuki woh bass ek password leta haia ur hamre database se bycript kar ke original password and currentpassword ko check karta hai 

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid User Cradintials")
    }

    // if the both user and password is correct then make access and refress token 

    const {accessToken, refressToken} = await generateAccessAndRefressTokens(user._id)

    // now hamare User ko ek baar aur call akrte hai ki ham nahi chate hai ki hamre pass password and refresstoken fir se aaye user ke passs

    const loggedInUser = await User.findById(user._id).select("-password -refressToken")


    // now we have to use the cookie jisme hame cookie ko secure banana hai= cookie hame dikhe frontend pe but woh bass modifieable ho sirf server se na ki frontend se 

    const options = {
        httpOnly : true, 
        secure : true
    }

    // now we set the refress token and access token with using the cookie  aur ham usme .cookie laagte jayege aur set karte jayenge 

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refressToken", refressToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refressToken
            },
            "User LoggedIn successfully"
        )
    )
})

// yaha pe hamara 

const logoutUser = asyncHandler(async(req, res)=>{
    // because of the middleware we have access to the modified request kyuki hamne verifyjwt ke last me req.user me user ko add kar diya so ab req ke pass user ka bhi access hai 

    // now we jsut have to delte the refress token for the logout
    
    // first of it take the id then a object jisme ham ek keyword of mongoDB se set karte hai filed of the mongoose ke 
    await User.findByIdAndDelete(
        req.user._id,
        { 
            $set: {
                refressToken: undefined
            }
        },
        {
            new: true,
            // it gives in return a new updated refress token 
        }

    )

    const options = {
        httpOnly : true, 
        secure : true
    }

    // now we clear the cookie in return 

    return res.status(200).clearCookie("accessToken", options).clearCookie("refressToken", options).json(new ApiResponse(200, {}, "User loggedOut successfully"))
})

// lets make another controller for refress and access token that is incomming 
const refressAccessToken = asyncHandler(async(req, res) => {
    // lets store the refress token in a variable kyuki ham refress token ki hi help se frontend se request karnege new access token ke liye 
    const incomingRefressToken = req.cookies.refressToken || req.body.refressToken
    // for both mobile and web

    // lets use the error handler 
    if(!incomingRefressToken){
        throw new ApiError(401, "Unauthrized request")
    }

    try {
        
            // now we verfiy the token from the database with the help of jwt jisse ham raw token ko dekh paye kyuki user ke pass encrypted token hota hai 
            const decodedToken = jwt.verify(incomingRefressToken, process.env.REFRESH_TOKEN_SECRET)
        
            // so in the decoded token from the refresstoken se jo hamae data mila hai usme hamare pass return me decoded data milta hai aur hamne refress token banate time usme bass id diya tha toh ham decoded token se id nikal ke user ka data le sakte hai 
        
            const user = await User.findById(decodedToken?._id)
        
            // lets use the error handler 
            if(!user){
                throw new ApiError(401, "Invalid refress token")
            }
        
            // now we check the refress token comming from the user and the refress token stored in the database 
            if(incomingRefressToken !== user?.refressToken){
                throw new ApiError(401, "Refress Token is expired or the Used")
            }
        
            // now we generate the refress token from the above method
            const {accessToken, newRefressToken} = await generateAccessAndRefressTokens(user._id)
        
            // now we write the options 
            const options = {
                httpOnly : true,
                secure : true
                // this is used to save the refress token 
            }
        
            // now we return the response with
            return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refressToken", newRefressToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken, refressToken : newRefressToken
                    },
                    "Access Token Refressed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refress Token")
    }
})

// lets make a change the current password controller 

const changeCurrentPassword = asyncHandler(async(req, res)=>{
    // now hamne password change karne ke liye user se kya kya filed lena hai= 
    // ek toh hame lena hai oldpass and the new pass
    const {oldPassword, newPassword, confPassword} = req.body

    if(!(newPassword === confPassword)){
        throw new ApiError(400, "Miss-Matched Password")
    }

    // if we are using the changecurrentpassword then the user must be logged in so we have access to the user from the req.user kyuki hamne verifyjwt ke last me req.user me user ko add kar diya tha
    // also we write the middleware in the routes so that we can access the user from the req.user


    const user = await User.findById(req.user?._id)

    // also we created a method in the user model to check that the user passsword is corret or not 
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    // check for password is correct or not error control 
    if(!isPasswordCorrect){
        throw new ApiError(400, "Incorrect Old Password")

    }

    // ager hamra purana password correct tha toh ham ab naya password set karenge 
    user.password = newPassword
    await user.save({validateBeforeSave : false} )

    // now we want to send a response to the user
    return res
    .status(200)
    .json( new ApiResponse(
        200,
        {},
        "Password Changed Successfully"
    ))
})

// lets make the get current user ka code jaha pe  hame hamaeahs current user mil jaye 
const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            req.user,
            "Current User Fetched Successfully"
        )
        
    )
})

// now we make the controller for the update user details 
const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body
    if(!fullName || !email){
        throw new ApiError(400, "All fileds are required")
    }

    // now we find the user by its id and update and in the 3red object we write new : true jisse data update hone ke baad return bhi karege 
    // we find the user by its id from the model databse 
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            // here we set the data updation 
            $set: {
                fullName,
                email
                // or we can write as
                // fullName : fullName
                // email : email
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, user, "Account details updated successfully"
        )
    )

})

// now we make the avatar change controller jaha pe ham user ka profile pgoto change karne ka colntroller banayenge 
const updateUserAvatar = asyncHandler(async(req, res)=> {
    // now we store the profile ka path in the local storage with the help of the multer 
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar File is missing")
    }

    // now we have to upload that file to the cloudinary so we had make a fuction where we just have to give the local storage ka path to the mthod UploadOnColoudinary

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    // now we chaeck ki hamare pass url aaya ki nahi cloudinary se kyuki hamara fucntion return me ek url deta hai
    if(!avatar.url){
        throw new ApiError(400, "Error while uploading avatar on database")
    }

    // for updation 

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            // here we write ki hame kisse update karna hai 
            $set:{
                avatar : avatar.url 
            }
        },
        {
            new : true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Avatar image updated Successfully"
        )
    )
})
const updateUserCoverImage = asyncHandler(async(req, res)=> {
    // now we store the profile ka path in the local storage with the help of the multer 
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover Image File is missing")
    }

    // now we have to upload that file to the cloudinary so we had make a fuction where we just have to give the local storage ka path to the mthod UploadOnColoudinary

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    // now we chaeck ki hamare pass url aaya ki nahi cloudinary se kyuki hamara fucntion return me ek url deta hai
    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading cover image on database")
    }

    // for updation 

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            // here we write ki hame kisse update karna hai 
            $set:{
                coverImage : coverImage.url 
            }
        },
        {
            new : true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "cover image updated Successfully"
        )
    )
})

export {
    registerUser, 
    loginUser, 
    logoutUser, 
    refressAccessToken, 
    changeCurrentPassword, 
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,

}