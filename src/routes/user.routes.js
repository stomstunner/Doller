import { Router } from "express";
import {
    loginUser,
    logoutUser,
    registerUser,
    refressAccessToken,
    changeCurrentPassword, 
    getCurrentUser, 
    updateAccountDetails, 
    updateUserAvatar, 
    updateUserCoverImage, 
    getUserChannelProfile, 
    getWatchHistory
} from "../controllers/user.controller.js";

const router = Router()

// here we see how to handle the file upload problem 
// we can easily handle the json data but file uploadation is difficult

import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";




// now here we write the router ka kaam ki ham kya kaam kanrege user router se 

router.route("/register").post(
    // so here we write the middleware kyuki ham direct hi register user ko run nahi karwana chahate hai ham chahate hai ki pahale ek middleware ho 

    // so we wanted to send the coverimage and the avatar to by the help of multer jisme ham upload kanrege feields ko as in a array of objects 

    upload.fields([
        {
            // first file ka naam // communication bet frontend and backend me help karnege 

            name: "avatar",
            maxCount: 1

        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)

// so hamara final url banaega
// http://localhost:8000/users/register
// and hamne register pe jaane ke kaam register user ko call kar diya hai so ager hamne next login karna pare toh ham bass 

// router.route("/login").post(loginUser)
// so hoga kya ki login route pe jaane ke bass ham url se hi loginuser method ko call kar rahe hai

// lets make the new router 
// matlab ki jab ham login pe ho toh hamara kon sa mehtod post me run ho = loginuser 
router.route("/login").post(loginUser)

// // now we use the logout router jisme ham logoutUser run karne se pahle ham ek middleware ko run karenge verifiyJWT and then we run logoutuser = isliye ham verifiyJWT ke last me hamne next() likha tha jisse pata toh chale ki router ko abhi ek aur chiz ko chalana hai that is logoutuser 
// in patch sara detail update nahi hota hai post jaissa bass kuch selected details hi update hota hai
// when we get the data fom the params = url then we have to write the path very cleary after colon we have to give the same name as written in the method 


// secure 
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refress-token").post(refressAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)
router.route("/c/:username").get(verifyJWT, getUserChannelProfile)
router.route("/history").get(verifyJWT, getWatchHistory)




export default router