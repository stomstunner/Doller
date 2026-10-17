import mongoose from "mongoose";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { validateObjectId } from "../utils/validateObjectId.js";
import { asyncHandler } from "../utils/asynchandler.js";

import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { Comment } from "../models/comment.models.js";
import { WatchHistory } from "../models/watchHistory.models.js";
import { Like } from "../models/like.models.js";
import { GlobalSearch } from "../models/globalSearch.models.js";
import { View } from "../models/view.models.js";
import { Repost } from "../models/repost.models.js";
import { Tweet } from "../models/tweet.models.js";
import { Share } from "../models/share.models.js";
import { Playlist } from "../models/playlist.models.js";
import { Subscription } from "../models/subscription.models.js";

// now we have to define the each user activity 
const SIGNAL_WEIGHT = {
    completeWatch: 5,
    longWatch : 4,
    partialWatch: 2,

    like: 5,
    commentLike: 4,
    comment: 3,

    repost : 6,
    share: 6,

    playlistAdd: 4,
    search: 4,

    subscription: 4,
    follower: 4
}

    // Convert content text into simple interest keywords.
    // This is a basic fallback, not a replacement for real topic tags.
    /*
        Code kya kar raha hai
    1. text = ""
    Agar function ko text na mile, toh khaali string use hoti hai. (Lekin null pass kiya toh yeh default apply nahi hota.)
    2. stopWords
    Aise aam shabd hataata hai jo topic samajhne mein zyada madad nahi karte—jaise "the", "and", "hai", "aur".
    3. .toLowerCase()
    Sab letters lowercase karta hai, taaki "Cricket" aur "cricket" alag na gine jaayen.
    4. URL hataana
    https://... jaise links hataata hai, kyunki link ke tukde topic keywords nahi hote.
    5. Punctuation hataana
    Comma, !, ? jaise characters ko spaces se badalta hai. Unicode regex ki wajah se Hindi letters bhi preserve hote hain.
    6. .split(/\s+/)
    Text ko spaces ke basis par words mein todta hai.
    7. .filter(...)
    3 se chhote letters wale words, stop words, aur sirf digits wale words hata deta hai.
    8. new Set(...)
    Duplicate words hata deta hai. Phir [...] Set ko wapas array bana deta hai.
    Example:
    "Cricket! India vs India — match highlights" ka result lagbhag ["cricket", "india", "match", "highlights"] hoga. */

    const getKeywords = (text = "") => {
        const stopWords = new Set([
            "this", "that", "with", "from", "have", "your", "what", "when", "where", "will", "been", "they", "them", "then", "than", "the", "and", "for", "you", "are", "but", "not", "was", "were", "has", "had", "his", "her", "she", "him", "its", "our", "out", "all", "any", "can", "could", "would", "should", "about", "after", "before", "because", "between", "into", "over", "under", "while", "who", "why", "how", "also", "just", "very", "more", "most", "some", "such", "only", "other", "each", "every", "here", "there",

            "hai", "hain", "tha", "thi", "the", "ho", "hoga", "hogi", "honge",
            "aur", "ka", "ki", "ke", "ko", "se", "par", "mein", "me", "toh",
            "ye", "yah", "woh", "voh", "kya", "kaise", "kab", "kahan", "kyun",
            "mera", "meri", "mere", "tera", "teri", "tere", "unka", "unki", "unke",  "hum", "ham", "tum", "aap", "apna", "apni", "apne", "nahi", "nahin", "bhi", "ab", "jab", "tab", "lekin", "magar", "phir", "sirf", "bahut"
        ]);

        return [
            ...new Set(
                text
                    .toLowerCase()
                    .replace(/https?:\/\/\S+/g, " ")
                    .replace(/[^\p{L}\p{N}\s]/gu, " ")
                    .split(/\s+/)
                    .filter((word) =>
                        word.length >= 3 && !stopWords.has(word) && !/^\d+$/.test(word)
                    )
            )
        ];
    };

    const CROSS_PLATFORM_WEIGHT = 0.5;


    /**
     * Flow yeh hai:
        1. Shuru mein empty profile banao: const profile = new Map()
        2. User ki activity—jaise watched video ya liked tweet—ke text ko addInterest(profile, text, weight, date) mein do.
        3. addInterest text se keywords nikaal kar unke scores Map mein add karta hai.
        4. Candidate content ke liye calculateInterestScore woh scores padhta aur jodta hai.
        Example: "cricket highlights" par user ne weight 5 wali activity ki. Agar time decay 1 hai, profile mein cricket → 5 aur highlights → 5 add honge. Candidate "cricket match" ka score phir 5 hoga, kyunki match profile mein nahi hai.
     */

    // now we make a system ki haamra activlites ke base pe weight de ager hamra activity recent ka hai toh uska weight pura hoga but woh ager purane activivties se compare hoga toh uska weight ghat jayega 
    // half time is 7 days
    const getTimeDelay = (date)=>{
        if(!date){
            return 1;
        }

        const timestamp = new Date(date).getTime();

        // Invalid dates should not create NaN scores.
        if (Number.isNaN(timestamp)) {
            return 1;
        }
        const ageInDays = Math.max(
            0,
            (Date.now() - timestamp)/( 1000 * 60 * 60 * 24)
        );
        // Exponential decay: recent activities matter more.
        return Math.pow(0.5, ageInDays / 7);
    }


    // now we add weightage keyword to the user intrest profile 

    // Add weighted keywords to a user's interest profile.
    // The Map stores each keyword and its accumulated interest score.
    // har word ka intrest score store karenge / nikalnge

    const addInterest = (profile, text, weight, date)=>{

        const finalWeight = weight * getTimeDelay(date);
        // iska matlab hua  ki ham apna weight of intrest ko depend karenge relevency pe ki kitna purana activlity hai 

        const keywords = getKeywords(text);
        // extract the usefull keyword from the content 


        // Add the new activity weight to the existing keyword score.
        // like hamne koi video dekha usse koi activity generate hui toh ham usse previous keyword ka score badha denge 
        for(const keyword of keywords){

            profile.set(
                keyword ,
                (profile.get(keyword) || 0) + finalWeight
            )
        }
    }

    // now we calculate how closly content matcheses the user intrest 

    // text: jis video ya tweet ko recommend karne ka soch rahe hain.
    // interestProfile: Map jisme user ke har keyword ka interest score hai. Jaise cricket → 8, gaming → 3.
    export const calculateInterestScore = (text, interestProfile)=>{
        const keywords = getKeywords(text);

        let score = 0;
        for(const keyword of keywords){
            // Keyword profile mein milta hai toh uska score add hota hai. Nahi milta toh 0 add hota hai.
            score += interestProfile.get(keyword) || 0;
        }
        return score;
    }

