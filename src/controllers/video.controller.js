import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { validateObjectId } from "../utils/validateObjectId.js";    
import { Video } from "../models/video.models.js";  
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

import { Comment } from "../models/comment.models.js";
import { User } from "../models/user.models.js";
import { Like } from "../models/like.models.js";
import mongoose, { set } from "mongoose";

// lets create the createVideo controller 
const createVideo = asyncHandler(async(req, res)=> {
    // we take the tittle and description from the user 
    const {title, description, category, tags} = req.body;
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

    const videoCategory = category?.trim().toLowerCase() || null;
    // now we store the tag only if provided 
    let videoTags = [];
    if(Array.isArray(tags)){
        videoTags = tags;
    }
    else if(typeof tags === "string"){
        videoTags = tags.split(",");
    }

    // now we store only filtered tags 
    videoTags = videoTags
    .filter((tag) => typeof tag === "string")
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0);

    // now we want that ki ham bass single value ko hi rakhe duplicate ko hata de 
    videoTags = [...new set(videoTags)];


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
                    updatedAt: 1,
                    category: 1,
                    tags: 1
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

// now we make the controller for the get user videos all the user videos so i can fetch all the video of the single user in a one go 
const getUserVideos = asyncHandler(async(req, res)=>{

    // now we get the user id from the url / route parameter 
    const { userId } = req.params;

    // validate user id 
    validateObjectId(
        userId,
        "User ID"
    )

    // now we write the basic of pagination 
    const page = Math.max(
        Number.parseInt(req.query.page ) || 1,
        1
    )

    const limit = Math.min(
        Math.max(
            Number.parseInt(req.query.limit)  || 10,
            1
        ),
        50
    )

    // now we calculate how many videos we have to skip
    // example: page 1 par 0 videos skip hongi
    // page 2 par first 10 videos skip hongi
    const skip = (page - 1)* limit ;

    // now we make the aggregation pipeline to get the videos 
    // we fetch the current user video and count the total video
    const userVideos = await Video.aggregate(
        [
            // first of all we take the cureent user with the help of $match then we take only the undeleted and unpublished video 
            {
                $match:{
                    owner: new mongoose.Types.ObjectId(userId),
                    isDeleted: false,
                    isPublished: true
                }
            },
            // now we sort the all video to the latest videos first 
            {
                $sort:{
                    createdAt: -1
                }
            },
            // now we use the facet 
            // facet se ham ek hi pipeline me do kaam karenge 
            // videos array me paginated video aayegi 
            // totalCount array me totalcount videos ki result aayegi 
            {
                $facet:{
                    // now we get the vidos for the current page 
                    videos:[
                        // first we skip the vidos from the previous page if any page is more than 1 
                        {
                            $skip:skip
                        },
                        {
                            $limit: limit
                        },
                        // now we selecte the only needed videos to the current page 
                        {
                            $project:{
                                videoFile: 1,
                                description: 1,
                                title: 1,
                                thumbnail: 1,
                                duration: 1,
                                viewCount: 1,
                                owner: 1,
                                category: 1,
                                tags: 1,
                                isPublished: 1,
                                createdAt: 1,
                                updatedAt: 1
                            }
                        }
                    ],
                    // now we count the videos
                    // ye count pagination skip aur limit se pahle ho ho jayegi 
                    // matching videos ki total count hongi
                    totalCount: [
                        {
                            $count:"totalVideos"
                        }
                    ]
                }
            }
        ]
    );

    // now we take the result from the aggregation ager result nahi toh ham empty object use karnege 
    const result = userVideos[0] || {
        videos: [],
        totalCount: []
    }

    // now we store ki hamare pass kitna videos hai ager koi video nahi mili toh hamara total videos zero rahega 
    const totalVideos = result.totalCount.length > 0 ? result.totalCount[0].totalVideos : 0

    const totalPages = Math.ceil( totalVideos / limit );


    // now we return the response 
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                videos : result.videos,
                page,
                limit,
                totalVideos,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1 && totalPages > 0
            },
            "User videos fetched Successfully"
        )
    )
})

