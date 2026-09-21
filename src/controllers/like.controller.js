// lets imprt the nessecery modules 
import mongoose from "mongoose";
import { Like } from "../models/like.models.js";
import { Comment } from "../models/comment.models.js";
import { Playlist } from "../models/playlist.models.js";
import { Video } from "../models/video.models.js";
import { Tweet } from "../models/tweet.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { validateObjectId } from "../utils/validateObjectId.js";    

// lets make the controller for the toggleVideoLike
const toggleVideoLike = asyncHandler(async(req, res) => {
    // 1 fetch the id ov video from the request
    const {videoId} = req.params;
    // now we validate the object id 
    validateObjectId(
        videoId,
        "Video ID"
    )

    // now we check ki hamara video exites karta bhi hai ya nahi 
    const videoExists = await Video.exists(
        {
            _id : videoId
        }
    )

    // now we send the error if we do not found the video 
    if(!videoExists){
        throw new ApiError(
            404,
            "video not found"
        )
    }

    // Step 4:
    // Database me check karo
    // ki current user ka like already hai ya nahi.

    const existingLike = await Like.findOne(
        {
            video : videoId,
            likedBy : req.user._id
        }
    )

    

    // Step 5:
    // Agar like mil gaya
    // → Unlike karo

    if(existingLike){
        await Like.findByIdAndDelete(
            existingLike._id
        );

        // send the response that we hace the exiting like so it means the video is already liked so toggle its unlike 
        return res
        .status(200)
        .json(
            new ApiResponse(
                200, 
                {
                    liked : false 
                },
                "Video unliked Successfully"
            )
        )
    }

    // Agar like nahi mila
    // → Like karo
    await Like.create(
        {
            video: videoId,
            likedBy: req.user._id
        }
    )

    // now we send the response where we make the like button liked kyuki ye pahle se liked nahi tha aur hamne abhi like create kiya hai 
    // video ke liye sirf 
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                liked :true  
            },
            "Video liked Successfully"
        )
    )


})

// now lets make the toggleCommentLike with same intution 
const toggleCommentLike = asyncHandler(async(req, res) => {

    // find id 
    const {commentId} = req.params;

    // validate obejct id 
    validateObjectId(
        commentId,
        "Comment ID"
    )

    // comment exits or not 
    const commentExists = await Comment.exists(
        {
            _id: commentId,
            isDeleted : false
        }
    )

    // error for not found 
    if(!commentExists){
        throw new ApiError(
            404,
            "Comment not found"
        )
    }

    // check ki hamra pahle se hi toh like nahi hai 
    const existingLike = await Like.findOne(
        // kya woh comment ka hi like hai aur kya user bhi same hai 
        {
            comment:commentId,
            likedBy : req.user._id,
        }
    )

    // now if we have any data in the exiting like then it means ki hamare pass pahle se hi iss comment pe like tha iss user dwara 
    // toh unlike kar do ab 
    if(existingLike){
        await Like.findByIdAndDelete(
            existingLike._id  
        )

        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    liked: false
                },
                "Comment unliked Successfully"
            )
        )
    }

    await Like.create(
        {
            comment: commentId,
            likedBy : req.user._id
        }
    )

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                liked : true
            },
            "Comment liked Successfully"
        )
    )
})

// now we make the toggleTweetLike
const toggleTweetLike = asyncHandler(async(req, res) => {
    // find the tweetId 
    const {tweetId} = req.params;

    // now we validate the tweetId object 
    validateObjectId(
        tweetId,
        "Tweet ID"
    )

    // now we see ki hamara tweet exist karta bhi hai ya nahi 
    const tweetExists = await Tweet.exists(
        {
            _id:tweetId
        }
    );

    // if tweet does not exits then,
    if(!tweetExists){
        throw new ApiError(
            404,
            "Tweet not found"
        )
    }

    // now we find in the Like database ki hamare pass kahi isi tweet pe like toh nahi hai na 
    const existingLike = await Like.findOne(
        {
            tweet : tweetId,
            // now we ckeck who liked it is it the requester 
            likedBy: req.user._id
        }
    )

    // now we write code on the basis of weather the exitng like is true or false 
    // if exiting like is avalble matab usme kuch data aaya hai databse se then  
    if(existingLike){
        await Like.findByIdAndDelete(
            existingLike._id 
        )

        // now we send the response 
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    liked : false
                },
                "Tweet unliked Successfully"
            )
        )
    }

    // now if we are here then we dont have the data for the exiting like then it means we now have to create the like tweet 
    await Like.create(
        {
            tweet: tweetId,
            likedBy: req.user._id
        }
    )
    // now we send the response 
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                liked : true
            },
            "Tweet Liked Successfully"
        )
    )
})

// now we write the controller for the togglePlaylistLike

const togglePlaylistLike = asyncHandler(async(req, res) => {
    // find the playlist object id 
    const {playlistId} = req.params;

    // now we validate the object id 
    validateObjectId(
        playlistId,
        "Playlist ID"
    );

    // now we ckeck the playlist exits or not 
    const playlistExists = await Playlist.exists(
        {
            _id: playlistId
        }
    )

    // error handling
    if(!playlistExists){
        throw new ApiError(
            404,
            "Playlist not found"
        )
    }

    // now we check ki phale se hi toh like nahi hai playlist pe 
    const existingLike = await Playlist.findOne(
        {
            _id : playlistId,
            likedBy: req.user._id
        }
    )

    // now we write the code if there is a like present 
    if(existingLike){
        await Like.findByIdAndDelete(
            existingLike._id
        )

        // and send the response 
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    liked : false
                },
                "Playlist unliked Successfully"
            )
        )
    }

    // if we are here means our playlist havnt any like yet 
    await Playlist.create(
        {
            _id: playlistId,
            likedBy: req.user._id
        }
    )

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                liked : true
            },
            "Playlist liked Successfully"
        )
    )
})

