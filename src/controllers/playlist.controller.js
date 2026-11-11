import mongoose from "mongoose";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Video } from "../models/video.models.js";
import { Playlist } from "../models/playlist.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { validateObjectId } from "../utils/validateObjectId.js";
import { uploadOnCloudinary , deleteFromCloudinary} from "../utils/cloudinary.js";

// now we make the first controller for the playlist that is create playlist 
const createPlaylist = asyncHandler(async(req,res)=>{

    // first of all we take the user input from the req.body 
    const {name, description, isPublic} = req.body;

    // first of all we check ki hamare pass plylist ka naam diya gaya bhi hai ya nahi usko trim kar ke ham usko vlaidate karenge 
    if(!name?.trim()){
        throw new ApiError(
            400,
            "Playlist name is required"
        )
    }
    if(!description?.trim()){
        throw new ApiError(
            400,
            "Playlist description is required"
        )
    }
    if(name.trim().length > 100){
        throw new ApiError(
            400,
            "Playlist name cannot exceed 100 words"
        )
    }
    if(description.trim().length > 500){
        throw new ApiError(
            400,
            "Playlist description cannot exceed 500 words"
        )
    }

    // now we create the playlsit into the databse 
    const playlist = await Playlist.create({
        name : name.trim(),
        description : description.trim(),
        isPublic: isPublic=== undefined? true : isPublic === "true" || isPublic === true,

        // initialy playlist thumbnail will be empty 
        thumbnail: {
            url: "",
            publicId: ""
        },
        owner: req.user._id,
    });

    // now we fetch the created playlist with the user detaul
    const createdPlaylist = await Playlist.findById(
        playlist._id
    ).populate(
        "owner",
        "fullName username avatar"
    ).lean()

    // if the playlst create not found then we show the error 
    if(!createdPlaylist){
        throw new ApiError(
            500,
            "Filed to create playlist"
        )
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            createdPlaylist,
            "Playlist created SuccessFully"
        )
    )
})

