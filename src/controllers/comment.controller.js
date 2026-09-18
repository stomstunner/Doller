// first of all we need some utilities 

/** @type {import("../models/comment.models.js").Comment} */
import mongoose from "mongoose" ;
import { Comment} from "../models/comment.models.js"
import {Video} from "../models/video.models.js"
import {Tweet} from "../models/tweet.models.js"
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

// helper validate function for checking the objectID 

const validateObjectId = (
    id,
    fieldName = "ID"
)=>{
    if(!mongoose.isValidObjectId(id)){
        throw new ApiError(
            400, invalid `${fieldName}`
        )
    }
}

// now we make a varibale that holds the data ki jo populate karte time help kare ki user ki kon sa field frontend pe bheji hai 

const commentOwnerFields = "username fullName avatar"

// now we start the controller of comment 
const getVideoComments = asyncHandler(async(req, res)=>{

    // 1. Video ID nikalo
    // user ne mujhe req.pramas se video ki id di hai toh ab mujhe user ko video me diye gaye sare comment dikhana hai 
    const {videoId} = req.params


    // 2. Video ID validate karo
    // invalid id databse tak nahi jani chaiye 
    validateObjectId(videoId, "Video ID")

    // 3. Page aur limit nikalo
    // set the defalut page to 1 
    // har page ka comment ka limit set karna hai
    // req.query.page = ye hamra nikalta hai ki url me kon sa page hai comment ka pahli baar me hame 20 comment dikhana hai then next page me another 20 so next baar ke liye hamara page 2 ho jayega  

    // yaha pe but page string me hoga toh usse hame Number.parseInt laga ke integer me badlna hai then ager hamara page ka value -1 hai toh || ka use kar ke ham -1||1 me se hamesha 1 ko hi lenge Math.max ki help se aur ager page 4 hai toh 4||1 se hamesha 4 ko hi lenge 

    // Math.math(a, b)
    // yaha a hai number.parseInt(req.query.page) || 1
    // ye karega ki ager -1 page number hai b ka vlaue toh 1 hi hoga toh ham 1 lange but ager page ka vlaue hello ya koi dusra chiz hai toh ham || 1 lenge nahi toh hamra page ka vlaue undefined aa jayega NaN aa jayega 
    const page = Math.max(
        Number.parseInt(req.query.page) || 1,
        1
    )
    // now we se the limit of comment ki ek baar me kitne bhejna hai 
    const limit = Math.min(
        // we need the minimum of these two 
        Math.max(
            Number.parseInt(req.query.limit) || 20,
            1
        ),
        100
    )

    // now we write the skip ka code ki har page me kitna comment toh load hoga but agle page me databse se kitna page ko skip kar ke lana hai 

    const skip = (page - 1) * limit;

    // so ager page hai 3 aur limit hai 20 then ,
    // 3-1=2 * 20 = 40 comment chor ke laao kyuki page hai 2
    // ager page hai 1 toh 1-1 = 0*20 = 0 so 0 comment chor ke laao that means pahle 20 comment laap 

    // 4. Video exist karti hai?    // sirft exist karta hai ya nahi woh check karna hai 
    const videoExists = await Video.exists(
        {
            _id : videoId
        }   
    )

    if(!videoExists){
        throw new ApiError(
            404, 
            "Video not found "
        )
    }
    // 5. Filter banao
    const filter = {
        // kaun sa video k comment chaiye 
        video: videoId,
        // sirf top level comment do na ki jiska parent exist karta hai replay pahale nahi chaiye bass uska parenge comment do 
        parentComment: null,
        // ab waisse comment lana jika idDeleted ka value false ho matlab jo exixt karte ho 
        isDeleted : false
    }
    // 6. Comments fetch karo
    const comments = await Comment.find(filter)
    .populate(  
        "owner",
        commentOwnerFields
          // 7. Owner populate karo
    )
    .sort(
        {
            // 8. Sorting lagao
            // Pehle pinned comments
            // Fir newest comments
            isPinned: -1,
            createdAt: -1,
        }
    )
    .skip(skip) // 9. Pagination lagao
    .limit(limit)
    .lean() //MongoDB se normal JavaScript objects mangwa leta hai. memory kam use hoti hai 
  

    
    // 10. Count nikalo
    const totalComments = await Comment.countDocuments(filter)
    // 11. Response bhejo
    // kya comments hai 
    // Current page kaunsa hai?
    // Total comments kitne hain?
    // Total pages kitne hain?
    // Next page hai ya nahi?
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                comments,
                page,
                totalComments,
                limit,
                totalPages: Math.ceil(totalComments / limit),
                hasNextPage: (page * limit ) < totalComments
                
            },
            "Comments fetched Successfully"
        )
    )


})

