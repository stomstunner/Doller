import mongoose, {Schema} from "mongoose"

const tweetSchema = new Schema({
    content: {
        type: String,
        required: true,
        trim: true,
        minLength: [1, "Tweet cannot be empty"],
        maxLength: [300, "Tweet cannot exceeded 300 characters"]
    },
    owner:{
        type: Schema.Types.ObjectId,
        ref:"User",
        required: true,
    },
    mentions: [
            {
            type: Schema.Types.ObjectId,
            ref: "User",
        }
    ],
    isDeleted : {
        type: Boolean,
        default: false,
    },
    deletedAt : {
        type: Boolean,
        default: false,
    },
    isEdited: {
        type: Boolean,
        default: false,
    },
    isPinned: {
        type: Boolean,
        default: false,
    },
    editedAt: {
        type: Date,
        default: null,
    },
    replyCount: {
        type: Number,
        default: 0,
        min: 0
    },
    likeCount: {
        type: Number,
        default: 0,
        min: 0
    },
    saveCount: {
        type: Number,
        default: 0,
        min: 0
    },
    repostCount: {
        type: Number,
        default: 0,
        min: 0
    },
    images: [
        {
            url: {
                type: String
            },
            publicId: {
                type: String
            }
        }
    ]
},{timestamps: true})

export const Tweet = new mongoose.model("Tweet", tweetSchema)