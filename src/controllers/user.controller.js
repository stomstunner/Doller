import {asyncHandler} from "../utils/asynchandler.js"

// so here we register the user with the help of asynchandler = jo ki ek function aceept karta hai // it is an higher order fucntion( fucntion ke liye fucntion)


const registerUser = asyncHandler( async (req, res) =>{
    res.status(200).json({
        message : "Doller app"
    })
})

export {registerUser}