// now we make the controller for the get the tweet comment 
// for that 
// get the id

const getTweetComments = asyncHandler(async(req, res)=>{
    const {tweetId} = req.params;

    // validate the id

    validateObjectId(tweetId, "Tweet ID");


    // find the what page we are into and the limit = how many comments we want 

    const page = Math.max(
        Number.parseInt(req.query.page) || 1 ,
        1
    )
    
    const limit = Math.min(
        Math.max(

            Number.parseInt(req.query.limit) || 20,
            1
        ),
        100
    )
    
    // and how many tweets we want to skip per page 
    const skip  = (page - 1) * limit;

    // then we vlaidate the tweet exits or not 
    const tweetExists = await Tweet.exists(
        {
            _id : tweetId
        }
    )

    if(!tweetExists){
        throw new ApiError(404, "Tweet does not exists")
    }

    // then we make the filter for that based on the comment is deleted or not and from the tweet id and on parentComment
    const filter = {
        // kaun sa tweet ka comment chaiye 
        tweet : tweetId,
        parentComment : null,
        isDeleted: false
    }

    // then we fetch the comment and 
    // owner ko populate karo ki kon kon sa data chaiye hame user ko dikhane ke liye frontend pe 
    // sort the comment based on the date of the comment and it is pinned or not 
    // then we apply pagination ki first page me kitne comment aane chaiye and agli baar kitne from the page variable  
    const comments = await Comment.find(filter)
    .populate(
        "owner",
        commentOwnerFields,
    )
    .sort(
        {
            isPinned : -1,
            createdAt: -1
        }
    )
    .skip(skip)
    .limit(limit)
    .lean()
    
    // find its count ki pure kitne comment hai 
    const totalComments = await Comment.countDocuments(filter)
    
    // at the last we send the response 
    return  res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                comments,
                page,
                totalComments,
                limit,
                totalPages: Math.ceil(totalComments / limit),
                hasNextPage: (page * limit ) < totalComments
            },
            "Comment fetched Successfully"
        )
    )
})