// lets create the getLikedVideos 
const getLikedVideos = asyncHandler(async(req, res) => {
    // lets create the important pagination variables 
    const page = Math.max(
        Number.parseInt(req.query.page) || 1,
        1
    )

    // now we make the limit 
    const limit = Math.min(
        Math.max(
            Number.parseInt(req.query.limit) || 20,
            1
        ),
        100
    )

    // now we warite the skip variable 
    const skip = (page - 1) * limit;

    // now we write the search variable 
    const search = req.query.search?.trim() || "";
    // ager hamare request ke query me search hai toh usko trim kar ke laao aur search varibale me store kar lo nahi toh usko empty rakho 

    // ab simple sortOptions bana ke rakh lete hai createdAt = -1 jisse hamara videos default  me accesnding order me rakhega 

    const searchOptions = {
        createdAt : -1
    }

    // now we make some option for sorting 
    if(req.query.sortBy === "views"){
        // then we update the value of the sorting of videos to its views 
        searchOptions = {
            views : -1
        }
    }

    // for duration 
    if(req.query.sortBy === "duration"){
        searchOptions = {
            duration : -1
        }
    }

    // now we write the most important code for the getting the liked videos from the databse based on the aggration pipeline 

    const likedVideos = await Like.aggregate(
        // aggragete me jata hai array of objects 
        [
            // first aggration pipeline 
            {
                $match : {
                    // match kisse karna hai 
                    likedBy: new mongoose.Types.ObjectId(req.user._id),
                    video : {
                        $exists : true
                    }
                }
            },
            // second pipeline for the joins that ki hame kaha se apne like wale document ko join karna hai jisse hame video ka information mil sake 
            // look into the video document from the like document 

            {
                $lookup : {
                    // for lookup we have the 4 required filds 
                    from: "videos",
                    // ye  hamre pass videos model se aaya hai kaha se chaiye hame data 
                    localField: "video", 
                    // abhi ham kaha hai 
                    foreignField: "_id",
                     // ye hai ki ham jiss document se data chahte hai woha uska kya naam hai 
                    as: "video",

                    // now we write the code for the pipeline for the level wise aggreation .. nested pipeline 

                    // pipeline me ham array of object 
                    pipeline: [
                        // inside the pipeline we write the nested aggregation 
                        // becase we are in the videos but we only want the videos that match the following  conditon 
                        {
                            $match : {
                                isDeleted : false,
                                isPublished : true,

                                ...(search && {
                                    title : {
                                        $regex : search,
                                        $options : "i"
                                    }
                                })
                            }
                        },
                        // here we write the 2nd aggreation pipeline inside the pileline array of the object 
                        {
                            $lookup:{
                                from : "users",
                                localField : "owner",
                                foreignField:  "_id",
                                as : "owner",
                                // further we apply the pipeline for the user filed ki hame kya kya filed hi sirf chaiye 
                                pipeline: [
                                    // pipeline ka first object 
                                    {
                                        // bass hamko dena ya project karna ye kuch field  
                                        $project:{
                                            // from the user model
                                            fullName : 1,
                                            username: 1,
                                            avatar : 1
                                        }
                                    }
                                ]
                            },
                            // now we add the filed kyuki frontend pe hamare pass array jata hai toh usme se hame first obejct ko nikalna na pare toh ham naye walae owner me object hi rakh denge kyuki pipeline hame array of the obejct deta hai 
                        },
                        // 3rd level pipeline aggration
                        {
                            $addFields:{
                                owner : {
                                    $first : "$owner",
                                }
                            }
                        },
                        // now we apply the 4th level pipeline for projection of the video ki hame videos me se kya kya data chaiye in the frontend we only write the some field 
                        {
                            $project:{
                                // here we write the field that we want in the frontend 
                                title : 1,
                                description: 1,
                                thumbnail : 1,
                                duration : 1,
                                views : 1,
                                owner : 1,
                                createdAt : 1,

                            }
                        }


                    ]
                }
            },
            // this is the 3 level parent level pipeline wher we apply the sorting adn the limit aggration and the some important filter that is  needed for the pagination 
            {
                // this is for the chenging the array to the obejct lookup se hamare jitne bhi videos hai woh array me aayenge but unwind se woh object me badal jayega jisse unko acces karna easy hoga 
                $unwind : "$video"
            },
            {
                $replaceRoot: {
                    newRoot: "$video"
                }
            },
            // now we apply the sort 
            {
                $sort : sortoptions
            },
            // now we write the skip for the pagination 
            {
                $skip : skip
            },
            {
                $limit : limit
            }
        ]
    );

    // now we find the total count of the how many we have the videos that we like them 
    const totalLikedVideos = await Like.countDocuments(
        {
            likedBy: req.user._id,
            video: {
                $exists: true
            }
        }
    );

    // now we send the response of the likedVideos 
    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            {
                videos : likedVideos,
                page,
                limt,
                totalLikedVideos,
                totalPages : Math.ceil(
                    totalLikedVideos / limit
                ) ,
                hasNextPage : (page * limit) < totalLikedVideos
            },
            "Liked Videos Fetched Successfully"
        )
    )
})