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

