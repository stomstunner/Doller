import mongoose, { Schema } from "mongoose";

const viewSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    tweet: {
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
    viewedAt: {
        type: Date,
        default: Date.now
    }
},{timestamps: true})

// now we make the index ki ek user ek tweet ya video ya playlist ka ek hi view document hoga
// isliye ham same user aur same tweet ka new document nahi banayenge 

viewSchema.index(
    {
        user: 1,
        tweet: 1
    },
    {
        unique: true,
        partialFilterExpression:{
            tweet: {
                $exists: true
            }
        }
    }
)

viewSchema.index(
    {
        user: 1,
        video: 1
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

viewSchema.index(
    {
        user: 1,
        playlist: 1
    },
    {
        unique: true,
        partialFilterExpression:{
            playlist: {
                $exists: true
            }
        }
    }
)

export const View = new mongoose.model("View", viewSchema)