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

export {
    toggleSubscription,
    
}


