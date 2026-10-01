import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { validateObjectId } from "../utils/validateObjectId.js";    
import { Video } from "../models/video.models.js";  
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

import { Comment } from "../models/comment.models.js";
import { User } from "../models/user.models.js";
import { Like } from "../models/like.models.js";

// lets create the createVideo controller 
const createVideo = asyncHandler(async(req, res)=> {
    // we take the tittle and description from the user 
    const {title, description} = req.body;
    // check if we have tittle or description not 
    if(!title?.trim()){
        throw new ApiError(
            404,
            "Title Not Found"
        )
    }
    if(!description?.trim()){
        throw new ApiError(
            404,
            "Description not found"
        )
    }

    // now we get the video file from  req.files
    // multer gives us access to uploaded files through req.fileds

    // here we check first ki hamara video exists karta bhi hai ya nahi 
    // then we access the video array 
    // and then we get the first video from the array 
    const videoLocalPath = req.files?.video[0]?.path;
    
})
