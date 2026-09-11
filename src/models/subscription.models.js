// here we make a subscription model jisme ki ham bass 2 chizo pe dhayan denge channel and the subscription , aur dono hamare pass user se hi aaynge kyuki subcriber me bhi numbers of users honge and in the channel me bhi ek user hi hoga tabhi woh comment kar sakta hai usse ham video dekh sakte hai 

import mongoose, {Schema} from "mongoose"

const subcriptionSchema = new Schema(
    {
        // here we make the subcriber 
        subscriber : {
            type : Schema.Types.ObjectId,
            // one who is subcribering
            ref : "User"
        },
        channel : {
            type : Schema.Types.ObjectId,
            // one to whom subcriber subscribing to 
            ref : "User"
        },
    },
    {
        timestamps: true
    }
)

export const subcription = mongoose.model("subcription", subcriptionSchema)