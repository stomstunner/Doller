import mongoose from "mongoose";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { validateObjectId } from "../utils/validateObjectId.js";
import { Subscription } from "../models/subscription.models.js";
import { User } from "../models/user.models.js";

// first of all we make ki user kis type ke content pe subscription perform  kar sakta hai

// video = channel subscribe karne ke liye aur 
// tweet = tweeter pe follow karne ke liye 

const allowedSubscriptionTypes = ["video", "tweet"];

// first of all we make the controller of the tollgesubcription jsise user creater ko subcribe ya unsubscribe kar sake aur ager woh twiter wale section me hai toh creator ko follow ya unfollow kar sake 

const toggleSubscription = asyncHandler(async(req, res)=>{
    // first of all we find the channel id from the params
    const {channelId} = req.params;

    // now we take the type fro, the req.body ya req.query aur ager kuch nahi hoga toh ham usse video hi maan lenge 
    const type = (req.query?.type || req.body?.type || "video").trim().toLowerCase();

    // now we validate the channel id and error preverntain 
    validateObjectId(
        channelId,
        "Channel ID"
    )
    if(!channelId){
        throw new ApiError(
            404,
            "Channel is empty"
        )
    }
    // now we chaek ki type hamara subscript type me se hi koi ho 
    if(!allowedSubscriptionTypes.includes(type)){
        400,
        "Invalid subscription type only video and tweet are allowed"
    }

    // now we make the logic ki user kahi khud ke channel ko subscribe ya follow toh nahi na kar rha hai 
    if(channelId === req.user._id.toString()){
        throw new ApiError(
            400,
            "You cannot subscribe or follow your own Account"
        )
    }

    // now we ckeck ki hamara targeted channel= user databse me hai bhi ya nahi 
    const channelExists = await User.exists(
        {
            _id: channelId
        }
    )

    if(!channelExists){
        throw new ApiError(
            404,
            "Channel not found"
        )
    }

    // now we write the massage that is bsed on the type of what type of channel user fillows 
    const subscribedMessage = type ==="video" ? "Channel Subscribed Successfully" : "User followed successfully "

    const unsubscribeMessage = type === "tweet" ? "Channel Unsubscribed Successfully" : "User unfollwed Successfully "

    // now we find ki user in iss channel ko ky kabhi pahle toh subscribe kar ke nahi na rakha hai toh fir se request massage dene ka matlab hai ki hame usse unsubscribe karenge toh ham uss data ko completele nahi kange baldi bass isactive karenge 
    const existingSubscription = await Subscription.findOne(
        {
            subscriber : req.user._id,
            channel: channelId,
            type: type
        }
    )

    // flip the isactive of the existing channel ager subsribe hai toh unsubsribe 
    if(existingSubscription){

        existingSubscription.isActive = !existingSubscription.isActive

        // and ager user wapas se usse subscribe ya follow kar rha hai toh notifination bell true kar denge 
        if(existingSubscription.isActive){
            existingSubscription.isNotification = true;
        }

        // updated document ko databse me save karenge 
        await existingSubscription.save();

        // now we get the toal active subscription count from the subscription table 
        const subscribersResult = await Subscription.aggregate(
            [
                {
                    $match:{
                        channel: new mongoose.Types.ObjectId(channelId),
                        type: type,
                        isActive: true
                    }
                },
                {
                    // now we will count the total user we have 
                    $count: "subscribersCount"
                }
            ]
        );

        // if no subcriber count is found then the cound will we zero 
        const subscribersCount = subscribersResult.length > 0 ? subscribersResult[0].subscribersCount : 0;

        // now we send the response if i have the existing subscription 
        return res
        .status(200)
        .json(
            new ApiError(
                200, 
                {
                    isSubscribed : existingSubscription.isActive,
                    isNotification : existingSubscription.isNotification,
                    subscribersCount,
                    type
                },
                existingSubscription.isActive ? subscribedMessage : unsubscribeMessage
            )
        )
    }

    // if we are here means databse me koi reord nahi tha ab hame pahli baar subcribe karne pe data banana hai 

    const newSubscription = await Subscription.create({
        subscriber: req.user._id,
        channel: channelId,
        type: type,
        isActive: true,
        isNotification: true
    })

    // now we get the toal active subscriber count from the subscription table
    const subscribersResult = await Subscription.aggregate(
        [
            {
                $match:{
                    subscriber : req.user._id,
                    type: type,
                    isActive: true
                }
            },
            {
                $count:"subscribersCount"
            }
        ]
    )

    const subscribersCount = subscribersResult.length > 0 ? subscribersResult[0].subscribersCount : 0;


    // now we send the resut id the user is subscribeing the user for the first time 
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                isSubscribed: newSubscription.isActive,
                isNotification : newSubscription.isNotification,
                type,
                subscribersCount
            },
            subscribedMessage
        )
    )
})

