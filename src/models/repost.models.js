import mongoose, { Schema } from "mongoose";


const repostSchema = new Schema({
    tweet:{
        type: Schema.Types.ObjectId,
        ref: "Tweet"
    },
    video: {
        type: Schema.Types.ObjectId,
        ref: "Video"
    },
    playlist: {
        type: Schema.Types.ObjectId,
        ref: "Playlist"
    },
    repostedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
},{timestamps: true});

// now we write the repost scehma for storing one document only 
repostSchema.index(
    {
        tweet: 1,
        repostedBy: 1
    },
    {
        unique: true,
        partialFilterExpression: {
            tweet: {
                $exists: true
            }
        }
    }
)
repostSchema.index(
    {
        video: 1,
        repostedBy: 1
    },
    {
        unique: true,
        partialFilterExpression: {
            video: {
                $exists: true
            }
        }
    }
)
repostSchema.index(
    {
        playlist: 1,
        repostedBy: 1
    },
    {
        unique: true,
        partialFilterExpression: {
            playlist: {
                $exists: true
            }
        }
    }
)

export const Repost = mongoose.model("Repost", repostSchema);