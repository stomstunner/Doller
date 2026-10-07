import mongoose,{Schema} from "mongoose";

const watchHistorySchema = new Schema({
    // first field we make woh hoga ki ham kis user ka watch hsitory store kar rahe hai 
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    // now we make which video user is watched 
    video: {
        type: Schema.Types.ObjectId,
        ref: "Video",
        required: true,
        index: true,
    },
    // now we store the total duration of the video 
    videoDuration: {
        type: Number,
        required: true,
        min: 0,
    },
    // actual amount of time user watched the video in seconds 
    watchDuration: {
        type: Number,
        required: true,
        min: 0,
    },
    // most important thing for video recommendation
    watchPercentage : {
        type : Number,
        min: 0,
        max: 100,
        default: 0
    },
    isCompleted: {
        type: Boolean,
        default: false,
    },
    // now we store the where user is last stopped the video so it can helpful for continue watching 
    lastPosition: {
        type: Number,
        default: 0,
        min: 0
    },
    // now we store for how many times the user watch the video 
    watchCount: {
        type: Number,
        default: 1,
        min: 0
    },
    // now we store ki user ne last time kab is video ko watch kiya tha 
    lastWatchedAt: {
        type: Date,
        default: Date.now
    }
}, {timestamps: true})

// now we want ki har 1 user ke liye har ek video ka bass 1 hi watchhistory document ho 
watchHistorySchema.index(
    {
        user: 1,
        video: 1
    },
    {
        unique: true
    }
)

// now we index the video in a fassion that when we want ki user ne last video kon sa dekha tha 
watchHistorySchema.index(
    {
        user: 1,
        lastWatchedAt: -1
        // for decending order with repect to date // latest 
    }
)

// now we make a indexing where we want ki kisi perticular video ko kin kin user ne kitne baje dekha hai like user ko arrange karna hai ki kisi 1 video ko kitna latest dekha gaya hai 
watchHistorySchema.index(
    {
        video: 1,
        lastWatchedAt: -1
    }
)

export const WatchHistory = new mongoose.model("WatchHistory", watchHistorySchema);