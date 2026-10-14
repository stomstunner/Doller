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
import { Like } from "../models/like.models.js";
import { Repost } from "../models/repost.models.js";
import { Tweet } from "../models/tweet.models.js";

// now we have to define the each user activity 
const SIGNAL_WEIGHT = {
    completeWatch: 5,
    longWatch : 4,
    partialWatch: 2,
    like: 5,
    repost : 6,
    share: 6,
    playlistAdd: 4,
    comment: 3,
    search: 4
}

// now we built the interest profile of the user 
const builtUserIntrestProfile = async(userId)=>{
    // first of all we validate the user id
    validateObjectId(
        userId,
        "User ID"
    );

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
                tags: "$tags",
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
            else if(SIGNAL_WEIGHT.watchPercentage >= 50){
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
                weight
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
                            "$repostWeight"
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
                    tweetId: "_id",
                    text: "$content",
                    weight: 1
                }
            },
            // now we want the latest revelent tweet first 
            {
                $sort:{
                    tweetId: -1// dencending order 
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
                weight: tweet.weight || ""
            }
        }
    );

    // now we take the video topics as a weaer remoendation for the tweet 
    const videoBasedTweetInterests = watchedVideoInterests.map(
        (interest)=> {
            return{
                text: interest.text,
                category : interest.category,
                tags : interest.tags,
                weight : interest.weight*0.5
            }
        }
    )

    // now we use tweet topics as a signal for video recommendations
    const tweetBasedVideoInterests = tweetInterests.map(
        (interest) => {
            return {
                text: interest.text,
                weight: interest.weight * 0.5,
                category : interest.category,
                tags : interest.tags,
            };
        }
    );

    const combinedVideoIntrests = [
        ...watchedVideoInterests,
        ...tweetBasedVideoInterests
    ]

    const combinedTweetInterests = [
        ...tweetInterests,
        ...videoBasedTweetInterests
    ];

    return{
        userId,
        videoInterests : combinedVideoIntrests,
        tweetInterests : combinedTweetInterests
    }
}

