import mongoose,{Schema} from "mongoose";

// this is a model that thelp us to track how many times a video and a tweet or a creator apperar on the user profile for the hoom feed 
// video for video home feed 
// tweet for tweet home feed 
// user for the creator discovery and follow and subscribe 

const feedImpressionSchema = new Schema({
    // kis user ko content dikhaya gaya 
    user:{
        type:Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    // kis type ke content dikhaye gaye 
    contentType:{
        type: String,
        enum:["user","video","tweet"],
        required: true
    },
    // for mongoose populate we have the same name
    contentModel:{
        type:String,
        enum:["Video", "Tweet", "User"],
        required: true
    },
    // now we write ki user ko kon se contentType ka chiz dikhaye a gaya
    // video ager contetn type dikhaya gaya toh uska object id store ho and same for other 2 
    contentId:{
        type:Schema.Types.ObjectId,
        refPath:"contentModel",
        required: true
    },
    // now we store ki hme content first time kab dikhaya gaya 
    firstShownAt:{
        type:Date,
        default: Date.now,
        required: true
    },
    // recently kab show hua tha
    lastShownAt:{
        type:Date,
        default: Date.now,
        required: true
    },
    // now we store ki same user ko same content kitni baar dikaye  gai 
    // like ager target and user and content type match karta hai toh ham impresseion count ko badha denge 
    impressionCount:{
        type: Number,
        default: 1,
        min: 1
    },
    // impression ka matlab hota hai user ko content dikhaya gaya kya usne usse open kiya toh uske liye ham iss field me store akrnege 
    wasOpened:{
        type: Boolean,
        default: false
    },
    // here we store ki ager hamne user ko koi tweet, video dikhayi ya creator profile dikhyi toh kitni der baad open hui jisse hame pata chal sake ki feed me aane ke kitni dar baad user ne use open kiya 
    openedAt:{
        type: Date,
        default: null
    },
    // now we store ki kis feed type ke yaha se impression aaya 
    feedType:{
        type: String,
        trim: true,
        default: null
    }
},
{
    timestamps: true
}
);

// ek user and 1 content type aur ek target ke liye ek document summery hoga na ki alag alag 
feedImpressionSchema.index(
    {
        contentType: 1,
        user: 1,
        contentId: 1  
    },
    {
        unique: true
    }
)
// user ki recent impression nikalne ke liye ham user, lastShownAt, contentType ka help lenge 
feedImpressionSchema.index(
    {
        user: 1,
        contentType: 1,
        lastShownAt: -1
    }
)

// feed specfic histroy and anlytics ke liye 
feedImpressionSchema.index(
    {
        user: 1,
        feedType: 1,
        lastShownAt: 1
    }
)

export const FeedImpression = new mongoose.model("FeedImpression", feedImpressionSchema);