// now we make the controller for the toggle subscription notifications 
const toggleSubscriptionNotification = asyncHandler(async(req,res)=>{

    // first of all we take the channel id from the request 
    const {channelId} = req.params;

    // now we fetch the type 
    const type = (req.query.type || req.body.type || "video").trim().toLowerCase();

    // now we validate the channel id 
    validateObjectId(
        channelId,
        "Channel ID"
    );

    if(!channelId){
        throw new ApiError(
            404,
            "Channel id is missing"
        )
    }

    // now we check ki hamara jo type hai woh allowedSubscriptionTypes me se hi ho 
    if(!allowedSubscriptionTypes.includes(type)){
        throw new ApiError(
            400,
            "The subscription type should be only video or tweet"
        )
    }

    // now we see ki kahi user khud ke channel ko hi toh notifiaction  nahi nan bhej rha hai 
    if(channelId === req.user._id.toString()){
        throw new ApiError(
            400,
            "You cannot toggle notifications to your own  channel "
        )
    }

    // now we check ki target channel databse me exist bhi karta ho
    const channelExists = await User.exists(
        {
            _id: channelId
        }
    )

    if(!channelExists){
        throw new ApiError(
            404,
            "Channel not found"
        )
    }

    const subscription = await Subscription.findOne(
        {
            subscriber: req.user._id,
            channel: channelId,
            type: type,
            isActive: true,
        }
    )

    if(!subscription){
        throw new ApiError(
            404,
            type === "video" ? "You must have to subscribe to this channel first" : "You must have follow this user first"
        )
    }

    // ab isNotification ko flip (toggle) kar denge
    // true hai toh false (bell off) ho jayega, aur false hai toh true (bell on) ho jayega

    subscription.isNotification = !subscription.isNotification;

    await subscription.save();

    return res
    .status(200)
    .json(
        new ApiError(
            200,
            {
                isNotification : subscription.isNotification,
                type
            },
            subscription.isNotification ? "Notification turned on successfully" : "Notification turned off successfully"
        )
    )

})