// now we make the controller for adding the video in the playlist 
const addVideoTOPlaylist = asyncHandler(async(req,res)=>{
    const {playlistId, videoId} = req.params;

    // now we validate the playlistId and videoId 
    validateObjectId(
        playlistId,
        "Playlist ID"
    )
    
    if(!playlistId){
        throw new ApiError(
            404,
            "Playlist not found"
        )
    }
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

    const playlistResult = await Playlist.aggregate(
        [
            {
                $match:{
                    _id: new mongoose.Types.ObjectId(playlistId),
                    isDeleted: false
                }
            },
            {
                // now we check wheter the current user is the owner of this playlist 
                $addFields :{
                    isOwner:{
                        $eq:[
                            "$owner",
                            new mongoose.Types.ObjectId(req.user._id)
                        ]
                    }
                }
            },
            {
                // now we check wheter the video is already in the playlist or not 
                $addFields:{
                    isVideoAlreadyAdded:{
                        $in:[
                            new mongoose.Types.ObjectId(videoId),
                            "$videos"
                        ]
                    }
                }
            },
            {
                // now we get the video information 
                from: "videos",
                let:{
                    videoId: new mongoose.Types.ObjectId(videoId),
                    // now we use the pipeline
                    $pipeline: [
                        {
                            $match:{
                                $expr:{
                                    $and:[
                                        // first
                                        {
                                            $eq:[
                                                "$_id",
                                                "$$videoId"
                                            ]
                                        },
                                        // 2nd
                                        {
                                            $eq:[
                                                "$isDeleted",
                                                false
                                            ]
                                        },
                                        // 3rd
                                        {
                                            $eq:[
                                                "$isPublished",
                                                true
                                            ]
                                        }
                                    ]
                                }
                            }
                        },
                        {
                            // now we project only required video fields 
                            $project:{
                                thumbnail: 1,
                                title: 1,
                                owner: 1
                            }
                        }
                    ],
                    as: "video"
                }
            },
            {
                // now we add fields 
                $addFields:{
                    video:{
                        $first :"$video"
                    }
                }
            },
            {
                $project: {
                    name: 1,
                    videos: 1,
                    videoCount: 1,
                    thumbnail: 1,
                    owner: 1,
                    isOwner: 1,
                    isVideoAlreadyAdded: 1,
                    video: 1
                }
            }
        ]
    );

    if(playlistResult.length === 0){
        throw new ApiError(
            404,
            "Playlist not found"
        )
    }

    // now we get the playlist object from the result
    const playlist = playlistResult[0];

    // now we cehck the current user is the owner or not 
    if(!playlist.isOwner){
        throw new ApiError(
            404,
            "You are not allowed to modify this playlist"
        )
    }
    if(!playlist.video){
        throw new ApiError(
            404,
            "Playlist video not found"
        )
    }
    // now we chekc the weater the video is already added or not 
    if(playlist.isVideoAlreadyAdded){
        throw new ApiError(
            409,
            "Video is already added to the playlist"
        )
    }

    // now we update the playlist
    // $addToSet will add video only if it is not already present
    // $inc will increase the video count by one
    // $set will update the playlist thumbnail with latest video thumbnail

    const updatePlaylist = await Playlist.findByIdAndUpdate(
        new mongoose.Types.ObjectId(playlistId),
        {
            // first of all we use add to set where it only hold the data that is not in the playlist 
            $addToSet:{
                videos : new mongoose.Types.ObjectId(videoId)
            },
            // then we increae the value of the video count in the playlist
            $inc:{
                videoCount: 1
            },
            // and we will update the whole playlist thumbnail to the newely added video 
            $set:{
                thumbnail:{
                    url:playlist.video.thumbnail.url,
                    publicId: playlist.video.thumbnail.publicId
                }
            }
        },
        {
            // we want ki ham hamesa updated value hi user ko de 
            new: true
        }
    );

    if(!updatePlaylist){
        throw new ApiError(
            500,
            "Failed to add video into the playlist"
        )
    }

    // now we fetch the final playlist 
    const finalPlaylist = await Playlist.aggregate(
        [
            {
                $match:{
                    _id: new mongoose.Types.ObjectId(playlistId),
                    isDeleted: false
                }
            },
            {
                $lookup:{
                    from: "users",
                    localField: "owner",
                    foreignField:"_id",
                    as: "owner",
                    pipeline:[
                        {
                            $project:{
                                fullName: 1,
                                username: 1,
                                avatar: 1
                            }
                        }
                    ]
                }
            },
            {
                $addFields:{
                    owner:{
                        $first: "$owner"
                    }
                }
            },
            {
                $project: {
                    name: 1,
                    description: 1,
                    isPublic: 1,
                    thumbnail: 1,
                    videos: 1,
                    videoCount: 1,
                    saveCount: 1,
                    shareCount: 1,
                    owner: 1,
                    createdAt: 1,
                    updatedAt: 1
                }
            }
        ]
    );

    if(finalPlaylist.length === 0){
        throw new ApiError(
            500,
            "failed to fetch updated playlist"
        )
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            finalPlaylist[0],
            "Video added to playlist SuccessFully"
        )
    )
})

