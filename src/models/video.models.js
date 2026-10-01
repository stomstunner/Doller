import mongoose, { Schema } from "mongoose"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"

const videoSchema = new Schema(
    {
        videoFile:{
            type: String, // cloudinery url
            required : true
        },
        thumbnail:{
            type: String, /// cloudinery url
            required : true
        },
        title:{
            type: String,
            required : true,
            trim: true,
            minLength: [1, "Video title cannot be empty"],
            maxLength: [150, "Video title cannot exceed 150 characters"]
        },
        description:{
            type: String,
            required : true,
            trim: true,
            maxLength: [5000,"Video description cannot exceed 5000 characters"]
        },
        duration:{
            type: Number,/// cloudinery url gives us the duration of the video also
            required : true,
            min: 0
        },
        isPublished:{
            type: Boolean,
            default: true
        },
        owner:{
            // he or she is the video uploader = user
            type : Schema.Types.ObjectId,
            ref : "User",
            required: true
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
        deletedAt: {
            type: Date,
            default: null
        },
        viewCount: {
            type: Number,
            default: 0,
            min: 0
        }
    },{
        timestamps: true
    }
)

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video", videoSchema)