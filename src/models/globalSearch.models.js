import mongoose , {Schema} from "mongoose";

const globalSearchSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required : true,
            index: true 
        },
        // here we store ki user ne kon kon sa data search kiya hai 
        query:{
            type: String,
            required: true,
            trim: true,
            minLength: [1, "Search Query Cannot be Empty"],
            maxLength:[200, "Search Query Cannot exceed  200 exceed characters"]
        },
        // now we store ki search kaha ho raha hai kiss type ka search hai 
        // all = user + video + tweet
        // user = user only and so only
        searchType: {
            type: String,
            enum:["all", "user", "video", "tweet"],
            default: all,
            required: true
        },
        // now we store the total number of result we get 
        resultCount:{
            type: Number,
            default: 0,
            min: 0
        },
        searchedAt: {
            type: Date,
            default: Date.now,
            index: true
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
        normalizedQuery:{
            type: String,
            required: true,
            lowercase: true,
            trim : true
        }
    }, 
    {
        timestamps: true
    }
)

// now we write the indexing code 
// is user ne ky ky search kiya hai date ke according latest first 
// like user ko search karo then uske searchin ko 
globalSearchSchema.index(
    {
        user: 1,
        searchedAt : -1
    }
)

// now we want ki iss user ne kin kin videos ko search kiye hau sirf no sorting
globalSearchSchema.index(
    // user ko search karo then uske videoQuery ko 
    {
        user: 1,
        searchType: 1,
        // searchedAt: -1,
        normalizedQuery: 1
    },
    {
        unique: true
    }
)


export const GlobalSearch = new mongoose.model("GlobalSearch", globalSearchSchema);