// now we make the controller for the remove the controller for the remove video from playlist 
const removeVideoFromPlaylist = asyncHandler(async(req,res)=>{
    const {playlistId, videoId} = req.params;
    validateObjectId(
        playlistId,
        "Playlist ID"
    )
    if(!playlistId){
        throw new ApiError(
            404,
            "Playlist not found"
        )
    }
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
    const playlistObjectId = new mongoose.Types.ObjectId(playlistId)
    const videoObjectId = new mongoose.Types.ObjectId(videoId)

    // now we fetch the playlist using aggregation 
    const playlistResult = await Playlist.aggregate(
        [
            {
                $match:{
                    _id: playlistObjectId,
                    isDeleted: false,
                    owner: new mongoose.Types.ObjectId(req.user._id)
                }
            },
            {
                // now we check ki hamare playlist me ye current video added hai ya nahi 
                $addFields:{
                    isVideoAdded:{
                        $in:[
                            videoObjectId,
                            "$videos"
                        ]
                    }
                }
            },
            {
                // now we remove the video id from the databse without actully undating the database 
                $addFields:{
                    remainingVideos :{
                        input: "$videos",
                        as: "videoId",
                        cond:{
                            $ne:[
                                "$videoId",
                                videoObjectId
                                // like we are take the videos in the remainingVideos that are not equal to the videoobject id and the current video object id
                            ]
                        }
                    }
                }
            },
            {
                // now we get the latest remmaning videos 
                // remainingVideos array ka last element
                // latest remaining video ki id hogi
                $lookup:{
                    from:"videos",
                    let:{
                        latestVideoId:{
                            $arrayElemAt:[
                                "$remainingVideos",
                                -1
                            ]
                        }
                    },
                    pipeline:[
                        {
                            // now we match that video in video collection 
                            $match:{
                                $expr:{
                                    $eq:[
                                        "$_id",
                                        "$$latestVideoId"
                                    ]
                                }
                            }
                        },
                        {
                            // now we get only thumbnailinformation 
                            $project:{
                                thumbnail: 1
                            }
                        }
                    ],
                    as:"latestVideo"
                }
            },
            {
                $addFields:{
                    // now we convert the latest video array to an object 
                    latestVideo:{
                        $first:"$latestVideo"
                    }
                }
            },
            {
                $project:{
                    videos: 1,
                    videoCount: 1,
                    isOwner: 1,
                    isVideoAdded: 1,
                    remainingVideos: 1,
                    latestVideo: 1
                }
            }
        ]
    )

    // now we cehk ki hamare palylist result me kuch hai bhi ya nahi 
    if(playlistResult.length === 0){
        throw new ApiError(
            404,
            "Playlist not found"
        )
    }

    // now we get the playlist data 
    const playlist = playlistResult[0];

    // now we check weater the video is added in the playlist or not 
    if(!playlist.isVideoAdded){
        throw new ApiError(
            404,
            "Video is not present in this playlist"
        )
    }

     // now we initialize the thumbnail as empty
    // if no video remains in playlist then thumbnail will be empty
    let thumbnail = {
        url: "",
        publicId: ""
    };

    // if any video remains in the playlist then we use his thumbnail
    if(playlist.latestVideo){
        thumbnail={
            url:playlist.latestVideo.thumbnail.url,
            publicId: playlist.latestVideo.thumbnail.publicId
        }
    }

    // now we remove the video and and update thumbnail in one databse operation 
    const updatedPlaylist = await Playlist.findOneAndUpdate(
        {
            _id: playlistObjectId,
            owner: new mongoose.Types.ObjectId(req.user._id),
            isDeleted: false,
            videos: { 
                $elemMatch: { 
                    $eq: videoObjectId
                } 
            }

        },
        {
            // now we remove the current video form the video array 
            $pull:{
                videos: videoObjectId
            },
            // decrease video count by one 
            $inc:{
                videoCount: -1
            },
            // update playlist thumbnail 
            $set:{
                thumbnail: thumbnail
            }
        },
        {
            new: true
        }
    );

    if(!updatedPlaylist){
        throw new ApiError(
            409,
            "Failed to remove video from playlist"
        )
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatedPlaylist,
            "Video removed from playlist SuccessFully"
        )
    )
})

// now we make the controller for the getPlayListById 
const getPlaylistById = asyncHandler(async(req,res)=>{

    // first of all we get the playlist id and user is 
    const {playlistId}= req.params;

    validateObjectId(
        playlistId,
        "Playlist ID"
    )

    if(!playlistId){
        throw new ApiError(
            404,
            "Playlist id is required"
        )
    }

    const playlistObjectId = new mongoose.Types.ObjectId(playlistId);
    const userObjectId = new mongoose.Types.ObjectId(req.user._id);

    // now we get the playlistResult 
    const playlistResult = await Playlist.aggregate(
        [
            {
                $match:{
                    _id: playlistObjectId,
                    isDeleted: false,
                    // now we write the code if the user is not the owner then they can see the public playlist or if they are the owner then they can see the playlist wheater is was private 
                    $or:[
                        {
                            isPublic : true,
                        },
                        {
                            owner : userObjectId,
                        }
                    ]

                }
            },
            {
                // now we look in to the user model 
                $lookup:{
                    from: "users",
                    localField:"owner",
                    foreignField:"_id",
                    as: "owner",
                    pipeline:[
                        $project:{
                            fullName: 1,
                            username: 1,
                            avatar: 1   
                        }
                    ]
                }
            },
            {
                // now we chage the array of the ower field to the object 
                $addFields:{
                    owner:{
                        $first:"$owner"
                    }
                }
            },
            {
                // at the last we take only the required fields from the playlist 
                $project:{
                    name: 1, 
                    description: 1,
                    owner: 1,
                    videoCount:1,
                    saveCount: 1,
                    isPublic: 1,
                    isDeleted: 1,
                    createdAt: 1,
                    thumbnail: 1,
                    updatedAt: 1
                }
            }
        ]
    );

    // now we check ki hamare paslylist ki koi result hai bhi ya empty toh nahi 
    if(playlistResult.length === 0){
        throw new ApiError(
            408,
            "Playlist not found or you are not allowed to access the playlist"
        )
    }

    const playlist = playlistResult[0];

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            playlist,
            "Playlist Fetched SuccessFully"
        )
    )
})

