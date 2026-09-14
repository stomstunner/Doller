import {asyncHandler} from "../utils/asynchandler.js"
// here we import the api error for error handlinng
import {ApiError} from "../utils/ApiError.js"

// now we want to check the user is already registered or not 

import { User } from "../models/user.models.js"

// import the upload on cloudinary mehtod from the utils 

import {deleteFromCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"

// now we import the api response for sending the data
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt  from "jsonwebtoken"
import mongoose from "mongoose"

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
        avatar:{
            url: avatar.secure_url || avatar.url,
            publicId : avatar.public_id,
        },
        // for the coverimage we check here only ki hamre pass coverimage ka url hai ya nahi ager nahi hai toh ham empty hi rehne denge kyuki ye databse me required nahi hai but hame ek baar chek bhi karna hai ki url aaya hai ya nahi 

        coverImage:{
            url: coverImage?.secure_url || coverImage?.url || "",
            publicId: coverImage?.public_id || "",
        },
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
                refressToken: 1// remove field from the document
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


    // Fetch the old user/avatar before updating.
    // Delete that old avatar after the new avatar is saved.
    // get the current user before replacing the avatar 

    const existingUser = await User.findById(req.user?._id)


    // if existing user not found 
    if(!existingUser){
        throw new ApiError(404, "User not Found")
    }

    // save the oldpublic id  temporarlly
    const oldAvatarPublicId = existingUser.avatar?.publicId;

    // upload the new image 

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    // const oldAvatar = await uploadO

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
                avatar : avatar.url,
                publicId: avatar.public_id,
            }
        },
        {
            new : true
        }
    ).select("-password")

    // delete the old image only after the successfull update 
    if(oldAvatarPublicId){
        await deleteFromCloudinary(oldAvatarPublicId)
    }

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

    const existingUser = await User.findById(res.user?._id)

    const oldCoverImagePublicId = existingUser.coverImage?.publicId;

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
                coverImage : coverImage.url,
                publicId: coverImage.public_id,
            }
        },
        {
            new : true
        }
    ).select("-password")

    if(oldCoverImagePublicId){
        await deleteFromCloudinary(oldCoverImagePublicId)
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "cover image updated Successfully"
        )
    )

//  Get old image publicId
//  Upload new image
//  Update database
//  Delete old image
})

