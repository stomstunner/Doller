import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { FeedImpression } from "../models/feedImpression.models.js";
import { Tweet } from "../models/tweet.models.js";
import { validateObjectId } from "../utils/validateObjectId.js";
import { builtUserIntrestProfile,calculateInterestScore } from "./recommendation.service.js"; 

// now we make the some configuration settings 

// how much should feed retained its personalized tweets
const PERSONALIZED_RATIO = 0.8;

// maximum feed send to one page 
const MAX_FEED_LIMIT = 50; // 50 tweet 

// now we set how many we send the tweet for user recommendation 
const TWEET_CANDIDATE_LIMIT = 500;

// popular tweet should come for the last 3 months 
const POPULAR_TWEET_MONTHS = 3;

// for how many days we want to show tweet to user 
const RECENT_IMPRESSION_DAYS = 7;

// we set the window ki kitne baar ham ek hi tweet ko show kar sakte hai same user ko 7 din ke ander 
const MAX_RECENT_IMPRESSION = 3

// this is for to fnd the popular tweet ka cutoff date 
const getPopularCutoffDate = ()=>{

    // get current date 
    const date = new Date();


    // move date back by three months 
    date.setMonth(date.getMonth() - POPULAR_TWEET_MONTHS);

    // return the cutoffdate 
    return date;
}

// now we create a fucntion for check the recent impression cutoffDate
const getRecentImpressionCutoffDate = ()=>{
    const date = new Date();

    date.setDate(date.getDate() - RECENT_IMPRESSION_DAYS);

    return date;
}

// now we create a function for remove the duplicate tweets 
const removeDuplicateTweets = (tweets) =>{

    // now we create a set for storing the tweetIDS 
    const tweetIds = new Set();

    // create an array to store unique tweets 
    const uniqueTweets = [];

    // loop through all tweets 
    for(const tweet of tweets){
        // get tweet id as string 
        const tweetId = String(tweet._id);

        // if this tweet id is already present then skip this tweet 
        if(tweetIds.has(tweetId)) continue;

        // now set this tweetid to set 
        tweetIds.add(tweet);

        // now we add this tweet to unique tweets
        uniqueTweets.push(tweet);
    }

    // now we return tweets whithout duplicates 
    return uniqueTweets;
}

// now we create a fucntion for find the recently shown tweets 
const filterRecentlyShownTweets = (tweets, impressionMap)=>{

    // we make a array that will store that ki filtered tweet 
    const filteredTweets = [];

    for(const tweet of tweets){

        // convert the tweetid to the string and sotre it 
        const tweetId = String(tweet._id);

        // now we get the impression information for this tweet 
        const impression = impressionMap.get(tweetId);

        // if impression does not exist then we can show this tweet 
        if(!impression){
            filteredTweets.push(tweet);
            continue
        }

        // now if it is not new 
        // get last time the tweet was shown 
        const lastShownAt = new Date(impression.lastShownAt);

        // get recentImpressionCutoffDate
        const recentCutoffDate = getRecentImpressionCutoffDate();


        // check that ki ye tweeet kahi recently show toh nahi hua hai 
        const  wasShownRecently = lastShownAt >= recentCutoffDate;

        // if it was shown recenlt and reach the limit then cutoff
        if(wasShownRecently && impression.impressionCount >= MAX_RECENT_IMPRESSION){
            continue;
        }
        // otherwise add that tweet
        filteredTweets.push(tweet)
    }

    return filteredTweets;
}

