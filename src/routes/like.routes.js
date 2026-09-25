import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";

import {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    togglePlaylistLike,
    getLikedVideos,
    getLikedTweets,
    getLikedComments,
    getSavedPlaylists
} from "../controllers/like.controller.js"

const router = Router();

// now we write the routes 

// get 
router.route("/get-liked-videos").get(verifyJWT, getLikedVideos);
router.route("/get-liked-comments").get(verifyJWT,getLikedComments);
router.route("/get-liked-tweets").get(verifyJWT,getLikedTweets);
router.route("/get-saved-playlists").get(verifyJWT, getSavedPlaylists);

// post 
router.route("/toggle-video-like/:videoId").post(verifyJWT, toggleVideoLike);
router.route("/toggle-comment-like/:commentId").post(verifyJWT, toggleCommentLike);
router.route("/toggle-tweet-like/:tweetId").post(verifyJWT, toggleTweetLike);
router.route("/toggle-playlist-like/:playlistId").post(verifyJWT,togglePlaylistLike);

export default router;
