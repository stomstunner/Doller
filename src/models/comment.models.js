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
            required: true,
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // now  we make a filed for parent comment ager jo kisi se first time khud se commet kiya hai toh uska parent ka vlaue null hoga 
        // but ager kisi ne pahle se kiye hue commnet pe replay diya hai toh uska parent ka id default me dala jayega
        parentCommnet: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
            default: null,
        }
        // 

    },{timestamps: true}
)

// here we use the comment schema ke liye mongoose ka paginate mehtod jo ki help karta hai limited amount of data page pe show karne ke liye 

CommentSchema.plugin(mongooseAggregatePaginate)
// kiss naam se table banana hai aur kaha se data lana hai 
export const Comment = new mongoose.model("Comment", CommentSchema)