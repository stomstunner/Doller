// sabse pahle express se router ko import karenge 
// console.log("Comment Routes Loaded");
import { Router } from "express";
// now we import the jwt 
import { verifyJWT } from "../middlewares/auth.middleware.js";

// import all the conrollers from the comment controllers
import {
    getVideoComments,
    getTweetComments,
    getCommentReplies,
    addVideoComment,
    addTweetComment,
    updateComment,
    pinComment,
    unpinComment,
    deleteComment
} from "../controllers/comment.controller.js"


// router file ko connect karo 
const router  = Router()

// GET routes 
// get video comments
router.route("/get-video-comments/:videoId").get(verifyJWT, getVideoComments);
// get tweet comments
router.route("/get-tweet-comments/:tweetId").get(verifyJWT, getTweetComments);
// get comment replies
router.route("/get-comment-replies/:commentId").get(verifyJWT, getCommentReplies);

// POST routes
// add video comment
router.route("/add-video-comment/:videoId").post(verifyJWT, addVideoComment);
// add tweet comment 
router.route("/add-tweet-comment/:tweetId").post(verifyJWT, addTweetComment);

// PATCH routes
// update comment 
router.route("/update-comment/:commentId").patch(verifyJWT, updateComment);
// pin Comment
router.route("/pin-comment/:commentId").patch(verifyJWT,pinComment);
// unpin Comment
router.route("/unpin-comment/:commentId").patch(verifyJWT, unpinComment);

// DELETE route 
// delete Comment
router.route("/delete-comment/:commentId").delete(verifyJWT,deleteComment);

export default router;