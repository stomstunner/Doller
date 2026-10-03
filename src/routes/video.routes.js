import { Router } from "express";
// now we import the jwt 
import { verifyJWT } from "../middlewares/auth.middleware.js";

import { createVideo } from "../controllers/video.controller.js";

import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/create-video")
.post( verifyJWT,
    
    // multer will receive the video and thumbnail
    // and store them temporarily inside public/temp
    upload.fields([
        {
            name: "video",
            maxCount: 1
        },
        {
            name: "thumbnail",
            maxCount: 1
        }
    ])
    ,createVideo);

export default router;