// now we make the controller for the get creator all subscriber  list 
const getUserChannelSubscribers = asyncHandler(async(req,res)=>{
    const {channelId} = req.params;

    const type = (req.query.type || req.body.type || "video").trim().toLowerCase();

    validateObjectId(
        channelId,
        "Channel ID"
    )

    if(!channelId){
        throw new ApiError(
            404,
            "Channel id is missing"
        )
    }

    if(!allowedSubscriptionTypes.includes(type)){
        throw new ApiError(
            400,
            "Only video and tweet subscription type is allowed"
        )
    }

    // now we make the pagination for the getting the all subscribers 

    const page = Math.max(
        Number.parseInt(req.query.page) || 1,
        1
    )

    const limit = Math.min(
        Math.max(
            Number.parseInt(req.query.limit) || 50,
            1,
        ),
        100
    )

    const skip = (page - 1) * limit;


    // optional search query for filtering subscriber username or fullName
    const search = req.query.search?.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") || "";

    // now we check ki user ka channel user databse me exist karti bhi hai ya nahi 
    const channelExists = await User.exists({
        _id: channelId
    })

    if(!channelId){
        throw new ApiError(
            404,
            "Channel not found"
        )
    }

    // now we find the subscriber from the user table 
    const subscribersAggregate = await Subscription.aggregate(
        [
            {
                $match: {
                    channel: new mongoose.Types.ObjectId(
                        channelId
                    ),
                    type: type,
                    isActive: true
                }
            },
            {
                // now we take the subscriber details from the User database 
                $lookup:{
                    from:"users",
                    localField: "subscribers",
                    foreignField:"_id",
                    as: "subscriber",
                    pipeline:[
                        {
                            $project:{
                                username: 1,
                                fullName: 1,
                                avatar: 1
                            }
                        }
                    ]
                }
            },
            {
                $addFields:{
                    subscriber:{
                        $first: "$subscriber"
                    }
                }
            },
            {
                $match:{
                    // ager ham search karenge toh username and fullname ke basic pe hai 
                    subscriber:{
                        $ne: null
                    },
                    ...(search && {
                        $or:[
                            {
                                "subscriber.username" : {
                                    $regex: search, 
                                    $options: "i"
                                }
                            },
                            {
                                "subscriber.fullName" :{
                                    $regex: search,
                                    $options: "i"
                                }
                            }
                        ]
                    })
                }
            },
            {
                $facet:{
                    results:[
                        {
                            $sort: {
                                updatedAt: -1
                            }
                        },
                        {
                            $skip: skip
                        },
                        {
                            $limit: limit
                        },
                        {
                            $project:{
                                _id: 1,
                                subscriber: 1,
                                type: 1,
                                subscribedAt: "$updatedAt"
                            }
                        }
                    ],
                    totalCount:[
                        {
                            $count:"total"
                        }
                    ]
                }
            }
        ]
    )

    const subscribers = subscribersAggregate[0]?.results || [];
    const totalSubscribers = subscribersAggregate[0]?.totalCount[0]?.total || 0;


    return res
    .ststus(200)
    .json(
        new ApiResponse(
            200,
            {
                subscribers,
                page,
                limit,
                totalSubscribers,
                totalPages : Math.ceil(totalSubscribers / limit),
                hasNextPage : page * limit < totalSubscribers
            },
            type === "video" ? "Subscribers fetched successfully" : "Follower Fetched Successfully"
        )
    )
})
// now we make the controller for the get creator all subscriber  list 
const getSubscribedChannels = asyncHandler(async(req,res)=>{
    // now we find the subscribed id from the req.parmas and if not then we use the req.user ka id 
    const subscriberId = req.params.subscriberId || req.user._id;


    const type = (req.query?.type || req.body?.type || "video").trim().toLowerCase();

    validateObjectId(
        subscriberId,
        "Subscriber ID"
    )

    if(!subscriberId){
        throw new ApiError(
            404,
            "subscriber id is missing"
        )
    }

    if(!allowedSubscriptionTypes.includes(type)){
        throw new ApiError(
            400,
            "Only video and tweet subscription type is allowed"
        )
    }

    // now we make the pagination for the getting the all subscribers 

    const page = Math.max(
        Number.parseInt(req.query.page) || 1,
        1
    )

    const limit = Math.min(
        Math.max(
            Number.parseInt(req.query.limit) || 50,
            1,
        ),
        100
    )

    const skip = (page - 1) * limit;


    // optional search query for filtering subscriber username or fullName
    const search = req.query.search?.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") || "";

    // // now we check ki user ka channel user databse me exist karti bhi hai ya nahi 
    // const channelExists = await User.exists({
    //     _id: channelId
    // })

    // if(!channelId){
    //     throw new ApiError(
    //         404,
    //         "Channel not found"
    //     )
    // }

    // now we find the subscriber from the user table 
    const channelAggregate = await Subscription.aggregate(
        [
            {
                $match: {
                    subscriber: new mongoose.Types.ObjectId(
                        subscriberId
                    ),
                    type: type,
                    isActive: true
                }
            },
            {
                // now we take the subscriber details from the User database 
                $lookup:{
                    from:"users",
                    localField: "channel",
                    foreignField:"_id",
                    as: "channel",
                    pipeline:[
                        {
                            $project:{
                                username: 1,
                                fullName: 1,
                                avatar: 1,
                                coverImage: 1
                            }
                        }
                    ]
                }
            },
            {
                $addFields:{
                    channel:{
                        $first: "$channel"
                    }
                }
            },
            {
                $match:{
                    // ager ham search karenge toh username and fullname ke basic pe hai 
                    channel:{
                        $ne: null
                    },
                    ...(search && {
                        $or:[
                            {
                                "channel.username" : {
                                    $regex: search, 
                                    $options: "i"
                                }
                            },
                            {
                                "channel.fullName" :{
                                    $regex: search,
                                    $options: "i"
                                }
                            }
                        ]
                    })
                }
            },
            {
                $facet:{
                    results:[
                        {
                            $sort: {
                                updatedAt: -1
                            }
                        },
                        {
                            $skip: skip
                        },
                        {
                            $limit: limit
                        },
                        {
                            $project:{
                                _id: 1,
                                channel: 1,
                                type: 1,
                                isNotification: 1,
                                subscribedAt: "$updatedAt"
                            }
                        }
                    ],
                    totalCount:[
                        {
                            $count:"total"
                        }
                    ]
                }
            }
        ]
    )

    const channel = channelAggregate[0]?.results || [];
    const totalChannel = channelAggregate[0]?.totalCount[0]?.total || 0;


    return res
    .ststus(200)
    .json(
        new ApiResponse(
            200,
            {
                channel,
                page,
                limit,
                totalChannel,
                totalPages : Math.ceil(totalChannel / limit),
                hasNextPage : page * limit < totalChannel
            },
            type === "video" ? "Subscribed Channel fetched successfully" : "Follower Channel Fetched Successfully"
        )
    )
})

