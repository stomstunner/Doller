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
