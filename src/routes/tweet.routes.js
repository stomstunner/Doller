import { Router } from "express";
import { createTweet,
        updateTweet,
        deleteTweet,
        getTweetById,
        getUserTweets,
        getCommunityFeed,
        toggleTweetRepost,
        getTweetReposts,
        pinTweet,
        unpinTweet,
        incrementTweetView,
        getUserProfileRepostedTweets,
        } from "../controllers/tweet.controller.js";

import {verifyJWT} from "../middlewares/auth.middleware.js" 

const router = Router();

// POST Router
router.route("/create-tweet").post(verifyJWT, createTweet)

// get router
router.route("/get-tweet/:tweetId").get(verifyJWT, getTweetById)
router.route("/get-user-tweets/:userId").get(verifyJWT, getUserTweets);
router.route("/get-community-feed").get(verifyJWT, getCommunityFeed);
router.route("/get-tweet-reposts/:tweetId").get(verifyJWT, getTweetReposts);
router.route("/get-user-reposted-tweets/:userId").get(verifyJWT, getUserProfileRepostedTweets);

// PATCH routes 
router.route("/update-tweet/:tweetId").patch(verifyJWT, updateTweet);
router.route("/toggle-tweet-repost/:tweetId").patch(verifyJWT, toggleTweetRepost);
router.route("/pin-tweet/:tweetId").patch(verifyJWT, pinTweet);
router.route("/unpin-tweet/:tweetId").patch(verifyJWT, unpinTweet);

router.route("/delete-tweet/:tweetId").delete(verifyJWT, deleteTweet);

export default router;


