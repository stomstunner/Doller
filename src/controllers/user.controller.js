import {asyncHandler} from "../utils/asynchandler.js"
// here we import the api error for error handlinng
import {ApiError} from "../utils/ApiError.js"

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
    

})

export {registerUser}