// now we make the controller for getting the users channel profile such as subcriber count and how many channel they subcribed to 
const getUserChannelProfile = asyncHandler(async(req, res) => {
    // we get the details of the channel when we go to their channel from the url so we use the req.param

    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400, "username is missing")
    }

    // now we assume ki hamare pass username hai then we apply the aggreation pipeline on the User coloumn 
    // coloumnname.aggregate(array ke ander object each object signifies the pipeline staging like 1st pipeline , 2nd pipeline etc)
    const channel = await User.aggregate([
        {
            // first pipeline
            $match :{
                username: username?.toLowerCase()
            }
        },
        {
            // 2nd pipeline 
            $lookup:{
                // 1st parameter is to from = kaha se hame dekhna hai jo ki hai hamara suncription model kyuki hame channel ka pata karna hai  ki kitne subcriber hai so Subcription ka s chota and last me s lag jata hai kyuki ye mongoose ka defination hai 
                from: "subcriptions",
                localField: "_id",
                foreignField: "channel",
                // when we select the foriegn field channel then we get the subcriber and when we select the cubcriber then we get the channel 
                // ab isko bolna kya hai 
                as:"subscribers"
            },    
        },

        // now we want ki hamne kitne channel ko subcribe kiya hai uske liye we use the another pipeline jisme bass ham foriegn field ko subcriber daal denge then we find ki hamen kitne channel ko subcribed kiya hai 

        {
            $lookup:{
                from: "subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        // now we want ki ham count kare ki hamre pass kitne suncribers hai aur hamare pass kitne channel hai jinko ki hamen subcribed kiya hai 
        // that why we write another pipeline where we use the addFileds where we add the upper pipleine in it jinko ki hamne naam diya hai `as` ke ander with doller sign jisse hame woh as a field lagega na ki as a string 
        {
            $addFields:{
                subscribersCount:{
                    // for counting we use the size keyword 
                    $size: "$subscribers"
                },
                // now we add another filed for channelWeSubscriberTO
                channelsSubscribedToCount:{
                    $size: "$subscribedTo"
                },
                // now we find ki ham kisi channel pe subscribed hai ya nahi iske liye ham bass ek true or false return kar denge and usi hisab se frontend pata kar lege ki user uss channel pe subscribed hai ya nahi hai 
                isSubscribed:{
                    // for this we use the condition operator in mongoDB jisme ham if then else ka use karte hai if me ham conditon ya expression likhte hai aur ager true hua expression so we return someting in the then and else me ham false hone ke badd ke kaam likhte hai if se kuch nahi expression/ condition match hua toh 
                    $cond: {
                        if: {
                            // in the if we just have to find ki hamre pass jo document aaya subscribers(addFileds ke bad) usme mai hu ya nahi 
                            // for that we use the another operator $in jo ki find karta hai kya chiz hai aur kisme woh chiz hai 
                            $in: [req.user?._id, "$subscribers.subscriber"]
                            // it means ki hamare pass jo req.user.id ko dekho ki kya woh subscribers filed ke ander subscriber object hai ya nahi 
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        // now we write the code for the project where we give only selected things in return not all data jo bhi usse demanad kar arha hai 
        {
            $project:{
                // ab iske ander ham field ka naaam likhenge jo jo chaiye usek aage 1 laga denege to woh return hoga nahi 1 laga woh jo filed woj jayage hi nahi 
                fullName: 1,
                username: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                createdAt: 1
            }
        }

    ])

    // now we see ki haamre pass channel hai bhi ya nahi 
    if(!channel?.length){
        throw new ApiError(404, "channel does not exit ")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async(req, res) => {

    // for the watchHistory we have to use the aggregate in the nested lookup from the users and the videos kyuki hamare pass user -> left join -> hai videos ka but for the owner of the video jo ki hame dikhana hog thumbnail detail ke niche uske liye further  we have to nesting in the pipeline jisse hamare pass owner ke ander user me  uska id and the username fetch akr sake 

    // now we write the aggregate pipeline for id match but in the mongodeb it gives us a string jisse ki match karte time mongoose hamare liye khud se hi usse object me badal deta hai but in the aggregate pipeline the code directly goes to the mongodb toh hame khud se hi object banana parta hai

    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            // so now we have the user = and uske ander ka bhaut sara field aa gaya hai 
                            // ham yahi pe pipeline laga sakte hai 
                            pipeline:[
                                {
                                    $project: {
                                        // ab hamne yahi pe project lagaya hai toh sara data owner ke ander hi raheha matlab owner me bass itna hi data rahega 
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        // now we write another pipeline because in the frontend usse loop na lagana parega ki owner ke 1st vlaue ke ander me username, fullName and the avatar hoaga baldi usse data ekdam easliy mil jayega 
                        $addFields: {
                            owner: {
                                // now we need the first elemet from the owner filed 
                                $first: "$owner"
                                // ab frontend wale ko direct ho owner mil jayega jisse ki woh dot kar ke usme se value nikal lega 
                            }
                        }
                    }
                ]
            }
            // isse hamare pass videos ke saath saath user bhi join ho gaya hai 
            // now we have to do the nesting jisme hame fir se ek aur lookup lagana hai jisme ham user se owner se detail lenge jisme ki hamare pass user hi hai    
            // abhi hai ham videos ke ander usse hame user me lookup karna hai
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, user[0].watchHistory, "Watch History Fetched Successfully"
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
    getUserChannelProfile,
    getWatchHistory,

}