// now we make the controller for the video updation 
// user can update its own video only 
const updateVideo = asyncHandler(async(req, res)=>{

    // first of all we take the video id from the params
    const {videoId} = req.params;

    // now we validate the videoId from the mongodb
    validateObjectId(
        videoId,
        "Video ID"
    )

    if(!videoId){
        throw new ApiError(
            404,
            "Video not found"
        )
    }

    // now we fetch the data user wants to update 
    const {title, description, category, tags } = req.body;
    
    // now we fetch the video data from the database and only the currently loggend in user can update its own video only 
    const videoResult = await Video.aggregate(
        [
            // first aggregation just to match the video 
            {
                $match:{
                    _id:  new mongoose.Types.ObjectId(videoId),
                    owner: new mongoose.Types.ObjectId(req.user._id),
                    isDeleted: false
                }
            },
            // now we project only the required field 
            {
                $project:{
                    _id: 1,
                    title: 1,
                    description: 1,
                    tags: 1,
                    category: 1,
                    thumbnail: 1,
                    videoFile: 1
                }
            }
        ]
    );

    // now we check ki hamare pass video result me kuch store hai ya nahi ager uska length kuch hoga then we can update 
    if(videoResult.length === 0){
        throw new ApiError(
            404,
            "Video not found or you are not allowed to update the video"
        )
    }

    // now we store the video data to the video object 
    const video = videoResult[0];


    // now we make an empty object jisme ham bass wohi fields ko store karnge jisse hame update karna hai 
    const updateFields = {};

    // now we check ki user ne title diya hai ya nahi 
    if(title !== undefined){

        // ager user ne tittle diya hai toh ab ham check karnge ki user ne title empty toh nahi hai 
        if(!title.trim()){
            throw new ApiError(
                400,
                "Video title cannot be empty"
            )
        }

        // now we check ki kahi video title ki length toh 150 characters se bara toh nahi hai na bhai 
        if(!title.trim().length > 150){
            throw new ApiError(
                400,
                "Video title cannot exceed 150 characters"
            )
        }


        // now we store the title into the updateFields.title filed me 
        updateFields.title = title.trim();

        // isse hoga kya ki hamare updatefiled object me title naam ka ek filed  banaega aur uske ander title ko trimmed value store ho jayega 

        
    }
    
    if(description !== undefined  ){

        // now we cehck ki user ne description diya hai ya nahi 
        if(!description.trim()){
            // matlab decription me ager kuch hai hi nahi toh hma error denge 
            throw new ApiError(
                400,
                "Video description cannot be empty"
            )
        }


        // ager user ne decription de diay hai aur uska value haamre pass undefined nahi hai toh ham check akrnege ki bhai uska luch length bhi hai ya nahi 
        if(!description.trim().length > 5000){
            throw new ApiError(
                400,
                "Video decription cannot exceed 5000 characters"
            )
        }

        // now we just update the updateFields ka decription
        updateFields.description = description.trim();
    }

    // now we check for the user ne category diya hai ya nahi 
    // ager nahi diya hoga toh ham null store karnge kyuki category dena hamare liye optional hai 
    if(category !== undefined){

        // store the category in the updateFields.category but in lowercase and trim and if not avilable then store null 
        updateFields.category = category.trim().toLowerCase() || null;
    }

    // now we chek ki user ne tag diya hai ya nhai ager nahi diya hoga toh error denge and we also store the tag in the array becasue we have to store the each tag seperattly 
    if(tags !== undefined){

        // first of store the each tags in the empty array 
        let videoTags = [];

        // now we have the 2 option for calucalting the tags ager user ne tags ko as in array diya hoga toh ham array toh just videotags me store karn denge ager user ne
        // sting me tags ko disya hoga toh ham comma ki help se ya space ki help se pahle string ko seprate karnge then ham tags ko video tags me store karnge 
        if(Array.isArray(tags)){
            videoTags = tags
        }
        else if(typeof tags === "string"){
            // now we seperate the tags using the comma 
            videoTags = tags.split(",")
        }
        else{
            throw new ApiError(
                400,
                "Invalid tags format"
            )
        }

        // now we store only filterred tags in the video tags 
        videoTags =videoTags.filter(
            (tag)=> typeof tag === "string"
        ).map(
            (tag)=> tag.trim().toLowerCase()
        ).filter(
            (tag)=> tag.length > 0
        )

        // now we remove the duplicate tags 
        videoTags = [...new Set(videoTags)];

        // now we just store the tags in the tags in the updateFields
        updateFields.tags = videoTags;
    }

    // now the most important thing in the update section is to check for the thumbnail updation 
    // now we chcek ki user ne thumbnail update ki hai ya nahi 

    // now we store the video and thumbnail old files so we will use this data after updating 
    const oldVideoFile = video.videoFile;
    const oldThumbnail = video.thumbnail;

    // now we get the new video and thumbnail from the multer 
    const videoLocalPath = req.files?.video?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    // now we make the variable to store the uploaded assets 
    let uploadedVideo;
    let uploadedThumbnail;

    // now we check ki user ne new video upload ki hai ya nhai

    // if the user provided the thumbnail then we upload it on hte cloudinary
    if(thumbnailLocalPath){

        // now we upload thumbnail on cloudinary
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

        // now we check ki hamare pass thumbnail hai bhi ya  nahi 
        if(!thumbnail){
            throw new ApiError(
                500,
                "Thumbnail Uploading failed "
            )
        }
    }

})

export {
    createVideo,
    getVideoById,
    getUserVideos
}