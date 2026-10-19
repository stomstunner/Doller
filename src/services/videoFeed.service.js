import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { validateObjectId } from "../utils/validateObjectId.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import { Video } from "../models/video.models.js";
import { FeedImpression } from "../models/feedImpression.models.js";
import { builtUserIntrestProfile, calculateInterestScore } from "./recommendation.service.js";

// so here we write ki ham kitna personlized video ko apne feed me laa sakte hai aur baaki jo hoga woh popular video se aayega 
const PERSONALIZED_RATIO = 0.8;

// ek request me kitni video ko load karni hai 
const MAX_FEED_LIMIT = 50;

// now we we set ki maximum kitni video lani hai hame video user intrest ko 
// this is for personlized ranking = best 500 video not all videos from the database 
const VIDEO_CANDIDATE_LIMIT = 500;

// popular videos ke liye sirf pichli 3 months ke video elizible honge 
const POPULAR_VIDEO_MONTHS = 3;

// pichli 7 din me dikhaya gaya videos ko ham recently shown mana jayega 
const RECENT_IMPRESSION_DAYS = 7;

// EK HI    video 7 din me 3 baar dikh chuki hai toh usse ham surpass karnegen dislike nahi kanrene
const MAX_RECENT_IMPRESSION = 3;


// now we will make a fucntion that help us to find the previous past 3 month not the 90 days 
function getPopularCutoffDate(){
    // abhi ka date 
    const cutoffDate = new Date();

    // now we will set the month in the cutoff date and we will get the month ki hamne kitna set karna hai moth from the popular video month 
    cutoffDate.setMonth(cutoffDate.getMonth() - POPULAR_VIDEO_MONTHS)

    return cutoffDate;

}

// now we find the 7 din pahle ka cutoff from now 
function getRecentImpressionCutoffDate(){
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RECENT_IMPRESSION_DAYS);
    return cutoffDate;
}

// now we make a function for filtering the recently shown videos 
function filterRecentlyShownVideos(videos, impressionMap){

    // videos me hamre pass wohi video store hoga jo true return akrege kyuki ham unhiko dikhayenge jo false return karege kyuki woh baar baar feed me aa gaya hai toh usse ham nahi dikahyenge 
    
    return videos.filter(
        // take 1 video at a time 
        (video) => {
            // ab uss curretn video ki impression summery find karte hai.
            // impression me hamre pass har video ka information hai 
            const impression = impressionMap.get(String(video._id));
            // current video ka video id ko ham string me convert kar ke impression me daal lenge 

            // ager hamare pass impression nahi hai toh hamne woh video pahle show nahi hui hai matlab nahi video hai 
            if(!impression){
                return true;
            }

            // last time video kab dikhayi gai thi 
            const lastShownAt = new Date(impression.lastShownAt);

            // we want ki ham sirf recent window impression ko consider karnege 
            // jo ki yaha pe 7 din hai 
            // ager 7 din ke ander 3 baar dikha diya gaya hai toh ham usse nahi dikhayenge but maan ke 8..9 din pahle woh video dikahya gaya hai tab ham usse dikha sakte hai 

            const isRecentlyShown = lastShownAt > getRecentImpressionCutoffDate();

            // ager isRecentlyShown me false value hai ham tab ham usse dikha sakte hai nahi toh hata denge 
            // purani video eligible hai 
            if(!isRecentlyShown){
                return true;
            }

            // now we want ki ham recently shown video ko surpass kar karne koi naya video aaye 
            // check ki hamare showing window me kya thresshold cross toh nahi ho gaya hai 
            const hasRepeatedExposure = impression.impressionCount >= MAX_RECENT_IMPRESSION;

            // surpass that video 
            if(hasRepeatedExposure){
                return false
            }

            return true;
        }
    )
}


