import { Router } from "express";
// now we import the jwt 
import { verifyJWT } from "../middlewares/auth.middleware.js";

import {
        createVideo,
        getVideoById,
        getUserVideos,
        updateVideo,
        deleteVideo,
        incrementVideoView,
        toggleVideoRepost,
        getVideoReposts
} from "../controllers/video.controller.js";
import { getVideoHomeFeed } from "../services/videoFeed.service.js";


import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// route for creating new video // POST
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
    ]),
    createVideo
);

// GET
// now we get the feed from service 
router.route("/video-home-feed").get(verifyJWT, getVideoHomeFeed);
// now we get the video by id 
router.route("/video-by-id/:videoId").get(verifyJWT,getVideoById);
// routes for getting all video form the perticular user 
router.route("/user-videos/:userId").get(verifyJWT,getUserVideos);
// now we get the user all reposted videos 
router.route("/reposted-videos").get(verifyJWT,getVideoReposts);

// POST 
router.route("/increment-video-view/:videoId").patch(verifyJWT,incrementVideoView)
router.route("/toggle-video-repost/:videoId").patch(verifyJWT, toggleVideoRepost);
// Update Video
router.route("/update-video/:videoId").patch(
    verifyJWT,
    upload.fields([
        {
            name: "video",
            maxCount: 1
        },
        {
            name: "thumbnail",
            maxCount:1
        }
    ]),
    updateVideo
);

// DELETE 
router.route("/delete-video/:videoId").delete(verifyJWT, deleteVideo);


export default router;