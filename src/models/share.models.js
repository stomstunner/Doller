import mongoose,{Schema} from "mongoose";

const shareSchema = new Schema(
    {
        sharedBy:{
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        video:{
            type: Schema.Types.ObjectId,
            ref: "Video",
        },
        tweet:{
            type: Schema.Types.ObjectId,
            ref: "Tweet"
        },
        comment:{
            type : Schema.Types.ObjectId,
            ref: "Comment"
        },

    },
    {
        timestamps: true
    }
)

// Exactly one share target must be present
shareSchema.pre("validate", function(){
    const targetCount = [
        this.video,
        this.comment,
        this.tweet
    ].filter(Boolean).length;

    if(targetCount !== 1){
        this.invalidate(
            "video",
            "Share must refrence exactly one target"
        )
    }
})

export const Share = new mongoose.model("Share", shareSchema);