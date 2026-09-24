import mongoose,{Schema} from "mongoose";

const playlistSchema = new Schema({
    name: {
        type: String,
        required: true ,
        minLength: 1,
        maxLength: 100,
        trim: true,
    },
    description: {
        type: String,
        required: [true, "Playlist description is required"],
        maxLength: 500,
    },
    saveCount:{
        type: Number,
        default: 0,
        min: 0,
    },

    videoCount: {
        type: Number,
        default: 0,
        min: 0
    },
    isPublic: {
        type: Boolean,
        default: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    thumbnail: {
        type: String,
        default: ""
    },
    // so we store the ids of the videos in an array 
    videos: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    owner:{
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

},{timestamps: true})

export const Playlist = new mongoose.model("Playlist", playlistSchema)