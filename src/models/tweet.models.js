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
    isDeleted : {
        type: Boolean,
        default: false,
    },
    isEdited: {
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
    }
},{timestamps: true})

export const Tweet = new mongoose.model("Tweet", tweetSchema)