// now we amke a fucntion that will help to mix the personlized and  personal tweets 
const builtMixedTweetFeed = (personalizedTweets, popularTweets, limit, personalizedRatio = PERSONALIZED_RATIO)=>{

    // now we calculate how many personlized tweets we want 
    const personalizedLimit = Math.ceil(limit * personalizedRatio);

    // we create an array to store the final feed 
    const mixedTweets = [];

    // create a set to prevent duplicate tweets 
    const addedTweetIds = new Set();

    // first we add the personalizedTweets
    for(const tweet of personalizedTweets){

        // stop when we have the enough personlized tweet 
        if(mixedTweets.length >= personalizedLimit){
            break;
        }

        // get the tweet id 
        const tweetId = String(tweet._id);

        // we will skip this tweet if it is already in the addedTweetsIds 
        if(addedTweetIds.has(tweetId)) continue;

        // if not added to the addedTweetIds
        addedTweetIds.add(tweetId);


        // now we will add the tweet to the final feed 
        mixedTweets.push(tweet);
    }

    // after adding the personlized tweet we will add the popular tweet untile the limit reached 
    for(const tweet of popularTweets){

        // first of we will check ki kahi hamara popular tweet ka limit o pura nahi ho gya na bhai
        if(mixedTweets.length >= limit) break;

        const tweetId= String(tweet._id);

        if(addedTweetIds.has(tweetId)) continue;

        addedTweetIds.add(tweetId);

        mixedTweets.push(tweet);
    }

    // if we remmainning more tweet then fill with personalizedTweets
    for(const tweet of personalizedTweets){

        if(mixedTweets.length >= limit) break;

        const tweetId = String(tweet._id);

        if(addedTweetIds.has(tweetId)) continue;

        // pahle tweet id ko set me dalo 
        addedTweetIds.add(tweetId);

        // then tweet ko mixed tweet me dalo 
        mixedTweets.push(tweet);
    }

    return mixedTweets;
};

// now we create a function for save and create impression 
const saveTweetImpressions = async(userId, tweets) =>{

    // first of all we get the current date and time 
    const currentDate = new Date();

    // loop for tweet that is shown in the feed 
    for(const tweet of tweets){

        // first of all we find ki exixting impression ky hai iss current user ke liye 
        const existingImpression = await FeedImpression.findOne({
            user: userId,
            contentType:"tweet",
            contentId: tweet._id
        });

        // if the impression already exists then update it 
        if(existingImpression){
            existingImpression.lastShownAt = currentDate;
            existingImpression.impressionCount +=1;

            // save the updated impression with await becasuse we have to save in the database
            await existingImpression.save();
        }
        else{
            // otherwise create a new impression record 
            await FeedImpression.create(
                {
                    user: userId,
                    contentType: "tweet",
                    contentModel: "Tweet",
                    contentId: tweet._id,
                    firstShownAt: currentDate,
                    lastShownAt : currentDate,
                    impressionCount: 1,
                    feedType: "home"
                }
            )
        }
    }
};

