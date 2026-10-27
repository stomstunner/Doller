

---
```jsx

// now we import asyncHandler
import { asyncHandler } from "../utils/asynchandler.js";

// now we import ApiError
import { ApiError } from "../utils/ApiError.js";

// now we import validateObjectId
import { validateObjectId } from "../utils/validateObjectId.js";

// now we import ApiResponse
import { ApiResponse } from "../utils/ApiResponse.js";

// now we import Tweet model
import { Tweet } from "../models/tweet.models.js";

// now we import FeedImpression model
import { FeedImpression } from "../models/feedImpression.models.js";

// now we import our existing recommendation service
import {
    builtUserIntrestProfile,
    calculateInterestScore
} from "./recommendation.service.js";


// now we define some configuration constants

// how much feed should contain personalized tweets
const PERSONALIZED_RATIO = 0.8;

// maximum tweets we can send in one page
const MAX_FEED_LIMIT = 50;

// how many tweet candidates we can fetch for recommendation
const TWEET_CANDIDATE_LIMIT = 500;

// popular tweets should come from the last 3 months
const POPULAR_TWEET_MONTHS = 3;

// how many days of recent impressions we want to check
const RECENT_IMPRESSION_DAYS = 7;

// maximum times a tweet can be shown during our recent-impression window
const MAX_RECENT_IMPRESSION = 3;


// now we create a function to get popular tweets cutoff date
const getPopularCutoffDate = () => {

    // get current date
    const date = new Date();

    // move date back by 3 months
    date.setMonth(date.getMonth() - POPULAR_TWEET_MONTHS);

    // return the cutoff date
    return date;
};


// now we create a function to get recent impression cutoff date
const getRecentImpressionCutoffDate = () => {

    // get current date
    const date = new Date();

    // move date back by 7 days
    date.setDate(date.getDate() - RECENT_IMPRESSION_DAYS);

    // return the cutoff date
    return date;
};


// now we create a function to remove duplicate tweets
const removeDuplicateTweets = (tweets) => {

    // create a set to store tweet ids
    const tweetIds = new Set();

    // create an array to store unique tweets
    const uniqueTweets = [];

    // loop through all tweets
    for (const tweet of tweets) {

        // get tweet id as string
        const tweetId = tweet._id.toString();

        // if this tweet id is already present then skip it
        if (tweetIds.has(tweetId)) {
            continue;
        }

        // otherwise add this tweet id to set
        tweetIds.add(tweetId);

        // add this tweet to unique tweets
        uniqueTweets.push(tweet);
    }

    // return tweets without duplicates
    return uniqueTweets;
};


// now we create a function to filter recently shown tweets
const filterRecentlyShownTweets = (tweets, impressionMap) => {

    // create an array to store tweets which can be shown
    const filteredTweets = [];

    // loop through all tweets
    for (const tweet of tweets) {

        // get tweet id as string
        const tweetId = tweet._id.toString();

        // get impression information for this tweet
        const impression = impressionMap.get(tweetId);

        // if impression does not exist then we can show this tweet
        if (!impression) {
            filteredTweets.push(tweet);
            continue;
        }

        // get the last time this tweet was shown
        const lastShownAt = new Date(impression.lastShownAt);

        // get the recent impression cutoff date
        const recentCutoffDate = getRecentImpressionCutoffDate();

        // check whether this tweet was shown recently
        const wasShownRecently = lastShownAt >= recentCutoffDate;

        // if it was shown recently and has reached our limit then skip it
        if (
            wasShownRecently &&
            impression.impressionCount >= MAX_RECENT_IMPRESSION
        ) {
            continue;
        }

        // otherwise add the tweet
        filteredTweets.push(tweet);
    }

    // return filtered tweets
    return filteredTweets;
};


// now we create a function to mix personalized and popular tweets
const builtMixedTweetFeed = (
    personalizedTweets,
    popularTweets,
    limit,
    personalizedRatio = PERSONALIZED_RATIO
) => {

    // calculate how many personalized tweets we want
    const personalizedLimit = Math.ceil(limit * personalizedRatio);

    // create an array to store the final feed
    const mixedTweets = [];

    // create a set to prevent duplicate tweets
    const addedTweetIds = new Set();

    // first we add personalized tweets
    for (const tweet of personalizedTweets) {

        // stop when we have enough personalized tweets
        if (mixedTweets.length >= personalizedLimit) {
            break;
        }

        // get tweet id
        const tweetId = tweet._id.toString();

        // skip if already added
        if (addedTweetIds.has(tweetId)) {
            continue;
        }

        // add tweet id to set
        addedTweetIds.add(tweetId);

        // add tweet to final feed
        mixedTweets.push(tweet);
    }

    // now add popular tweets until the requested limit is reached
    for (const tweet of popularTweets) {

        // stop when the feed has enough tweets
        if (mixedTweets.length >= limit) {
            break;
        }

        // get tweet id
        const tweetId = tweet._id.toString();

        // skip if already added
        if (addedTweetIds.has(tweetId)) {
            continue;
        }

        // add tweet id to set
        addedTweetIds.add(tweetId);

        // add tweet to final feed
        mixedTweets.push(tweet);
    }

    // if we still need more tweets, use remaining personalized tweets
    for (const tweet of personalizedTweets) {

        // stop when the feed has enough tweets
        if (mixedTweets.length >= limit) {
            break;
        }

        // get tweet id
        const tweetId = tweet._id.toString();

        // skip if already added
        if (addedTweetIds.has(tweetId)) {
            continue;
        }

        // add tweet id to set
        addedTweetIds.add(tweetId);

        // add tweet to final feed
        mixedTweets.push(tweet);
    }

    // return mixed feed
    return mixedTweets;
};


// now we create a function to save or update tweet impressions
const saveTweetImpressions = async (userId, tweets) => {

    // get current date and time
    const currentDate = new Date();

    // loop through tweets shown in this feed
    for (const tweet of tweets) {

        // find existing impression for this user and tweet
        const existingImpression = await FeedImpression.findOne({
            user: userId,
            contentType: "tweet",
            contentId: tweet._id
        });

        // if impression already exists then update it
        if (existingImpression) {

            // update last shown time
            existingImpression.lastShownAt = currentDate;

            // increase impression count
            existingImpression.impressionCount += 1;

            // save updated impression
            await existingImpression.save();

        } else {

            // otherwise create a new impression record
            await FeedImpression.create({
                user: userId,
                contentType: "tweet",
                contentModel: "Tweet",
                contentId: tweet._id,
                firstShownAt: currentDate,
                lastShownAt: currentDate,
                impressionCount: 1,
                feedType: "home"
            });
        }
    }
};


// now we create the main controller to get tweet home feed
export const getTweetHomeFeed = asyncHandler(async (req, res) => {

    // get logged-in user's id
    const userId = req.user?._id;

    // check whether user id exists
    if (!userId) {
        throw new ApiError(401, "User is not authenticated");
    }

    // validate user id
    validateObjectId(userId);

    // get page number from query
    let page = Number.parseInt(req.query.page, 10) || 1;

    // page should not be less than 1
    if (page < 1) {
        page = 1;
    }

    // get requested limit from query
    let limit = Number.parseInt(req.query.limit, 10) || 10;

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

    // get the date from which popular tweets can be selected
    const popularCutoffDate = getPopularCutoffDate();

    // get the date from which recent impressions should be checked
    const recentImpressionCutoffDate = getRecentImpressionCutoffDate();


    // now get the user's interest profile
    const interestProfile = await builtUserIntrestProfile(userId);

    // if interest profile was not created then return an error
    if (!interestProfile) {
        throw new ApiError(500, "Unable to build user interest profile");
    }


    // now get tweets which have already been shown recently
    const recentImpressions = await FeedImpression.find({
        user: userId,
        contentType: "tweet",
        lastShownAt: {
            $gte: recentImpressionCutoffDate
        }
    })
        // select only the fields we need
        .select("contentId lastShownAt impressionCount")
        .lean();


    // now create a map to store impression data
    const impressionMap = new Map();

    // loop through all recent impressions
    for (const impression of recentImpressions) {

        // store impression data using tweet id as key
        impressionMap.set(impression.contentId.toString(), impression);
    }


    // now fetch candidate tweets
    // NOTE: these field names must match your actual Tweet schema
    const candidateTweets = await Tweet.find({
        createdAt: {
            $gte: popularCutoffDate
        }
    })
        // newest tweets will be checked first
        .sort({ createdAt: -1 })
        // fetch enough candidates to build the feed
        .limit(TWEET_CANDIDATE_LIMIT)
        // return plain JavaScript objects
        .lean();


    // create an array to store personalized tweets
    const personalizedTweets = [];

    // loop through all candidate tweets
    for (const tweet of candidateTweets) {

        // prepare tweet text for interest matching
        const tweetText = [
            tweet.content || "",
            ...(Array.isArray(tweet.tags) ? tweet.tags : [])
        ].join(" ");

        // calculate how much this tweet matches the user's interests
        const interestScore = calculateInterestScore(
            tweetText,
            interestProfile.tweetInterests
        );

        // store score with tweet
        personalizedTweets.push({
            ...tweet,
            interestScore
        });
    }


    // now sort personalized tweets by interest score
    personalizedTweets.sort((a, b) => {

        // higher interest score should come first
        if (b.interestScore !== a.interestScore) {
            return b.interestScore - a.interestScore;
        }

        // if score is equal then newer tweets should come first
        return new Date(b.createdAt) - new Date(a.createdAt);
    });


    // now filter out recently shown tweets
    const filteredPersonalizedTweets = filterRecentlyShownTweets(
        personalizedTweets,
        impressionMap
    );


    // now remove duplicate tweets from personalized feed
    const uniquePersonalizedTweets = removeDuplicateTweets(
        filteredPersonalizedTweets
    );


    // now get popular tweets from the interest profile
    // NOTE: this assumes popularTweets contains tweet documents or objects
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
        uniquePersonalizedTweets,
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
});
```


---
k