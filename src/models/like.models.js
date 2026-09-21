import mongoose,{Schema} from "mongoose"

const likeSchema = new Schema(
    {
        video:{
            type: Schema.Types.ObjectId,
            ref: "Video"
        },
        tweet:{
            type: Schema.Types.ObjectId,
            ref: "Tweet"
        },
        likedBy: {
            type: Schema.Types.ObjectId,
            ref : "User"
        },
        comment: {
            type: Schema.Types.ObjectId,
            ref : "Comment"
        },
        playlist: {
            type: Schema.Types.ObjectId,
            ref:"Playlist"
        }
    },{timestamps: true}
)

// Like.create() ke duplicate likes se bachne ke liye schema me compound unique index useful hoga.

likeSchema.index(
    {
        video: 1,
        likedBy: 1
    },
    {
        unique: true,
        partialFilterExpression: {
            video: { $exists: true }
        }
    }
)
likeSchema.index(
    {
        comment: 1,
        likedBy: 1
    },
    {
        unique: true,
        partialFilterExpression: {
            comment: { $exists: true }
        }
    }
)
likeSchema.index(
    {
        playlist: 1,
        likedBy: 1
    },
    {
        unique: true,
        partialFilterExpression: {
            playlist: { $exists: true }
        }
    }
)
likeSchema.index(
    {
        tweet: 1,
        likedBy: 1
    },
    {
        unique: true,
        partialFilterExpression: {
            tweet: { $exists: true }
        }
    }
)

// so in the partialFilterExpression we set the value uniques to true for tweet if it $exists then it does not store the value 


export const Like = new mongoose.model("Like", likeSchema)