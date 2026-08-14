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
            required : true
        },
        description:{
            type: String,
            required : true
        },
        duration:{
            type: Number,/// cloudinery url gives us the duration of the video also
            required : true
        },
        views:{
            type: Number,
            default: 0
        },
        isPublished:{
            type: Boolean,
            default: true
        },
        owner:{
            // he or she is the video uploader = user
            type : Schema.Types.ObjectId,
            ref : "User"
        }
    },{
        timestamps: true
    }
)

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video", videoSchema)