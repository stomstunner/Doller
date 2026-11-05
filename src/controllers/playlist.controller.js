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
    if(!playlist.isVideoAlreadyAdded){
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





export {
    createPlaylist,
    addVideoTOPlaylist,
    removeVideoFromPlaylist,
}