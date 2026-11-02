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




export {
    createPlaylist,
}