// now we make the controller that will fetched or show all the playlist video at once
const getPlaylistVideos = asyncHandler(async(req, res)=>{
    // first of all we ge the playlist id from the req params
    const {playlistId} = req.params;

    validateObjectId(
        playlistId,
        "Playlist ID"
    )
    if(!playlistId){
        throw new ApiError(
            404,
            "Playlist Id is required"
        )
    }

    
    // now we  write the code for the pagination to fetch the playlist video more efficently
    
    const page = Math.max(
        Number.parseInt(req.query.page) || 1,
        1
    )
    const limit = Math.min(
        Math.max(
            Number.parseInt(req.query.limit) || 20,
            1
        ),
        100
    )
    const skip = (page - 1) * limit;
    
    // now we convet the userId to the object id 
    const playlistObjectId = new mongoose.Types.ObjectId(playlistId);
    const userObjectId = new mongoose.Types.ObjectId(req.user._id);

    const playlistResult = await Playlist.aggregate(
        [
            {// first aggregation pipeline
                $match:{
                    _id: playlistObjectId,
                    isDeleted: false,
                    // now we want that if the user is the owner then he can see the published or unpublised video or 
                    $or:[
                        {
                            isPublic: true
                        },
                        {
                            owner: userObjectId
                        }
                    ]
                }
            },
            {
                $lookup:{
                    from:"videos",
                    let:{
                        videoIds:"$videos"
                    },
                    as: "videoList",
                    pipeline:[
                        {// we match the videos that are published and not deleted 
                            $match:{
                                isDeleted: false,
                                isPublished: true
                            }
                        },
                        {
                            // now we lookup the owner the owner of each video 
                            $lookup:{
                                from:"videos",
                                localField: "owner",
                                foreignField:"_id",
                                as:"owner",
                                pipeline:[
                                    {
                                        $project:{
                                            fullName: 1,
                                            username: 1,
                                            avatar: 1
                                        }
                                    },
                                    {
                                        $addFields:{
                                            owner:{
                                                $first:"$owner"
                                            }
                                        }
                                    },
                                    {
                                        $project:{
                                            _id: 1,
                                            videoFile: 1,
                                            thumbnail: 1,
                                            title: 1,
                                            description: 1,
                                            duration: 1,
                                            viewCount: 1,
                                            owner: 1,
                                            createdAt: 1,
                                            updatedAt: 1
                                        }
                                    }
                                ]
                            }
                        }

                    ]
                }
            },
            {
                // now we use the facet to get paginated videos and total count in one go 
                $facet:{
                    videos:[
                        {
                            $unwind:"$videoList"
                        },
                        {
                            $replaceRoot:{
                                newRoot:"$videoList"
                            }
                        },
                        {
                            $skip: skip
                        },
                        {
                            $limit: limit
                        }
                    ],
                    totalCount:[
                        {
                            $project:{
                                totalVideos:{
                                    $size:"$videoList"
                                }
                            }
                        }
                    ]
                }
            }
        ]
    );

    if(!playlistResult || playlistResult.length === 0){
        throw new ApiError(
            404,
            "Playlist not found or you don't have permission to access it"
        )
    }

    // now we take the result from the aggragation ager result nahi toh ham empty object use karnege 
    const result = playlistResult[0] || {
        videos:[],
        totalCount: []
    }

    // now we store ki hamre pass kitna videos hai 
    const videos = result.videos || [];
    const totalVideos = result.totalCount.length > 0 ?  result.totalCount[0].totalVideos : 0;
    const totalPages = Math.ceil(totalVideos / limit);

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                videos,
                page,
                limit,
                totalVideos,
                totalPages,
                hasNextPage : page < totalPages,
                hasPreviousPage : page > 1
            },
            "Playlist Video Fetched SuccessFully"
        )
    )

})