// now we make the helper function jisse hame non dubpicatedVideos hi milega
function removeDuplicateVideos(videos){
    // now we store only those ids in the set jo hame mil chuki hai 
    const seenIds = new Set();

    // now we return the videos that is non dubplicated 
    return videos.filter((video)=>{
        // now we change the video object id from the mongodb object id to string 
        const videoId = String(video._id);


        // ager hamen id pahle hi hai seenId me toh return kar do kuch mat karo 
        if(seenIds.has(videoId)) return false;

        // ager hame id pahli baar mili hai toh usse seenIds set me add kar lo 
        seenIds.add(videoId);

        // video unique hai isliye sse ham list me store kar ke rakhenge 
        return true;
    });
}

// now we make the helper function that help us to mix the personlized video and popular Video
function builtMixedFeed(
    personalizedVideos,
    popularVideos,
    limit,
    personalizedRatio = PERSONALIZED_RATIO
){
            
    // if we have the limit is 10 and the personilized target is 8 then polular videos we need is 2
    const personilizedLimit = Math.round(limit*personalizedRatio);

    const popularLimit = limit - personilizedLimit;

    // now we track the current index for the bot list 
    const personlizedIndex = 0;
    const popularIndex = 0;

    // now we use the logic ki jab tak hamre kisi bhi list me video bachu hui hai batches banate rahege 
    while(personlizedIndex < personalizedVideos.length || popularIndex < popularVideos.length){
        // har batch me maximum limit ki videos aayengi
        const batches = [];

        // now we fill the videos with personlized video first then popular videos 
        // like mere pass 8 personlized videos dalne ka allowence hai toh mai har batch me utne video dlunga 
        while(batches.lenght < personilizedLimit && personlizedIndex< personalizedVideos.length){

            batches.push(personalizedVideos[personlizedIndex]);
            // now we increse the value of the personlizedIndex
            personlizedIndex++;
        }

        // now we fill in batches all the popularVideos
        while(batches.limit < popularLimit 
            && batches.length < personilizedLimit + popularLimit 
            && popularIndex < popularVideos.length){

            batches.push(popularVideos[popularIndex]);
            popularIndex++;
        }

        // ager abhi bhi mera batches puri tarah se fill nahi hua hai toh ham usme popular videos ko hi fill akr denge 
        while(batches.length < limit){

            if(personlizedIndex < personalizedVideos.length){

                batches.push(personalizedVideos[personlizedIndex]);
                personlizedIndex++;
            }
            else if(popularIndex < popularVideos.length){
                batches.push(popularVideos[popularIndex]);
                popularIndex++;
            }
            else{
                break;
                // means dono list kahatam ho gai hai aur videos bhi nahi hai 
            }
        }

        // for sefty hamre batch me kuch add hi nahi hua toh ham usse bachne ke kiye usse stop karenge

        if(batches.length === 0){
            break;
        }

        // now we append the batches to the feed 
        feed.push(...batches)
    }
    return feed;
}

// now we make the videoHomeFeed 
export const getVideoHomeFeed = asyncHandler(async(req, res)=>{
    const userId = req.user._id;
    validateObjectId(
        userId,
        "User ID"
    );
    if(!userId){
        throw new ApiError(
            404,
            "User not found"
        )
    }

    // now we make the pagiantion logic for the controller 
    const page = Math.max(
        // we need default 1 page 
        Number.parseInt(req.query.page, 1) || 1,
        1
    );

    const limit = Math.min(
        MAX_FEED_LIMIT,
        Math.max(
            // we need default 10 limit
            Number.parseInt(req.query.limit, 10) || 20,
            1
        )
    )

    // now take the builtUserIntrestProfile and gave the user id 
    const userProfile = await builtUserIntrestProfile(userId);

    // now we take the video interests 
    const videoInterests = userProfile.videoInterests;
    const popularCandidates = userProfile.popularVideos || [];

    // abhi ham latest publieshed video me se candiate video laa rhahe hai
    // but we want ki hamare popular videos bass pichli 3 manine ka hi videos ho na ki all time ka popular videos 
    

})