// now we create the main controller to get the hometweetfeed
export const getTweetHomeFeed = asyncHandler(async(req, res)=>{

    const userId = req.user?._id;
    validateObjectId(
        userId,
        "User ID"
    )

    if(!userId){
        throw new ApiError(
            401,
            "User is not authenticated"
        )
    }

    // get page number from query
    let page = Math.max(
        Number.parseInt(req.query.page, 10) || 1,
        1
    
    )

    // page should not be less than 1
    if (page < 1) {
        page = 1;
    }

    // get requested limit from query
    let limit = Math.min(
        Math.max(
            Number.parseInt(req.query.limit, 10) || 20,
            1
        ),
        50
    )

    // limit should not be less than 1
    if (limit < 1) {
        limit = 10;
    }

    // prevent the client from requesting too many tweets
    if (limit > MAX_FEED_LIMIT) {
        limit = MAX_FEED_LIMIT;
    }

    // calculate how many tweets to skip
    const skip = (page - 1) * limit;

    // popular cutoff date
    const popularCutoffDate = getPopularCutoffDate();

    const recentImpressionCutoffDate = getRecentImpressionCutoffDate();

    // now we get the usersintrest profile 
    const interestProfile = await builtUserIntrestProfile(userId);

    // if intrest profile was not created 
    if(!interestProfile){
        throw new ApiError(
            500,
            "User intrest not available"
        )
    }

    // now we get the tweet that is alread shown receltly 
    const recentImpressions = await FeedImpression.find({
        user: userId,
        contentType: "tweet",
        lastShownAt: {
            $gt: recentImpressionCutoffDate
        }
    })
    .select(" contentId lastShownAt impressionCount")
    .lean()


    // now we create a map to store the impression date 
    const impressionMap = new Map();
    // loop through all recent impression 
    for(const impression of recentImpressions){
        // store the impression data throught the tweet id 
        impressionMap.set(
            impression.contentId.toString(),
            impression
        )
    }

    // fetch candidate tweet 
    const candidateTweets = await Tweet.find({
        createdAt:{
            $gt: popularCutoffDate
        }
    })
    .sort(
        {
            createdAt:-1
        }
    )
    .limit(TWEET_CANDIDATE_LIMIT)
    .lean()

    // now we create a array to store the personlized tweets 
    const personlizedTweets = [];

    // now we loop through all the tweet and find ki kon se tweet ka kitna intrest match ho raha hai 
    for(const tweet of candidateTweets){
        // now we fetch all the tweet text for sending to the candidateintrest finding function 
        const tweetText = [
            tweet.content || ""
        ].join(" ");

        // calculate how much this tweet matches the user intrest 
        const interestScore= calculateInterestScore(
            tweetText,
            interestProfile.tweetInterests
            // abhi ka kya text hai aur pahle ka uska kitna weightage hai 
        )

        personlizedTweets.push(
            {...tweet,
            interestScore}
        )
    }

    // now sort personalized tweets by interest score
    personlizedTweets.sort((a, b) => {

        // higher interest score should come first
        if (b.interestScore !== a.interestScore) {
            return b.interestScore - a.interestScore;
        }

        // if score is equal then newer tweets should come first
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // now filter out recently shown tweets
    const filteredPersonlizedTweets = filterRecentlyShownTweets(
        personlizedTweets,
        impressionMap
    );


    // now remove duplicate tweets from personalized feed
    const uniquePersonlizedTweets = removeDuplicateTweets(
        filteredPersonlizedTweets
    );


    const popularTweetsFromProfile = Array.isArray(interestProfile.popularTweets)
        ? interestProfile.popularTweets
        : [];


    // now filter popular tweets to keep only recent tweets
    const recentPopularTweets = popularTweetsFromProfile.filter((tweet) => {

        // skip if tweet does not have an id
        if (!tweet?._id) {
            return false;
        }

        // keep tweets created after the cutoff date
        return new Date(tweet.createdAt) >= popularCutoffDate;
    });


    // now filter recently shown popular tweets
    const filteredPopularTweets = filterRecentlyShownTweets(
        recentPopularTweets,
        impressionMap
    );


    // now remove duplicate popular tweets
    const uniquePopularTweets = removeDuplicateTweets(filteredPopularTweets);


    // now create the final mixed feed
    const mixedTweets = builtMixedTweetFeed(
        uniquePersonlizedTweets,
        uniquePopularTweets,
        skip + limit
    );


    // now get tweets for the requested page
    const paginatedTweets = mixedTweets.slice(skip, skip + limit);


    // save impressions for tweets returned on this page
    await saveTweetImpressions(userId, paginatedTweets);


    // now calculate total tweets available in the assembled feed
    const totalTweets = mixedTweets.length;

    // calculate total pages
    const totalPages = Math.ceil(totalTweets / limit);

    // check whether next page exists
    const hasNextPage = page < totalPages;

    // check whether previous page exists
    const hasPreviousPage = page > 1;


    // now send the response
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                tweets: paginatedTweets,
                pagination: {
                    page,
                    limit,
                    totalTweets,
                    totalPages,
                    hasNextPage,
                    hasPreviousPage
                }
            },
            "Tweet home feed fetched successfully"
        )
    );
})