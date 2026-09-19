// sabse pahle express se router ko import karenge 
import { Router } from "express";
// now we import the jwt 
import { verifyJWT } from "../middlewares/auth.middleware";

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
} from "../controllers/comment.controller"

// router file ko connect karo 
const router  = Router( )