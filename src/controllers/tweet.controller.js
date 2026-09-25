import mongoose from "mongoose";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { validateObjectId } from "../utils/validateObjectId.js";
import { Tweet } from "../models/tweet.models.js";
import { User } from "../models/user.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";


// lets make the controller for the create a tweet 
const createTweet = asyncHandler(async(req, res) => {
    // the fisrt step is to store the ids 
    // and content from the query 
    const {content} = req.body;

    // we store the mentions from the content after taking only that text that has a @

    // now we check ki hamare content me kuch data hai bhi ya nahi ager nahi hua toh error return 
    if(!content?.trim()){
        throw new ApiError(
            400,
            "Tweet content is required"
        )
    }

    // now we check ki hamara content ka length 300 characters se bara na ho nahi toh error bhejo

    // minimum length validation

    if(content.trim().length < 3){

        throw new ApiError(
            400,
            "Tweet must contain at least 3 characters"
        );
    }

    if(content.trim().length > 300){
        throw new ApiError(
            400,
            "Tweet content cannot exceed 300 characters"
        )
    }

    // now we fetch all the mentions from the content by using regex 
    const mentionMatches = content.match(
        /(?:@|\/)([a-zA-Z0-9_]+)/g
    ) || [];

    // now we remove the @ from the mentions 
    const usernames = mentionMatches.map(
        (username) => username.substring(1)
    );
    // iska matlab hai ki hama usernames me store kar woh array jisme methionmatch pe map lagnane ke baad har ek username ya har ek object ko le ke uska 1st charcter hata diya kyuki hamne username .substring(1) kar diya kyuki hamra string hi 1 se suru hua last kat @ ko hamne store hi nahi kiya hai 

    // now we want to store all the mentions but only the unique one so in the array we use the set for storing the uniques values only aur ham array ke ander hi set ka use kangene toh set banne ke baad bhi woh array hi rahega
    // pahle arayy ke ander sare data ko spread karo then set me convert karo 

    const uniqueUsernames = [
        ...new Set(usernames)
    ];

    // now we find all the users that exits in the database 
    const mentionedUsers = await User.find(
        {
            username : {
                $in: uniqueUsernames
            }
        }
    ).select("_id")

    // now we do the validation ki hamne jo methionedUsers me jo objects hai aur usniques me jo object hai unka length match ho bhi rha hai kya nahi ager hani then hame error dena hoga
    if(mentionedUsers.length !== uniqueUsernames.length){
        throw new ApiError(
            404,
            "One or more mentioned user do not exits"
        )
    }

    // now we have methionedUsers but in object so we want to convert and store the array out of it 
    const mentions = mentionedUsers.map(
        (user) => user._id
        // ye _id aaya hai hamare metionsuser ke ander se ki unko saro ko = user khud ek obejt hai toh usme id ko nikalo aur usnke ander se nikalne ke baad ham user me store kar denge aur fir uso array me badl denge kyui hamne mentionuser jo ki ek object og object hai uske har ek object ko rahe hai aur usko array bana rahe hai 
    )

    // now we create the tweet 
    const tweet = await Tweet.create(
        {
            content : content.trim(),
            owner : req.user._id,
            mentions,
            // mentions me hamare pass array of object id hoga user ka 
        }
    )

    if(!tweet){
        throw new ApiError(
            500,
            "Failed to create Tweet"
        )
    }

    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            tweet,
            "Tweet created successfully"
        )
    )

})

/*
UpdateTweet controllers 

1. Tweet exist karta hai ya nahi
2. Tweet deleted toh nahi hai
3. Tweet ka owner current user hi hai ya nahi
4. New content valid hai ya nahi
5. Mentions dobara extract karni hain
6. isEdited = true karna hai
7. editedAt update karna hai

*/

const updateTweet = asyncHandler(async(req, res)=> {
    // first of all we take the id from the params 
    const {tweetId} = req.params;

    // now the 2nd step is to validate the object id 
    validateObjectId(
        tweetId,
        "Tweet ID"
    )

    // now we fetch the data of the content
    // ye woh content hai jo user hame de rha hai update karne ke liye 
    const {content} = req.body;

    if(!content?.trim()){
        throw new ApiError(
            400,
            "Tweet content is required"
        )
    }

    // now we make sure ki tweet ka lenght bhi sahi ho 
    if(content.trim().length < 3){
        throw new ApiError(
            400,
            "Tweet must contain 3 characters"
        )
    }

    if(content.trim().length > 300){
        throw new ApiError(
            400,
            "Tweet cannot exceed 300 characters"
        )
    }

    // now we fetch the tweet from the database 
    const tweet = await Tweet.findOne(
        {
            _id: tweetId,
            isDeleted: false,
            owner: req.user._id
        }
    )

    if(!tweet){
        throw new ApiError(
            404,
            "Tweet not found or you are not allowed to update the tweet"
        )
    }

    const mentionMatches = content.match(
        /(?:@|\/)([a-zA-Z0-9_]+)/g
    ) || [];

    // now we remove the username from the content 
    const usernames = mentionMatches.map(
        (username) => username.substring(1)
    )

    // remove the duplicate metions 
    const uniqueUsernames = [
        ...new Set(usernames)
    ];

    // now we find the all metioned username ka id from the databse 
    const mentionedUsers = await User.find(
        {
            username:{
                $in: uniqueUsernames
            }
        }
    ).select("_id")

    // now we have to validate the all metions that comes from the user without the uniques is exits or not 
    if(mentionedUsers.length !== uniqueUsernames.length){
        throw new ApiError(
            404,
            "One or more mentioned user is not found"
        )
    }

    // we have object of object but we want ki hamre pass metions me bass arayy ho ids of user ka
    const mentions = mentionedUsers.map(
        (user) => user._id
    )
    // in metions we store array

    // now the important part is to update the tweet filed 
    tweet.content = content.trim();
    tweet.mentions = mentions;
    tweet.isEdited = true,
    tweet.editedAt = new Date();
    // save the updated tweet
    await tweet.save();

    // now we make the updated tweet me kya kya store ho 
    const updatedTweet = await Tweet.findById(tweetId)
    .populate(
        "owner",
        "fullName username avatar"
    )
    .populate(
        "mentions",
        "fullName username avatar"
    )
    .lean()

    // now we send the response 
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatedTweet,
            "Tweet Updated Successfully"
        )
    )
})

// lets make the deleteTweet controller 
const deleteTweet = asyncHandler(async(req, res) => {
    // lets fetched the id
    const {tweetId} = req.params;
    
    validateObjectId(
        tweetId,
        "Tweet ID"
    );

    const tweet = await Tweet.find(
        {
            _id : tweetId,
            isDeleted: false,
            owner : req.user._id,
        }
    )

    if(!tweet){
        throw new ApiError(
            404,
            "Tweet Not found"
        )
    }

    // mark tweet as delete 
    
})

