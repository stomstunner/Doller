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

    if(!videoLocalPath){
        throw new ApiError(
            404,
            "Video not found"
        )
    }

    // now we have to upload the video to the cloudinary aur upload ke liye hamne bass multer ka local path de dena hai 

    // and cloudinary jo hai woh video ko upload kar denga aur hame response me url aur public id aur duration sab dega 
    const video = await uploadOnCloudinary(
        videoLocalPath,
        "Video"
    )

    // now we chek ki video varibale me kuch hai bhi ya nai matlab video uplaod hua hai ya nahi 
    if(!video){
        throw new ApiError(
            500,
            "Video Upload failed"
        )
    }

    // after checking the video section we will check ki hamare pass thumbnail hai ya nahi ager user ne thumbnail diya toh thik hai nahi toh ham usse video se generate kar denge

    let thumbnailLocalPath;
    if(req.files?.thumbnail?.[0]?.path){
        thumbnailLocalPath = req.files.thumbnail[0].path
    }

    // now we make a varibale jisme ham thumbnail ka url store karte hai 
    let thumbnailUrl;
    let thumbnailPublicId;
    // now we check weather the user has provided the thumbnail or not 
    if(thumbnailLocalPath){
        // if user provided the thumbnail matlab thumbnailLocalPath me kuch vlaue hai toh ham thumbnail ko cloudinary pe upload kar denge 
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

        // now we check ki hamara thumbnail upload hua hai ya nahi 
        if(!thumbnail){
            throw new ApiError(
                500,
                "Thumbnail uploading failed"
            )
        }

        // ab hamare passs thumbnail url hai toh usse ham thumbnailUrl me store kar denge 
        thumbnailUrl = thumbnail.secure_url || thumbnail.url;
        thumbnailPublicId = thumbnail.public_id;
    }
    // now if the user have not provided the thumbnaik then we generate the thumbnail from the video 
    else{
        // cloudinary allows us to generate an image
        // from a particular frame of a video
        //
        // here we are taking the frame from 3nd second
        //
        // so_2 means that we want the frame
        // from 3 seconds into the video

        // but usse phale ek aur chek ki ager hamar video hi 3 sec se kam ka hua toh ham kya kanarge
        let thumbnailSecond;
        if(video.duration > 3){
            thumbnailSecond = 3
        }
        else{
            thumbnailSecond = 1
        }

        // now we genrate the image / thumbnail url from the selected frame of the video 

        thumbnailUrl = video.secure_url.replace(
            "/video/upload/",
            `/video/upload/so_${thumbnailSecond}/`
        )
        .replace(
            /\.[^/.]+$/,
            ".jpg"
        );

        // iss pure code ka matlab hai ki hamne video ke url me se video ka extension hata diya aur uske badle me jpg laga diya aur so_3 laga diya ki ham 3 sec ke frame se image generate karna chahate hai
        // aur thumbnailUrl me jo hamra video ka url hai usse hamne replace kar diya aur thumbnailUrl me store kar diya
        // video ke 3ed second ke frame se image generate karne ke liye hamne so_3 laga diya aur video ke extension ko jpg me replace kar diya

        // now the thumbnailPublicId will be the same as the video public id kyuki hamne video ko hi transformation kar ke thumbnail generate kiya hai 

        thumbnailPublicId = video.public_id;
    }

    // now we check ki hamara thumbnail url me kuch hai bhi ya nahi 
    if(!thumbnailUrl){
        throw new ApiError(
            500,
            "Thumbnail could not be generated"  
        )
    }

    // now we create the video
    const createdVideo = await Video.create({
        videoFile : {
            url: video.secure_url ||  video.url,
            publicId: video.public_id
        },
        thumbnail : {
            url : thumbnailUrl,
            publicId: thumbnailPublicId
        },
        title: title.trim(),
        description : description.trim(),
        duration : video.duration,
        owner: req.user._id,
    });

    if(!createdVideo){
        throw new ApiError(
            500,
            "Something went wrong while creating the video"
        )
    }

    // response
    // return res
    // .status(201)
    // .json(
    //     new ApiResponse(
    //         201,
    //         {
    //             videoUrl: createdVideo.videoFile.url,
    //             videoPublicId: createdVideo.videoFile.publicId,
    //             thumbnailUrl: createdVideo.thumbnail.url
    //        },
    //         "Video uploaded successfully"
    //     )
    // )
    // response
    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            createVideo,
            "Video uploaded successfully"
        )
    )
})



export {createVideo}