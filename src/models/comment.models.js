import mongoose, {Schema} from "mongoose"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"

const CommentSchema = new Schema(
    {
        content:{
            type: String,
            required:  [true, "Comment content is required"],
            trim: true,
            minlength: [1, "Comment cannot be empty"],
            maxlength: [1000, "Comment cannot exceed 1000 words"]
        },
        video:{
            type: Schema.Types.ObjectId,
            ref: "Video",
            // default: null is used for optional reference fields like video, tweet, or parentComment. It indicates that no related document is linked yet and allows the same Comment model to be used for different types of comments without requiring every reference field to have a value.
            default: null,
        },
        tweet:{
            type: Schema.Types.ObjectId,
            ref: "Tweet",
            default: null,
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // now  we make a filed for parent comment ager jo kisi se first time khud se commet kiya hai toh uska parent ka vlaue null hoga 
        // but ager kisi ne pahle se kiye hue commnet pe replay diya hai toh uska parent ka id default me dala jayega
        parentComment: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
            default: null,
        },
        // now we make a delete model jo ki databse se delete nahi karega bass frontend pe show karega ki commnet delete ho gaya hai 
        isDeleted: {
            type: Boolean,
            default: false,
        },
        // now we make a feature for when the owner of the video or the tweet and they want to pin your commnet 
        isPinned: {
            type: Boolean,
            default: false,
        },
        replyCount:{
            type: Number,
            default: 0,
            min: 0,
        }

    },{timestamps: true}
)

// Video ke comments newest-first fetch karne ke liye
CommentSchema.index(
    {
        video: 1,
        // 1 ka matlab hai accesnding(jo pahle video) order me rakho aur -1 ka matlab hai decending order me (oldest pahle like jo abhi just commnet hua hai usse usper)
        parentComment: 1, 
        isPinned: -1,
        createdAt: -1
    }
)
// now we writ the indexing code for the tweet 
CommentSchema.index(
    {
        tweet: 1,
        parentComment: 1,
        isPinned: -1,
        createdAt: -1,
    }
)

// so in the replay we write created at 1 so purana comment ka replay pahle aur naya ka baad me 
// Ek comment ke replies ke liye
CommentSchema.index(
    {
        parentComment: 1,
        createdAt: 1
    }
)



// here we use the comment schema ke liye mongoose ka paginate mehtod jo ki help karta hai limited amount of data page pe show karne ke liye 

CommentSchema.plugin(mongooseAggregatePaginate)
// kiss naam se table banana hai aur kaha se data lana hai 
export const Comment = new mongoose.model("Comment", CommentSchema)