// now we make the controller for the get creator all subscriber  list 
const getSubscribedChannels = asyncHandler(async(req,res)=>{
    // now we find the subscribed id from the req.parmas and if not then we use the req.user ka id 
    const subscriberId = req.params.subscriberId || req.user._id;


    const type = (req.query?.type || req.body?.type || "video").trim().toLowerCase();

    validateObjectId(
        subscriberId,
        "Subscriber ID"
    )

    if(!subscriberId){
        throw new ApiError(
            404,
            "subscriber id is missing"
        )
    }

    if(!allowedSubscriptionTypes.includes(type)){
        throw new ApiError(
            400,
            "Only video and tweet subscription type is allowed"
        )
    }

    // now we make the pagination for the getting the all subscribers 

    const page = Math.max(
        Number.parseInt(req.query.page) || 1,
        1
    )

    const limit = Math.min(
        Math.max(
            Number.parseInt(req.query.limit) || 50,
            1,
        ),
        100
    )

    const skip = (page - 1) * limit;


    // optional search query for filtering subscriber username or fullName
    const search = req.query.search?.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") || "";

    // // now we check ki user ka channel user databse me exist karti bhi hai ya nahi 
    // const channelExists = await User.exists({
    //     _id: channelId
    // })

    // if(!channelId){
    //     throw new ApiError(
    //         404,
    //         "Channel not found"
    //     )
    // }

    // now we find the subscriber from the user table 
    const channelAggregate = await Subscription.aggregate(
        [
            {
                $match: {
                    subscriber: new mongoose.Types.ObjectId(
                        subscriberId
                    ),
                    type: type,
                    isActive: true
                }
            },
            {
                // now we take the subscriber details from the User database 
                $lookup:{
                    from:"users",
                    localField: "channel",
                    foreignField:"_id",
                    as: "channel",
                    pipeline:[
                        {
                            $project:{
                                username: 1,
                                fullName: 1,
                                avatar: 1,
                                coverImage: 1
                            }
                        }
                    ]
                }
            },
            {
                $addFields:{
                    channel:{
                        $first: "$channel"
                    }
                }
            },
            {
                $match:{
                    // ager ham search karenge toh username and fullname ke basic pe hai 
                    channel:{
                        $ne: null
                    },
                    ...(search && {
                        $or:[
                            {
                                "channel.username" : {
                                    $regex: search, 
                                    $options: "i"
                                }
                            },
                            {
                                "channel.fullName" :{
                                    $regex: search,
                                    $options: "i"
                                }
                            }
                        ]
                    })
                }
            },
            {
                $facet:{
                    results:[
                        {
                            $sort: {
                                updatedAt: -1
                            }
                        },
                        {
                            $skip: skip
                        },
                        {
                            $limit: limit
                        },
                        {
                            $project:{
                                _id: 1,
                                channel: 1,
                                type: 1,
                                isNotification: 1,
                                subscribedAt: "$updatedAt"
                            }
                        }
                    ],
                    totalCount:[
                        {
                            $count:"total"
                        }
                    ]
                }
            }
        ]
    )

    const channel = channelAggregate[0]?.results || [];
    const totalChannel = channelAggregate[0]?.totalCount[0]?.total || 0;


    return res
    .ststus(200)
    .json(
        new ApiResponse(
            200,
            {
                channel,
                page,
                limit,
                totalChannel,
                totalPages : Math.ceil(totalChannel / limit),
                hasNextPage : page * limit < totalChannel
            },
            type === "video" ? "Subscribed Channel fetched successfully" : "Follower Channel Fetched Successfully"
        )
    )
})

export {
    toggleSubscription,
    toggleSubscriptionNotification,
    getUserChannelSubscribers,
    getSu
}