// now we built the interest profile of the user 
export const builtUserIntrestProfile = async(userId)=>{
    // first of all we validate the user id
    validateObjectId(
        userId,
        "User ID"
    );

     // separate profiles for video and tweet recommendations
    const videoProfile = new Map();
    const tweetProfile = new Map();

    // now we get the this user watch history 
    const watchHistory = await WatchHistory.aggregate([
        // top level 1st aggregation
        {
            // here we match the user ki current user ka watchHistory ko hi lana hai 
            $match: {
                user: new mongoose.Types.ObjectId(userId)
            }
        },
        // 2nd top level aggregation = where we jaut sort the watched videos to latest 
        {
            $sort:{
                lastWatchedAt: -1
                // for decending order -> latest first 
            }
        },
        // 3ed top level aggragation for we want that only top 100 watch history not last ones  
        {
            $limit: 100
        },
        // now we get the details of the watched videos from the video models so thats why we have to use the lookup 
        {
            $lookup:{
                from: "videos",
                localField:"video",
                foreignField : "_id",
                as: "video",
                pipeline:[
                    // 2nd level aggregation inside the pipleine in video 
                    {
                        $match:{
                            isDeleted: false,
                            isPublished: true
                        }
                    },
                    {
                        // now we select the some required fileds only 
                        $project:{
                            title: 1,
                            description: 1,
                            tags: 1,
                            category: 1
                        }
                    }
                ]
            }
        },
        // after lookup unwind the video and make it a object from array 
        {
            $unwind:"$video"
        },
        // now we select only required field 
        {
            $project:{
                _id: 0,// because i dont need the document id 
                videoId: "$video._id",
                title: "$video.title",
                description: "$video.description",
                category: "$video.category",
                tags: "$video.tags",
                watchPercentage: 1,
                isCompleted: 1,
                watchDuration: 1,
                lastWatchedAt: 1    
            }
        }
    ])

    // now we calculate ki user har ek video me kitna intrested hai 
    const watchedVideoInterests  = watchHistory.map(
        (history) => {
            // so here we assumne ki user ne partial intrest show liya hai iss curret selected video ke liye dhayan rahe ki watch hisotry me baut sare video honge aur unke data honge abhi hamne 1 video liya hai uska history me rakh hai 

            let weight = SIGNAL_WEIGHT.partialWatch;

            // if the user watch whole video or atleast 90 percent the we make storng intrest 
            if(history.isCompleted || history.watchPercentage >= 90){
                weight= SIGNAL_WEIGHT.completeWatch;
            }
            else if(history.watchPercentage >= 50){
                weight = SIGNAL_WEIGHT.longWatch;
            }


            // now we store the video details with single weight 
            return {
                videoId : history.videoId,
                // now we combine the title and description to understad the video topic 
                text: `${history.title || ""} ${history.description || ""}`.trim(),
                // now we store the category and tags for the topic matching 
                category:history.category || null,
                tags : history.tags || [],

                // this weight represtnt he user intrest 
                weight,
                createdAt: history.lastWatchedAt
            }
        }
    )

    // // now we use video interests as a weaker signal for tweet recommendations
    // const tweetInterests = videoInterests.map(
    //     (interest) => {

    //         // now we keep the same topics but reduce their weight by half
    //         return {
    //             text: interest.text,
    //             category: interest.category,
    //             tags: interest.tags,
    //             weight: interest.weight * 0.5
    //         };
    //     }
    // );

    // now we return the user's interest profile
    // return {
    //     userId,
    //     videoInterests,
    //     tweetInterests
    // };

    // now we ge thte tweet in which the user has shown some intrest 
    const tweetHistory = await Tweet.aggregate(
        [
            {
                $match: {
                    isDeleted : false
                }
            },
            {
                // now we chane the which tweet the user liked 
                $lookup:{
                    from: "likes",
                    let:{
                        tweetId: "$_id"
                    },
                    as: "userLikes",
                    pipeline:[
                        {
                            $match:{
                                likedBy: new mongoose.Types.ObjectId(userId),
                                $expr:{
                                    $eq:[
                                        // first value then 2nd value 
                                        "$tweet",
                                        "$$tweetId"
                                    ]
                                }
                            }
                        },
                        {
                            $limit:1
                        }
                    ]
                }
            },
            // now we check which tweet the user commented on 
            {
                $lookup:{
                    from: "comments",
                    let:{
                        tweetId: "_id"
                    },
                    as: "userComments",
                    pipeline:[
                        {
                            $match:{
                                owner: new mongoose.Types.ObjectId(userId),
                                isDeleted: false,
                                $expr:{
                                    $eq:[
                                        "$tweet",
                                        "$$tweetId"
                                    ]
                                }
                            }
                        },
                        {
                            $limit: 1
                        }
                    ]
                }
            },
            {
                  // now we check which tweets the user reposted
                $lookup:{
                    from: "reposts",
                    let:{
                        tweetId: "_id"
                    },
                    as: "userReposts",
                    pipeline:[
                        {
                            $match:{
                                owner: new mongoose.Types.ObjectId(userId),
                                isDeleted: false,
                                $expr:{
                                    $eq:[
                                        "$tweet",
                                        "$$tweetId"
                                    ]
                                }
                            }
                        },
                        {
                            $limit: 1
                        }
                    ]
                }
            },
            {
                  // now we check which tweets the user shared
                $lookup:{
                    from: "shares",
                    let:{
                        tweetId: "_id"
                    },
                    as: "userShares",
                    pipeline:[
                        {
                            $match:{
                                sharedBy: new mongoose.Types.ObjectId(userId),
                                $expr:{
                                    $eq:[
                                        "$tweet",
                                        "$$tweetId"
                                    ]
                                }
                            }
                        },
                        {
                            $limit: 1
                        }
                    ]
                }
            },
            // now we calculate the weight of the each activity
            {
                $addFields:{
                    // now we calculate the weight of each activity
                    likeWeight:{
                        // now we apply the condition 
                        $cond:[
                            // expresssion
                            // true
                            // false
                            {
                                $gt:[
                                    // greater than
                                    {
                                        $size:"$userLikes"
                                    },
                                    0
                                ]
                            },
                            SIGNAL_WEIGHT.like,
                            0
                        ]
                    },
                    commentWeight:{
                        // now we apply the condition 
                        $cond:[
                            // expresssion
                            // true
                            // false
                            {
                                $gt:[
                                    // greater than
                                    {
                                        $size:"$userComments"
                                    },
                                    0
                                ]
                            },
                            SIGNAL_WEIGHT.comment,
                            0
                        ]
                    },
                    repostWeight:{
                        // now we apply the condition 
                        $cond:[
                            // expresssion
                            // true
                            // false
                            {
                                $gt:[
                                    // greater than
                                    {
                                        $size:"$userReposts"
                                    },
                                    0
                                ]
                            },
                            SIGNAL_WEIGHT.repost,
                            0
                        ]
                    },
                    shareWeight:{
                        // now we apply the condition 
                        $cond:[
                            // expresssion
                            // true
                            // false
                            {
                                $gt:[
                                    // greater than
                                    {
                                        $size:"$userShares"
                                    },
                                    0
                                ]
                            },
                            SIGNAL_WEIGHT.share,
                            0
                        ]
                    }
                }
            },
            {
                   // now we combine all activity weights
                $addFields:{
                    weight:{
                        $add:[
                            "$likeWeight",
                            "$commentWeight",
                            "$repostWeight",
                            "$shareWeight"
                        ]
                    }
                }
            },
            {
                $match:{
                    weight:{
                        // now we keep only tweets with user activity
                        $gt: 0
                    }
                }
            },
            {
                $project:{
                    _id: 0,
                    tweetId: "$_id",
                    text: "$content",
                    weight: 1,
                    createdAt: 1
                }
            },
            // now we want the latest revelent tweet first 
            {
                $sort:{
                    createdAt: -1// dencending order 
                }
            },
            // we want only top 100 tweet 
            {
                $limit: 100
            }
        ]
    );

    // now we convert the tweet history to tweet intrest 
    const tweetInterests = tweetHistory.map(
        (tweet)=>{
            return {
                tweetId: tweet.tweetId,
                text: tweet.text || "",
                weight: tweet.weight || "",
                createdAt: tweet.createdAt
            }
        }
    );

    // now we use the video comment liked by user  that belong to video 

    const videoCommentLikes = await Like.aggregate(
        [
            // first top level aggregation pipeline 
            {
                // match the current users like commented 
                $match: {
                    likedBy: new mongoose.Types.ObjectId(userId),
                    comment:{
                        exists: true,
                        $ne: null
                    }
                }
            },
            // now we get the like commented
            {
                $lookup:{
                    from:"comments",
                    localField: "comment",
                    foreignField:"_id",
                    as:"comment",
                    pipeline:[
                        {
                            $match:{
                                isDeleted: false,
                                video:{
                                    $exists: true,
                                    $ne: null
                                }
                            }
                        },
                        {
                            $project:{
                                video: 1,
                                createdAt: 1
                            }
                        }
                    ]

                }
            },
            {
                // convert comment array into object 
                $unwind:"$comment"
            },
            // now we get the video associated with the comment 
            {
                $lookup:{
                    from: "videos",
                    localField:"comment.video",
                    foreignField:"_id",
                    as:"video",
                    pipeline:[
                        {
                            $match:{
                                isDeleted:false,
                                isPublished: true,
                            }
                        },
                        {
                            $project:{
                                title: 1,
                                description: 1,
                                category: 1,
                                tags: 1
                            }
                        }
                    ]
                    
                }
            },
            {
                $unwind: "$video"
            },
            // simplified projection for the video comment 
            {
                $project:{
                    _id: 0,
                    videoId: "$video._id",
                    text: {
                        $concat: [
                            { $ifNull: ["$video.title", ""] },
                            " ",
                            { $ifNull: ["$video.description", ""] }
                        ]
                    },
                    category:"$video.category",
                    tags: "$video.tags",
                    createdAt: "$comment.createdAt",
                    weight: SIGNAL_WEIGHT.commentLike,
                }
            }
        ]
    )

    // now we find that comments that is liked by the user that belong to tweets 
    const tweetCommentLikes = await Like.aggregate(
        [
            {
                $match:{
                    likedBy: new mongoose.Types.ObjectId(userId),
                    comment:{
                        $exists: true,
                        $ne: null
                    }
                }
            },
            // now we go to the comment 
            {
                $lookup:{
                    from:"comments",
                    localField: "comment",
                    foreignField:"_id",
                    as:"comment",
                    pipeline:[
                        {
                            $match:{
                                isDeleted: false,
                                tweet:{
                                    $exists: true,
                                    $ne: null
                                }
                            }
                        },
                        {
                            $project:{
                                tweet: 1
                            }
                        }
                    ]
                }
            },
            {
                $unwind:"$comment"
            },
            {
                // no we look into the tweet ki ye likese kiss comment ke tweet ka like hai 
                $lookup:{
                    from: "tweets",
                    localField:"comment.tweet",
                    foreignField:"_id",
                    as: "tweet",
                    pipeline:[
                        {
                            $match:{
                                isDeleted: false
                            }
                        },
                        {
                            $project:{
                                content: 1,
                                createdAt: 1
                            }
                        }
                    ]
                }
            },
            {
                $unwind: "$tweet"
            },
            {
                $project:{
                    _id:0,
                    tweetId: "$tweet._id",
                    text: "$tweet.content",
                    createdAt: "$tweet.createdAt",
                    weight: SIGNAL_WEIGHT.commentLike,
                }
            }
        ]
    )

    // now we conver the liked video comemnt to the videoInterests
    const videoCommentLikeInterests = videoCommentLikes.map(
        (video)=>{
            return{
                videoId: video.videoId,
                text: video.text || "",
                category: video.category || null,
                tags: video.tags || [],
                weight: video.weight,
                createdAt: video.createdAt
            }
        }
    )

    // now we convert the liked tweet comment into tweetintrest 
    const tweetCommentLikeInterests = tweetCommentLikes.map(
        (tweet)=>{
            return{
                tweetId: tweet.tweetId,
                text: tweet.text || "",
                weight: tweet.weight,
                createdAt: tweet.createdAt,
            }
        }
    )

    // now we set the video intrest 
    const videoInterests = [
        ...watchedVideoInterests,
        ...videoCommentLikeInterests
    ]


    // now we combine the tweet activlites and tweet like comment acctivities 
    const actualTweetInterests = [
        ...tweetInterests,
        ...tweetCommentLikeInterests
    ]

    // now we get the user search history
    const searchHistory = await GlobalSearch.aggregate(
        [
            // we want the searches that is done by the current user 
            {
                $match:{
                    user: new mongoose.Types.ObjectId(userId),
                    isDeleted: false
                }
            },
            {
                // latest search first 
                $sort:{
                    createdAt: -1
                }
            },
            // we take only top 50 searches 
            {
                $limit: 50
            },
            {
                $project:{
                    query:{
                        $ifNull:["$normalisedQuery", "$query"]
                    },
                    searchType: 1,
                    searchedAt: 1
                }
            }
        ]
    )
    
    // now we convert the search history into video and tweet intrest 
    const searchInterests = searchHistory.map(
        (search)=>{
            return{
                text: search.text || "",
                searchType: search.searchType,
                weight: SIGNAL_WEIGHT.search,
                createdAt: search.searchedAt
            }
        }
    )

    // now we add the searchintrest into relevent profile 
    for(const search of searchInterests){
        if(search.searchType ==="video"){
            addInterest(
                videoProfile,
                search.text,
                search.weight,
                search.createdAt
            )
        }
        else if(search.searchType === "tweet"){
            addInterest(
                tweetProfile,
                search.text,
                search.weight,
                search.createdAt
            )
        }
        else{
            // general search can help bot tweet and video 
            addInterest(
                videoProfile,
                search.text,
                search.weight * CROSS_PLATFORM_WEIGHT,
                search.createdAt
            );

            addInterest(
                tweetProfile,
                search.text,
                search.weight * CROSS_PLATFORM_WEIGHT,
                search.createdAt
            );
        }
    }

    // now we get the videos added to the user's playlist 
    const playlistHistory = await Playlist.aggregate(
        [
            // we want only current users active playlist 
            {
                $match:{
                    owner: new mongoose.Types.ObjectId(userId),
                    isDeleted: false
                }
            },
            {
                // now we see into the videos
                $lookup:{
                    from:"videos",
                    localField: "videos",
                    foreignField:"_id",
                    as: "videos",
                    pipeline:[
                        {
                            $match:{
                                isDeleted: false,
                                isPublished: true
                            }
                        },
                        {
                            $project:{
                                title: 1,
                                description: 1,
                                category: 1,
                                tags: 1
                            }
                        }
                    ]
                }
            },
            {
                // convert the each videos of the playlist into seperat record 
                $unwind: "$videos"
            },
            {
                $project:{
                    // now we select the filelds for the video intrest 
                    title:"$videos.title",
                    description:"$videos.description",
                    category: "$videos.category",
                    tags: "$videos.tags",
                    createdAt: "$updatedAt"
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            },
            {
                $limit: 100
            }
        ]
    )

    // now we convert the playlist video into video intrest 
    const playlistVideoInterests = playlistHistory.map(
        (video)=>{
            return{
                text:`${video.title || ""} ${video.description || ""}`.trim(),
                category: video.category || null,
                tags: video.tags || [],
                weight: SIGNAL_WEIGHT.playlistAdd,
                createdAt: video.createdAt
            }
        }
    )

      // now we add playlist topics to the video interest profile
    for (const video of playlistVideoInterests) {
        const text = [
            video.text,
            video.category,
            ...(video.tags || [])
        ].filter(Boolean).join(" ");

        addInterest(
            videoProfile,
            text,
            video.weight,
            video.createdAt
        );
    }

    // now we add all direct video interests to the video profile
    for (const interest of videoInterests) {
        const text = [
            interest.text,
            interest.category,
            ...(interest.tags || [])
        ].filter(Boolean).join(" ");
        // so the join help us to convert array to string by adding doubble quotes to the satarting and at the end of the text 

        addInterest(
            videoProfile,
            text,
            interest.weight,
            interest.createdAt
        );
    }
    // so the main logic behind the flow is that we take the title, description , tags and category kewyords and take all things in an same formate like text->category-> tags and weight then we just do the operation to make that all keywords to are stored in a array then we just make them string 

    // now we add all direct tweet interests to the tweet profile
    for (const interest of actualTweetInterests) {
        addInterest(
            tweetProfile,
            interest.text,
            interest.weight,
            interest.createdAt
        );
    }

    // now we save the original profiles before cross-platform scoring
    const originalVideoProfile = new Map(videoProfile);
    const originalTweetProfile = new Map(tweetProfile);

    // now we use video topics as a weaker signal for tweet recommendations
    for (const [keyword, weight] of originalVideoProfile) {
        addInterest(
            tweetProfile,
            keyword,
            weight * CROSS_PLATFORM_WEIGHT
        );
    }

     // now we use tweet topics as a weaker signal for video recommendations
    for (const [keyword, weight] of originalTweetProfile) {
        addInterest(
            videoProfile,
            keyword,
            weight * CROSS_PLATFORM_WEIGHT
        );
    }

    // // now we make the aggregation for the subscription 
    // const videoSubscriptions = await Subscription.aggregate(
    //     [
    //         {
    //             $match:{
    //                 subcriber: new mongoose.Types.ObjectId(userId),
    //                 type: "video",
    //                 isActive: true
    //             }
    //         },
    //         {
    //             // keep each creator only once 
    //             $group:{
    //                 _id: "$channel"
    //             }
    //         },
    //         {
    //             $project:{
    //                 _id: 0,
    //                 creatorId:"$_id"
    //             }
    //         }
    //     ]
    // )

    // // now we get active tweet follows of the current user
    // const tweetSubscriptions = await Subscription.aggregate([
    //     {
    //         $match: {
    //             subscriber: new mongoose.Types.ObjectId(userId),
    //             type: "tweet",
    //             isActive: true
    //         }
    //     },
    //     {
    //         // keep each creator only once
    //         $group: {
    //             _id: "$channel"
    //         }
    //     },
    //     {
    //         $project: {
    //             _id: 0,
    //             creatorId: "$_id"
    //         }
    //     }
    // ]);

    // // convert the each creator id into string for better easy matching and feed rakning 
    // const subscribedVideoCreatorId = videoSubscriptions.map(
    //     (channel)=> channel.creatorId.toString()
    // )
    // const followedTweetCreatorId = tweetSubscriptions.map(
    //     (tweet) => tweet.creatorId.toString()
    // )


    // now we get the creator user subcribed or follwed to 
    const subscribedCreatorContent = await Subscription.aggregate(
        [
            {
                $match: {
                    subscriber: new mongoose.Types.ObjectId(userId),
                    isActive: true
                }
            },
            {
                // pahle ham video ke subcription ka dekehnge 
                $lookup:{
                    // har subcription ke creator ka content fetch karo 
                    from : "videos",
                    let:{
                        // yaha hame loopup ke ander pipeline me channel and types ka use karnege 
                        creatorId: "$channel",
                        subscriptionType: "$type"
                    },
                    // now we fetch video from the only video subscription
                    pipeline:[
                        {
                            // $$ for variable, $ for field , video direct for model/table
                            $match:{
                                $exper:{
                                    // both
                                    $and:[
                                        {
                                            $eq: [
                                                "$owner",
                                                "$$creatorId"
                                            ]
                                        },
                                        {
                                            $eq:[
                                                "$$subscriptionType",
                                                "video"
                                            ]
                                        }
                                    ]
                                },
                                isDeleted: false,
                                isPublished: true
                            }
                        },
                        {
                            $project:{
                                title: 1,
                                description: 1,
                                category:1,
                                tags: 1,
                                createdAt: 1
                            }
                        },
                        {
                            $limit: 100
                        }
                    ],
                    as: "videos"
                }
            },

            // now we fetch the folled creator ka tweet fetch kanrenge 
            {
                $loopup:{
                    from:"tweets",
                    let:{
                        creatorId: "$channel",
                        subscriptionType: "$type"
                    },
                    pipeline:[
                        {
                            $match:{
                                $expr:{
                                    $and:[
                                        {
                                            $eq:[
                                                "$owner",
                                                "$$creatorId"
                                            ]
                                        },
                                        {
                                            $eq:[
                                                "$$subscriptionType",
                                                "tweet"
                                            ]
                                        }
                                    ]
                                },
                                isDeleted: false
                            }
                        },
                        {
                            $project:{
                                content: 1,
                                createdAt: 1
                            }
                        },
                        {
                            $limit: 100
                        }
                    ],
                    as:"tweets"
                }
            },
            {
                // now we project only the creator ka type and and subcription type
                type:1,
                videos: 1,
                tweets:1
            }
        ]
    )

    // now we add subscribed creator's content to intrest profile
    // video creator ke topic ko video presfrence me add aknrenge 
    for(const creator of subscribedCreatorContent){
        if(creator.type === "video"){
            for(const video of creator.video){
                const videoText =[
                    video.title,
                    video.description,
                    video.category,
                    ...(video.tags || []),
                ].filter(Boolean).join(" ");

                addInterest(
                    videoProfile,
                    videoText,
                    SIGNAL_WEIGHT.subscription,
                    video.createdAt
                )
            }
        }

        // Tweet creator ke topics ko tweet preference mein add karenge
        if (creator.type === "tweet") {
            for (const tweet of creator.tweets) {
                addInterest(
                    tweetProfile,
                    tweet.content || "",
                    SIGNAL_WEIGHT.follower,
                    tweet.createdAt
                );
            }
        }
    }

    // now we get the videos viewes by the user 
    const viewedVideos = await View.aggregate(
        [
            {
                $match:{
                    // we take the cuurent user view models 
                    // current user ki video views fetch karenge 
                    user: new mongoose.Types.ObjectId(userId),
                    video:{
                        $exists: true,
                        $ne: null,
                        // not equals to null hona chaiye videos 
                    }
                }
            },
            {
                // view collection ke corresponding video details fetch karenge 
                $lookup:{
                    from:"videos",
                    localField: "video",
                    foreignField: "_id",
                    as: "video",
                    pipeline:[
                        {
                            $match:{
                                // deleted ya unpublised videos ko fetch nahi karenge 
                                isDeleted: false,
                                isPublished: true
                            }
                        },
                        {
                            $project:{
                                title: 1,
                                category: 1,
                                description: 1,
                                tags: 1,
                                createdAt: 1
                            }
                        }
                    ]
                }
            },
            {
                $unwind: "$video"
            },
            {
                // keep only required field from videos only but we are at view =(top level aggregation)
                $project:{
                    viewedAt: 1,
                    title:"$video.title",
                    description:"$video.description",
                    category:"$video.category",
                    tags: "$video.tags",
                    createdAt:"$video.createdAt"
                    
                }
            },
            {
                $sort: {
                    viewedAt: -1
                }
            },
            {
                $limit: 100
            }
        ]
    )


    // now we add the viewed video topic to video profile 
    for(const video of viewedVideos){
        const videoText =[
            video.title,
            video.description,
            video.category,
            ...(video.tags || [])
        ].filter(Boolean).join(" ");

        // viewed videos ke topic ko ab ham user ki prefrences me add karna hai 
        addInterest(
            videoProfile,
            videoText,
            SIGNAL_WEIGHT.partialWatch,
            video.viewedAt
        )
    }

    // now we add the viewed tweet to the tweet profile for user 
    const viewedTweet = await View.aggregate(
        [
            {
                $match:{
                    user: new mongoose.Types.ObjectId(userId),
                    tweet:{
                        $exists: true,
                        $ne: null
                    }
                }
            },
            // now we look into the tweet model
            {
                $lookup:{
                    from: "tweets",
                    localField:"tweet",
                    foreignField:"_id",
                    as:"tweet",
                    pipeline:[
                        {
                            $match:{
                                isDeleted: false
                            },

                        },
                        {
                            $project:{
                                content: 1,
                                createdAt: 1
                            }
                        }
                    ]
                }
            },
            {
                $unwind: "$tweet"
            },
            {
                $project:{
                    viewedAt: 1,
                    content:"$tweet.content",
                    createdAt: "$tweet.createdAt"
                }
            },
            {
                $sort:{
                    viewedAt: -1
                }
            },
            {
                $limit: 100
            }
        ]
    )

    // now we add the viewed tweet topic to tweet profile
    for(const tweet of viewedTweet){
        addInterest(
            tweetProfile,
            tweet.content || "",
            SIGNAL_WEIGHT.partialWatch,
            tweet.viewedAt
        )
    }

    // now we get the popular videos from the view count 
    const popularVideos = await Video.aggregate(
        [
            {
                $match:{
                    isDeleted: false,
                    isPublished: true
                }
            },
            {
                $project:{
                    title:1,
                    description: 1,
                    category: 1,
                    tags: 1,
                    // iska matalb hua ki viewcount field me ager null hua toh ham woha 0 ka use karnege error se bach sakte hai  
                    viewCount: {
                        $ifNull:[
                            "$viewCount",
                            0
                        ]
                    },
                    createdAt: 1
                }
            },
            {
                $sort:{
                    viewCount:-1
                }
            },
            {
                $limit: 100
            }
        ]
    )

    // now we get the popular tweet by its views 
    

    // now we get popular videos using their stored viewCount
    // const popularVideos = await Video.aggregate([
    //     {
    //         // only active and published videos
    //         $match: {
    //             isDeleted: false,
    //             isPublished: true
    //         }
    //     },
    //     {
    //         // select the fields required for popularity ranking
    //         $project: {
    //             _id: 0,
    //             videoId: "$_id",
    //             viewCount: { $ifNull: ["$viewCount", 0] },
    //             createdAt: 1
    //         }
    //     },
    //     {
    //         // most viewed videos first
    //         $sort: {
    //             viewCount: -1
    //         }
    //     },
    //     {
    //         // take top 100 popular videos
    //         $limit: 100
    //     }
    // ]);

    // // now we get popular tweets using their stored viewCount
    // const popularTweets = await Tweet.aggregate([
    //     {
    //         // only active tweets
    //         $match: {
    //             isDeleted: false
    //         }
    //     },
    //     {
    //         // select the fields required for popularity ranking
    //         $project: {
    //             _id: 0,
    //             tweetId: "$_id",
    //             viewCount: { $ifNull: ["$viewCount", 0] },
    //             createdAt: 1
    //         }
    //     },
    //     {
    //         // most viewed tweets first
    //         $sort: {
    //             viewCount: -1
    //         }
    //     },
    //     {
    //         // take top 100 popular tweets
    //         $limit: 100
    //     }
    // ]);

    // now we return the user's interest profiles
    return {
        userId,
        videoInterests: videoProfile,
        tweetInterests: tweetProfile
    };

    // // now we take the video topics as a weaer remoendation for the tweet 
    // const videoBasedTweetInterests = videoInterests.map(
    //     (interest)=> {
    //         return{
    //             text: interest.text,
    //             category : interest.category,
    //             tags : interest.tags,
    //             weight : interest.weight * CROSS_PLATFORM_WEIGHT
    //         }
    //     }
    // )

    // // now we use tweet topics as a signal for video recommendations
    // const tweetBasedVideoInterests = actualTweetInterests.map(
    //     (interest) => {
    //         return {
    //             tweetId: interest.tweetId,
    //             text: interest.text,
    //             weight: interest.weight * CROSS_PLATFORM_WEIGHT,
    //         };
    //     }
    // );

    // const combinedVideoIntrests = [
    //     ...videoInterests,
    //     ...tweetBasedVideoInterests
    // ]

    // const combinedTweetInterests = [
    //     ...actualTweetInterests,
    //     ...videoBasedTweetInterests
    // ];

    // return{
    //     userId,
    //     videoInterests : combinedVideoIntrests,
    //     tweetInterests : combinedTweetInterests
    // }
}

// export all functions at the end
export {
    SIGNAL_WEIGHT,
    CROSS_PLATFORM_WEIGHT,
    getKeywords,
    getTimeDelay,
    addInterest
};

