// here we make a subscription model jisme ki ham bass 2 chizo pe dhayan denge channel and the subscription , aur dono hamare pass user se hi aaynge kyuki subcriber me bhi numbers of users honge and in the channel me bhi ek user hi hoga tabhi woh comment kar sakta hai usse ham video dekh sakte hai 

import mongoose, {Schema} from "mongoose"

const subscriptionSchema = new Schema(
    {
        // here we make the subcriber 
        subscriber : {
            type : Schema.Types.ObjectId,
            // one who is subcribering
            ref : "User",
            required: true
        },
        // jis creator ko subcribe ya follow kiya jaa rha hai 
        channel : {
            type : Schema.Types.ObjectId,
            // one to whom subcriber subscribing to 
            ref : "User",
            required: true
        },
        // i want ki user tweet ke liye follow kare and video ke liye subcribe karne toh usko ham alag alag identify kar sakte hai 
        type:{
            type: String,
            enum: ["video","tweet"],
            required: true,
            default: "video"
        },
        isActive:{
            type: Boolean,
            default: true,
        },
        isNotification:{
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
)

// now we apply the condition ki document me bass ek user ek creator ko ek hi baar follow kar sakta hai 
subscriptionSchema.index(
    {
        channel: 1,
        type: 1,
        subscriber: 1
    },
    {
        unique: true
    }
);

// now we want ki indexing ho active relationship ke liye for homefeed 
subscriptionSchema.index(
    {
        subscriber: 1,
        isActive: 1,
        type: 1
    }
)

// now we want ki ham subcriber ya follow ko find karne ke liye indexing kagaye 
subscriptionSchema.index(
    {
        channel: 1,
        type: 1,
        isActive: 1
    }
)

// now we write the logic ki bhai jiska video hai woh khud ko hi subcribe ya follow nahi kar paye 
subscriptionSchema.pre("validate", function(){
    if(this.subscriber && this.channel && this.subscriber.equals(this.channel)){
        this.invalidate(
            "channel",
            "You cannot follow or subscribe yourself"
        )
    }
})

export const subscription = mongoose.model("subscription", subscriptionSchema)