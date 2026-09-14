import mongoose, {Schema} from "mongoose"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"

const CommentSchema = new Schema(
    {
        content:{
            type: String,
            required: true
        },
        video:{
            type: Schema.Types.ObjectId,
            ref: "Video"
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }

    },{timestamps: true}
)

// here we use the comment schema ke liye mongoose ka paginate mehtod jo ki help karta hai limited amount of data page pe show karne ke liye 

CommentSchema.plugin(mongooseAggregatePaginate)
// kiss naam se table banana hai aur kaha se data lana hai 
export const Comment = new mongoose.model("Comment", CommentSchema)