// now we make the controller for the playlist getting by the user his own playlist 
const getUserPlaylists = asyncHandler(async(req, res)=>{
    // first of all we ge the playlist id from the req params
    const {userId} = req.params;

    validateObjectId(
        userId,
        "User ID"
    )
    if(!userId){
        throw new ApiError(
            404,
            "User Id is required"
        )
    }

    
    // now we  write the code for the pagination to fetch the playlist video more efficently
    
    const page = Math.max(
        Number.parseInt(req.query.page) || 1,
        1
    )
    const limit = Math.min(
        Math.max(
            Number.parseInt(req.query.limit) || 20,
            1
        ),
        100
    )
    const skip = (page - 1) * limit;
    
    // now we convet the userId to the object id 
    const targetUserObjectId = new mongoose.Types.ObjectId(userId);
    const loggedInUserObjectId = new mongoose.Types.ObjectId(req.user._id);

    const playlistResult = await Playlist.aggregate(
        [
            {// first aggregation pipeline
                $match:{
                    owner: targetUserObjectId,
                    isDeleted: false,
                    // now we want that if the user is the owner then he can see the published or unpublised video or 
                    $or:[
                        {
                            isPublic: true
                        },
                        {
                            owner: loggedInUserObjectId
                        }
                    ]
                }
            },
            {
                $sort:{
                    createdAt: -1
                }
            },
            {
                $lookup:{
                    from:"users",
                    localField:"owner",
                    foreignField: "_id",
                    as: "owner",
                    pipeline:[
                        {
                            $project:{
                                fullName: 1,
                                username: 1,
                                avatar: 1
                            }
                        }
                    ]
                }
            },
            {
                $addFields:{
                    owner: {
                        $first: "$owner"
                    }
                }
            },
            {
                // now we use the facet to get paginated videos and total count in one go 
                $facet:{
                    playlists:[
                        {
                            $skip: skip
                        },
                        {
                            $limit: limit
                        }
                    ],
                    totalCount:[
                        {
                            $count: "totalPlaylists"
                        }
                    ]
                }
            }
        ]
    );

    if(!playlistResult || playlistResult.length === 0){
        throw new ApiError(
            404,
            "Playlist not found or you don't have permission to access it"
        )
    }

    // now we take the result from the aggragation ager result nahi toh ham empty object use karnege 
    const result = playlistResult[0] || {
        playlists:[],
        totalCount: []
    }

    // now we store ki hamre pass kitna videos hai 
    const playlists = result.playlists || [];
    const totalPlaylists = result.totalCount.length > 0 ?  result.totalCount[0].totalPlaylists : 0;
    const totalPages = Math.ceil(totalPlaylists / limit);

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                playlists,
                page,
                limit,
                totalPlaylists,
                totalPages,
                hasNextPage : page < totalPages,
                hasPreviousPage : page > 1
            },
            "User Playlist Fetched SuccessFully"
        )
    )

})

// now we make the getMyPlaylists controller 
const getMyPlaylists = asyncHandler(async(req, res)=>{
    // first of all we ge the playlist id from the req params
    // const {userId} = req.params;

    // validateObjectId(
    //     userId,
    //     "User ID"
    // )
    // if(!userId){
    //     throw new ApiError(
    //         404,
    //         "User Id is required"
    //     )
    // }

    
    // now we  write the code for the pagination to fetch the playlist video more efficently
    
    const page = Math.max(
        Number.parseInt(req.query.page) || 1,
        1
    )
    const limit = Math.min(
        Math.max(
            Number.parseInt(req.query.limit) || 20,
            1
        ),
        100
    )
    const skip = (page - 1) * limit;
    
    // now we convet the userId to the object id 
    // const userObjectId = new mongoose.Types.ObjectId(userId);
    const userObjectId = new mongoose.Types.ObjectId(req.user._id);

    const playlistResult = await Playlist.aggregate(
        [
            {// first aggregation pipeline
                $match:{
                    owner: userObjectId,
                    isDeleted: false,
                    // now we want that if the user is the owner then he can see the published or unpublised video or 
                    $or: [
                        { 
                            isPublic: true 
                        },
                        { 
                            owner: userObjectId 
                        }
                    ]
                }
            },
            {
                $sort:{
                    createdAt: -1
                }
            },
            {
                $lookup:{
                    from:"users",
                    localField:"owner",
                    foreignField: "_id",
                    as: "owner",
                    pipeline:[
                        {
                            $project:{
                                fullName: 1,
                                username: 1,
                                avatar: 1
                            }
                        }
                    ]
                }
            },
            {
                $addFields:{
                    owner: {
                        $first: "$owner"
                    }
                }
            },
            {
                // now we use the facet to get paginated videos and total count in one go 
                $facet:{
                    playlists:[
                        {
                            $skip: skip
                        },
                        {
                            $limit: limit
                        }
                    ],
                    totalCount:[
                        {
                            $count: "totalPlaylists"
                        }
                    ]
                }
            }
        ]
    );

    if(!playlistResult || playlistResult.length === 0){
        throw new ApiError(
            404,
            "Playlist not found or you don't have permission to access it"
        )
    }

    // now we take the result from the aggragation ager result nahi toh ham empty object use karnege 
    const result = playlistResult[0] || {
        playlists:[],
        totalCount: []
    }

    // now we store ki hamre pass kitna videos hai 
    const playlists = result.playlists || [];
    const totalPlaylists = result.totalCount.length > 0 ?  result.totalCount[0].totalPlaylists : 0;
    const totalPages = Math.ceil(totalPlaylists / limit);

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                playlists,
                page,
                limit,
                totalPlaylists,
                totalPages,
                hasNextPage : page < totalPages,
                hasPreviousPage : page > 1
            },
            "My Playlist Fetched SuccessFully"
        )
    )

})


