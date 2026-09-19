import mongoose,{Schema} from "mongoose";

const playlistSchema = new Schema({
    name: {
        type: String,
        required: true 
    },
    description: {
        type: String,
        required: true
    },
    saveCount:{
        type: Number,
        default: 0
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
        ref: "User"
    },

},{timestamps: true})

export const Playlist = new mongoose.model("Playlist", playlistSchema)