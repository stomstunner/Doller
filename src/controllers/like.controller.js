// lets imprt the nessecery modules 
import mongoose from "mongoose";
import { Like } from "../models/like.models.js";
import { Comment } from "../models/comment.models.js";
import { Playlist } from "../models/playlist.models.js";
import { Video } from "../models/video.models.js";
import { Tweet } from "../models/tweet.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { validateObjectId } from "../utils/validateObjectId.js";    

// lets make the controller for the toggleVideoLike
const toggleVideoLike = asyncHandler(async(req, res) => {
    // 1 fetch the id ov video from the request
    const {videoId} = req.params;
    // now we validate the object id 
    validateObjectId(
        videoId,
        "Video ID"
    )

    // now we check ki hamara video exites karta bhi hai ya nahi 
    const videoExists = await Video.exists(
        {
            _id : videoId
        }
    )

    // now we send the error if we do not found the video 
    if(!videoExists){
        throw new ApiError(
            404,
            "video not found"
        )
    }

    // Step 4:
    // Database me check karo
    // ki current user ka like already hai ya nahi.

    const existingLike = await Like.findOne(
        {
            video : videoId,
            likedBy : req.user._id
        }
    )

    

    // Step 5:
    // Agar like mil gaya
    // → Unlike karo

    if(existingLike){
        await Like.findByIdAndDelete(
            existingLike._id
        );

        // send the response that we hace the exiting like so it means the video is already liked so toggle its unlike 
        return res
        .status(200)
        .json(
            new ApiResponse(
                200, 
                {
                    liked : false 
                },
                "Video unliked Successfully"
            )
        )
    }

    // Agar like nahi mila
    // → Like karo
    await Like.create(
        {
            video: videoId,
            likedBy: req.user._id
        }
    )

    // now we send the response where we make the like button liked kyuki ye pahle se liked nahi tha aur hamne abhi like create kiya hai 
    // video ke liye sirf 
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                liked :true  
            },
            "Video liked Successfully"
        )
    )


})

// now lets make the toggleCommentLike with same intution 
const toggleCommentLike = asyncHandler(async(req, res) => {

    // find id 
    const {commentId} = req.params;

    // validate obejct id 
    validateObjectId(
        commentId,
        "Comment ID"
    )

    // comment exits or not 
    const commentExists = await Comment.exists(
        {
            _id: commentId,
            isDeleted : false
        }
    )

    // error for not found 
    if(!commentExists){
        throw new ApiError(
            404,
            "Comment not found"
        )
    }

    // check ki hamra pahle se hi toh like nahi hai 
    const existingLike = await Like.findOne(
        // kya woh comment ka hi like hai aur kya user bhi same hai 
        {
            comment:commentId,
            likedBy : req.user._id,
        }
    )

    // now if we have any data in the exiting like then it means ki hamare pass pahle se hi iss comment pe like tha iss user dwara 
    // toh unlike kar do ab 
    if(existingLike){
        await Like.findByIdAndDelete(
            existingLike._id  
        )

        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    liked: false
                },
                "Comment unliked Successfully"
            )
        )
    }

    await Like.create(
        {
            comment: commentId,
            likedBy : req.user._id
        }
    )

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                liked : true
            },
            "Comment liked Successfully"
        )
    )
})

// now we make the toggleTweetLike
const toggleTweetLike = asyncHandler(async(req, res) => {
    // find the tweetId 
    const {tweetId} = req.params;

    // now we validate the tweetId object 
    validateObjectId(
        tweetId,
        "Tweet ID"
    )

    // now we see ki hamara tweet exist karta bhi hai ya nahi 
    const tweetExists = await Tweet.exists(
        {
            _id:tweetId
        }
    );

    // if tweet does not exits then,
    if(!tweetExists){
        throw new ApiError(
            404,
            "Tweet not found"
        )
    }

    // now we find in the Like database ki hamare pass kahi isi tweet pe like toh nahi hai na 
    const existingLike = await Like.findOne(
        {
            tweet : tweetId,
            // now we ckeck who liked it is it the requester 
            likedBy: req.user._id
        }
    )

    // now we write code on the basis of weather the exitng like is true or false 
    // if exiting like is avalble matab usme kuch data aaya hai databse se then  
    if(existingLike){
        await Like.findByIdAndDelete(
            existingLike._id 
        )

        // now we send the response 
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    liked : false
                },
                "Tweet unliked Successfully"
            )
        )
    }

    // now if we are here then we dont have the data for the exiting like then it means we now have to create the like tweet 
    await Like.create(
        {
            tweet: tweetId,
            likedBy: req.user._id
        }
    )
    // now we send the response 
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                liked : true
            },
            "Tweet Liked Successfully"
        )
    )
})

// now we write the controller for the togglePlaylistLike

const togglePlaylistLike = asyncHandler(async(req, res) => {
    // find the playlist object id 
    const {playlistId} = req.params;

    // now we validate the object id 
    validateObjectId(
        playlistId,
        "Playlist ID"
    );

    // now we ckeck the playlist exits or not 
    const playlistExists = await Playlist.exists(
        {
            _id: playlistId
        }
    )

    // error handling
    if(!playlistExists){
        throw new ApiError(
            404,
            "Playlist not found"
        )
    }

    // now we check ki phale se hi toh like nahi hai playlist pe 
    const existingLike = await Playlist.findOne(
        {
            _id : playlistId,
            likedBy: req.user._id
        }
    )

    // now we write the code if there is a like present 
    if(existingLike){
        await Like.findByIdAndDelete(
            existingLike._id
        )

        // and send the response 
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    liked : false
                },
                "Playlist unliked Successfully"
            )
        )
    }

    // if we are here means our playlist havnt any like yet 
    await Playlist.create(
        {
            _id: playlistId,
            likedBy: req.user._id
        }
    )

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                liked : true
            },
            "Playlist liked Successfully"
        )
    )
})