// now we make the controller for update the playlist 
const updatePlaylist = asyncHandler(async(req, res)=>{

    // now we take the playlist id from params 
    const {playlistId} = req.params;

    validateObjectId(
        playlistId,
        "Playlist ID"
    );
    if(!playlistId){
        throw new ApiError(
            404,
            "Playlist Id not Found"
        )
    }

    // now we take the updation data from the playlist 
    const {name, description, isPublic} = req.body;

    const playlist = await Playlist.findOne({
        _id: playlistId,
        isDeleted: false,
        owner: req.user._id
    })

    if(!playlist){
        throw new ApiError(
            404,
            "Playlist not found or you are not allowed to update this Playlist"
        )
    }

    // now we see that ki hamara name of the prlaylist jo hai kya woh sahi tarike se diaya gaya bhi hai ya nahi 
    if(name !== undefined){

        // now we ckeck ki ky hamare name  ko trim karne ke baad kuch bachta bhi ya nahi ager nahi bachta toh ham error denge ek 
        if(!name?.trim()){
            throw new ApiError(
                400,
                "Playlist name cannot be empty"
            )
        }
        // now we see ki kahi hamara pahlylist ka nammm kahi uske given length se bara toh nhai hai  na 
        if(name?.trim().length > 100){
            throw new ApiError(
                400,
                "Playlist name cannot excedd the length of the 100"
            )
        }

        // now we just simple save the playlist name to the user given name 
        playlist.name = name.trim();
    }

    // same thing for the decription  also 
    if(description !== undefined){
        if(!description?.trim()){
            throw new ApiError(
                400,
                "description cannot be empty"
            )
        }
        if(!description?.trim().length > 500){
            throw new ApiError(
                400,
                "description length cannot exceed the 500 character limit"
            )
        }

        // after all checking we jsut save the  desription from the user to the playlist privious description

        playlist.description = description.trim();
    }

    // now we cehk for the playlist is public or not 
    if(isPublic !== undefined){
        playlist.isPublic = isPublic === "true" || isPublic === true;
        // ager isPublic user ne flase diay hai toh hamara pahlylist.ispublic me hamara false save hoga jisse hamar palylist autometiclaly private ho jayega 
    }
    await playlist.save();


    // now we fetched the pupulated 
    const updatedPlaylist = await Playlist.findById(playlistId)
    .populate(
        "owner",
        "username fullName avatar"
    )
    .lean()

    if(!updatedPlaylist){
        throw new ApiError(
            500,
            "Failed to fetch the updated playlist result"
        )
    }

    return res
    .status(200)
    .json(
        new ApiError(
            200,
            updatedPlaylist,
            "Playlist Updated Successfully"
        )
    )
})


export {
    createPlaylist,
    addVideoTOPlaylist,
    removeVideoFromPlaylist,
    getPlaylistById,
    getPlaylistVideos,
    getUserPlaylists,
    updatePlaylist,
    
}