// here we make the getCommentReplies ka controller 
// things we should keep in the mind 
// find the commentId
// then validate the object id
// then see that our comment exist or not 
const getCommentReplies = asyncHandler(async(req, res)=> {
    const {commentId} = req.params;

    validateObjectId(commentId, "Comment ID");

    // now we write the code for the pagination , limit and the skip 
    const page = Math.max(
        Number.parseInt(req.query.page) || 1,
        1
    )

    const limit = Math.min(
        Math.max(
            Number.parseInt(req.query.limit) || 20,
            1
        ),
        100
    )

    const skip = (page - 1) * limit;

    const parentComment = await Comment.exists(
        {
            _id: commentId,
            isDeleted : false
        }
    )

    if(!parentComment){
        throw new ApiError(
            404,
            "Parent comment not found"
        )
    }

    // now we make the filter 
    // jisme ham parentComment me commentId daal dnege jisse hamne jass isi current comment jo ki mera parent comment hai usi ka id milega 
    const filter = {
        parentComment : commentId,
        isDeleted: false
    }

    // now we find the replies
    const replies = await Comment.find(filter)
    .populate(
        "owner",
        commentOwnerFields
    )
    .sort(
        {
            createdAt: 1
        }
    )
    .skip(skip)
    .limit(limit)
    .lean()

    // now we fins the total replies 
    const totalReplies = await Comment.countDocuments(filter)

    return  res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                replies,
                page,
                limit,
                totalReplies,
                totalPages : Math.ceil(totalReplies/ limit),
                hasNextPage : (page * limit) < totalReplies
            },
            "Replies Fetched Successfully"
        )
    )
})
/*
// now we make the addVideoComment controller

// 1. User kya create karna chahta hai?
// 2. Required data aaya?
// 3. Data valid hai?
// 4. Jis cheez ke andar create kar rahe hain wo exist karti hai?
// 5. Database me save kaise hoga?
// 6. Response me kya bhejna hai?

const addVideoComment = asyncHandler(async(req, res) => {
    // 1 destructure the videoId from the req.params
    const {videoId} = req.params;
    // 2 extract the contant from  the req.body
    const {content} = req.body;
    // 3 now we validate the object id 
    validateObjectId(videoId, "Video ID");
    // 4 comment khali toh nahi hai 
    // ager content hai toh usko trim kar do , ager content nahi hai toh error do
    if(!content?.trim()){
        throw new ApiError(
            400,
            "Comment content is required"
        )
    }

    // 5 now we check ki video exist karti hai ya nahi 
    const videoExists = await Video.exists({
        _id: videoId
    })

    // 6 if video does not exist
    if(!videoExists){
        throw new ApiError(
            404,
            "video not found"
        )
    }

    // 7 now we create the comment 
    const comment = await Comment.create(
        {
            content : content.trim(),
            video: videoId,
            owner : req.user?._id,
            parentComment: null

        }
    )
    // 8. Owner details populate karke lao
    const createdComment = await Comment.findById(  comment._id )
    .populate(
        "owner",
        commentOwnerFields
    )
    .lean()

    // now we send the response 
    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            createdComment,
            "Comment Added Successfully"

        )
    )
})

const addTweetComment = asyncHandler(async(req, res) => {
    // tweet id 
    const {tweetId} = req.params;
    // content from req.body
    const {content} = req.body;
    // vlaidate the objectid 
    validateObjectId(tweetId);

    if(!content?.trim()){
        throw new ApiError(
            400,
            "Content not found"
        )
    }
    // tweet exits or not 
    const tweetExists = await Tweet.exists({_id : tweetId})

    // if not
    if(!tweetExists){
        throw new ApiError(404, "Tweet does not exist")
    }


    // now we create the comment for the tweet

    const comment = await Comment.create(
        {
            content : content.trim(),
            tweet: tweetId,
            parentComment: null,
            owner : req.user._id
        }
    )

    // now we populate the commetn
    const createdComment = await Comment.findById(comment._id)
    .populate(
        "owner",
        commentOwnerFields
    )
    .lean()

    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            createdComment,
            "Tweet Comment created successfully"
        )
    )
})

// updateComment
// 1. Kaunsa comment edit karna hai?
// 2. Comment ID valid hai?
// 3. Naya content aaya?
// 4. Empty to nahi?
// 5. Comment exist karta hai?
// 6. Kya ye comment isi user ka hai?
// 7. Deleted comment to nahi?
// 8. Content update karo
// 9. isEdited = true karo
// 10. editedAt save karo
// 11. Response bhejo

// so the main intution is to we get the updated comment ka content from the request.body and now we have to update the previus comment so for that we havet these upper steps  

const updateComment = asyncHandler(async(req, res) => {
    // find the commentid 
    const {commentId} = req.params;
    const {content} = req.body;

    validateObjectId(commentId);

    // is comment is not empty 
    if(!content?.trim()){
        throw new ApiError(
            400,
            "Content not found"
        )
    }

    // const commentExists = await Comment.exits(
    //     {
    //         _id: commentId
    //     }
    // )
    // if(!commentExists){
    //     throw new ApiError(
    //         404,
    //         "Comment not found"
    //     )
    // }

    // now we check ki ham usse edite kar sakte hai ya nahi and kya comemtn exits karti bhi hai ya nahi 

    const comment = await Comment.findOne(
        {
            _id : commentId,
            isDeleted : false,
            owner : req.user._id
        }
    )

    // if not found
    if(!comment){
        throw new ApiError(
            404,
            "Comment not found or you are not allowed to edit the commnet"
        )
    }


})
