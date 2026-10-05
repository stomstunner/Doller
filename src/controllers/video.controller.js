import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { validateObjectId } from "../utils/validateObjectId.js";    
import { Video } from "../models/video.models.js";  
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

import { Comment } from "../models/comment.models.js";
import { User } from "../models/user.models.js";
import { Like } from "../models/like.models.js";
import mongoose from "mongoose";

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

const getVideoById = asyncHandler(async(req, res) => {
    const {videoId} = req.params;

    validateObjectId(
        videoId,
        "Video ID"
    )

    // now we make the aggragation pipeline for getting the information from the User, Video, Playlist, and many more 
    const videoResult = await Video.aggregate(
        [
            // first we find the video 
            {
                $match:{
                    _id: new mongoose.Types.ObjectId(
                        videoId
                    ),
                    // video should be true and published 
                    isDeleted: false,
                    isPublished: true
                }
            },
            {
                $lookup:{
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner",
                    // now we use the pipeline to get only usefull details from the owner 
                    pipeline: [
                        {
                            $project: {
                                fullName: 1,
                                username: 1,
                                avatar: 1
                            }
                        }
                    ]
                }
            },
            // now we use the addfield to take the 1st array as a obejct and store in owner filed 
            {
                $addFields:{
                    owner:{
                        $first: "owner"
                    }
                }
            },

            // now we chek ki hamara current user ne video ko like kiya hai ya nahi 
            // we take the data from the likes collection 
            // from the current video = _id
            // foreignField  me likes ke kiisse se lena hai = video field se 

            {
                $lookup:{
                    from: "likes",
                    localField: "_id",
                    foreignField: "video",
                    as: "userLike",
                    pipeline: [
                        {
                            $match: {
                                likedBy: new mongoose.Types.ObjectId(
                                    req.user._id
                                )
                            }
                        }
                    ]

                }
            },
            // now we check the userLike field and sger uske adner 1 se jayda value hai toh matlab ki cureent user ne video ko like kiya hai 
            {
                $addFields:{
                    isLiked:{
                        // now we use the condition 
                        $cond:[
                            // expression
                            // true
                            // false
                            {
                                // now we use the $gt for finding the value grater than 
                                $gt:[
                                    // first value
                                    // 2nd value 
                                    {
                                        $size: "$userLike"
                                    },
                                    0
                                ]
                            },
                            true,
                            false
                        ]
                    }
                }
            },
            // now we get the total like for this current video 
            {
                $lookup: {
                    from: "likes",
                    // ham abhi videos me hai toh uska local fiels _id hai // curretn video ki id 
                    localField: "_id",
                    foreignField: "video",
                    as:"likes",

                }
            },
            // now we count the total likes from the likes array 
            {
                $addFields:{
                    likeCount:{
                        $size: "$likes"
                    }
                }
            },
            // now we chek ki hamra current user ne repost kiya hua hai ya nahi 
            {
                $lookup:{
                    from: "reposts",
                    localField:"_id",
                    foreignField:"video",
                    as: "userRepost",

                    pipeline:[
                        {
                            $match: {
                                _id: new mongoose.Types.ObjectId(req.user._id)
                            }
                        }
                    ]
                }
            },
            // now we add the addfileds, and check the userRepost field for the user reposted the video or not if yes then the field will have some value 
            {
                $addFields:{
                    isReposted: {
                        $cond:[
                            // expression
                            // true
                            // false
                            {   
                                $gt: [
                                    // 1st value the 2nds value
                                    {
                                        $size: "$userRepost"
                                    },
                                    0
                                ]

                            },
                            true,
                            false
                        ]
                    }
                }
            },
            // now we get the total repost count with the help of reposted on that video size 
            {
                $lookup:{
                    from:"reposts",
                    // current video ki id 
                    localField: "_id",
                    foreignField: "video",
                    as: "reposts"
                }
            },
            // now we add a field jisme ham video ke kitne repost hai uska data store rakh lenge 
            {
                $addFields:{
                    repostCount: {
                        $size: "$reposts"
                    }
                }
            },
            // now we check the current user commented or not 

            {
                $lookup: {
                    // kaha check karna hai
                    from: "comments",
                    // current video ki id
                    localField: "_id",
                    foreignField: "video",
                    as: "userComment",
                    // now we match ki hamara current user ho 
                    pipeline:[
                        {
                            $match: {
                                // comment kiss user ne kiya hai 
                                owner: new mongoose.Types.ObjectId(
                                    req.user._id
                                ),
                                // ager comment delete ho gya ho toh mat lana 
                                isDeleted: false
                            }
                        }
                    ]
                }
            },
            // now we add a filed for checking ki iscommented 
            {
                $addFields:{
                    hasCommented: {
                        // now we use the conditions 
                        $cond: [
                            // expression
                            // true
                            // false
                            {
                                // here we use greater than 
                                $gt: [
                                    // 1st value then 2nd value 
                                    {
                                        $size: "userComment"
                                    },
                                    0
                                ]
                            },
                            true,
                            false
                        ]
                    }
                }
            },
            // now we take the data from the playlist collection 
            {
                $lookup:{
                    from: "playlists",

                    // now we use the current video ka id in the nested pipeline so for that reason we store the id in a let 
                    let:{
                        videoId: "$_id"
                    },
                    as: "playlists",

                    // now we use the pipeline for taking the non nested pipeline 
                    pipeline:[
                        {
                            $match: {
                                // owner kon hai 
                                owner: new mongoose.Types.ObjectId(
                                    req.user._id
                                ),
                                isDeleted: false
                            }
                            // now we make a field and check ki curret video playlist array me hai ya nahi 
                        },
                        {
                            $addFields:{
                                isAdded:{
                                    // in ka use karnenge jisse ham koi array me koi value hai ya nahi woh pata kar sakte hai and it gives true or false
                                    $in:[
                                        // kisko khojna hai
                                        // kaha khojna hai 
                                        // $$ se variable access inside the nestedin 
                                        // $ filed 
                                        "$$videoId",
                                        "$videos"
                                    ]
                                }
                            }
                        },
                        {
                            $project:{
                                name: 1,
                                isPublic: 1,
                                isAdded: 1
                            }
                        }
                    ]
                }
            },
            // now we check user has any playlist or Not
            {
                $addFields: {
                    hasPlaylists: {
                        // now we use the conditions
                        $cond: [
                            {
                                $gt:[
                                    {
                                        $size: "playlists"
                                    },
                                    0
                                ]
                            },
                            true,
                            false
                        ]
                    }
                }
            },
            // now we check current video is added to any playlist or not 
            // ye ham khoj rahe hai ki hamare bahut sare playlists me se kis kis me hamara video add hai 
            {
                $addFields:{
                    isAddedToPlaylist:{
                        $cond:[
                            {
                                // greater than
                                $gt:[
                                    {
                                        $size:{
                                            // ab ham playlist array me baht sare playlists me se woh playlist filter karnege jisme hamara video ho 
                                            $filter:{
                                                // kiss array ko filter karna hai 
                                                // uska ky naam dena hai 
                                                // ckeck karnege ki current playlist ka isAdded ture hai ya nhai 
                                                input: "playlists",
                                                as: "playlist",
                                                cond:{
                                                    $eq:[
                                                        "$$playlist.isAdded",
                                                        true
                                                    ]
                                                }
                                            }
                                        }
                                    },
                                    // ager kisi bhi playlist me video nahi hai toh size 0 ho jayega 
                                    
                                    0
                                ]
                            },
                            true,
                            false
                        ]
                    }
                }
            },
            // now we project only required fields
            {
                $project: {

                    // video information
                    videoFile: 1,
                    thumbnail: 1,
                    title: 1,
                    description: 1,
                    duration: 1,

                    // current view count
                    viewCount: 1,

                    // owner information
                    owner: 1,

                    // like information
                    likeCount: 1,
                    isLiked: 1,

                    // repost information
                    repostCount: 1,
                    isReposted: 1,

                    // comment information
                    hasCommented: 1,

                    // playlist information
                    hasPlaylists: 1,
                    isAddedToPlaylist: 1,
                    playlists: 1,

                    // video dates
                    createdAt: 1,
                    updatedAt: 1
                }
            }

        ]
    )

    // ager videoResult ka length 0 hai toh iska matlab hai ki hamara pass koi video nahi hai 
    if(videoResult.length === 0){
        throw new ApiError(
            404,
            "Video not found"
        )
    }

    const video = videoResult[0];

    // now we increase the view count 
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $inc: {
                viewCount: 1
            }
        },
        {
            new : true
        }
    )
    // now we increse the video.viewCount ka vlaue with the updated.viewCount because we run the aggregation first 
    video.viewCount = updatedVideo.viewCount;

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "Video Fetched Successfully"
        )
    )
})

export {
    createVideo,
    getVideoById,
}