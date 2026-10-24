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
    let personlizedIndex = 0;
    let popularIndex = 0;

    // final ordered feed isi array me banaegi
    const feed =[];
    // 

    // now we use the logic ki jab tak hamre kisi bhi list me video bachu hui hai batches banate rahege 
    while(personlizedIndex < personalizedVideos.length || popularIndex < popularVideos.length){
        // har batch me maximum limit ki videos aayengi
        const batches = [];

        // now we fill the videos with personlized video first then popular videos 
        // like mere pass 8 personlized videos dalne ka allowence hai toh mai har batch me utne video dlunga 
        while(batches.length < personilizedLimit && personlizedIndex< personalizedVideos.length){

            batches.push(personalizedVideos[personlizedIndex]);
            // now we increse the value of the personlizedIndex
            personlizedIndex++;
        }

        // now we fill in batches all the popularVideos
        while(batches.length < popularLimit 
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

    // ninimum 10 video return akrnege , max 50
    const limit = Math.min(
        MAX_FEED_LIMIT,
        Math.max(
            // we need default 10 limit
            Number.parseInt(req.query.limit, 10) || 10,
            1
        )
    )

    // now take the builtUserIntrestProfile and gave the user id 
    const userProfile = await builtUserIntrestProfile(userId);

    // now we take the video interests 
    // video related intrest se video relevence score calculate hoga 
    const videoInterests = userProfile.videoInterests;

    // recommendation servide ke popular video ko reuse karnge 
    const profilePopularVideos = userProfile.popularVideos || [];

    // abhi ham latest publieshed video me se candiate video laa rhahe hai
    // but we want ki hamare popular videos bass pichli 3 manine ka hi videos ho na ki all time ka popular videos 

    // now we want ki current user ki recent impression 
    const impressionRecords = await FeedImpression.find({
        user : userId,
        contentType: "video"
    })
    .select(
        "contentType lastShownAt impressionCount"
    )
    .lean()

    // now we conver the impression recorde to map so har candidate ki lookup fast ho jaye 
    const impressionMap = new map();

    for(const impression of impressionRecords){
        // set the value in the impression map with key and value pair 
        impressionMap.set(
            String(impression.contentId),
            impression
        )
    }
    
    // now we want that ki ham videos ko database se laye but we want only the aviable VIDEOS
    const candidateVideos = await Video.aggregate(
        [
            {
                $match:{
                    isDeleted: false,
                    isPublished: true
                }
            },
            {
                $sort:{
                    createdAt : -1
                }
            },
            {
                $limit: VIDEO_CANDIDATE_LIMIT
            },
            {
                $project:{
                    title: 1,
                    description: 1,
                    category: 1,
                    tags: 1,
                    thumbnail: 1,
                    createdAt: 1,
                    owner: 1,
                    viewCount: 1
                }
            }
        ]
    );

    /**
     * Result	JavaScript kya karega?
        Negative number	-> videoA ko videoB se pehle rakhega
        Positive number	-> videoB ko videoA se pehle rakhega
        0 -> Dono equal rank par hain; unka relative order preserve hota hai
     */

    // now we have the videos in the candidate videos from the databse now we have to calculate the score of each video and rank them 
    const scoredVideos = candidateVideos.map(
        (video) => {
            // ab hamare pass ek video hai abhi candiate video se 
            // ab uss 1 video per ye operation perform karnge 

            const videoText = [
                video.title,
                video.description,
                video.category,
                ...(video.title || [])
            ].filter(Boolean).join(" ");

            // video. title = video per ham kaam kar rhae hai map ke ander jo ki ek single video ko bata raha hai hamrare canditate video naam ke array  me  se 

            // now we reuse the exixting function from the recommmendation sevice 
            const interestScore = calculateInterestScore(
                videoText,
                videoInterests
            )

            // original video ke saath score ko attatch kar denge => video jo hame candiate video se aa raha hai

            return{
                ...video,
                interestScore
            }
        }
    );

    // now we rank the videos like higer score ko priority denga and ager same score hui toh ham date ke basis pe rank karnge 
    
    scoredVideos.sort((videoA , videoB) => {
        if(videoA.interestScore !== videoB.interestScore){
            return videoB.interestScore - videoA.interestScore;

            /**
         * Result	JavaScript kya karega?
            Negative number	-> videoA ko videoB se pehle rakhega
            Positive number	-> videoB ko videoA se pehle rakhega
            0 -> Dono equal rank par hain; unka relative order preserve hota hai
            */
        }

        return(
            new Date(videoB.createdAt) - new Date(videoA.createdAt)
        );
    })

    // now we want ki intrest score of the scoredVideos should be greater than 0
    const personalizedCandidates = scoredVideos.filter(
        (video)=> video.interestScore > 0
    );

    // now we want ki ham sare popular video ke jo user ke related me relevent hai unko 3 mahine ke ander ke window ma rakhna usse piche ke popular vidio ko mat lana 

    const popularCutoffDate = getPopularCutoffDate();
    // isme hamre pass popular cutoffdate ka kitna value hai woh aa jaega 

    // now we store the recentPopularCandidates 
    const recentPopularCandidates = profilePopularVideos.filter(
        (video) =>{
            // jiska date hi nahi hai createion ka unhe video me rakhn hi nahi hai i mean recentPopularCandidates me nahi store karna hai video ko 

            if(!video.createdAt) return false;

            // elegibale videos are  those who had publised agter cutoff date 

            return(
                new Date(video.createdAt) >= popularCutoffDate
                // new date isliye lagaya kyuki popularcutoff me date store hai so ham video.created at ko pahle date me convert kar diye uske baad compare kiye return karega ye ek true ya flase value ager flase hua toh woh video hamare recentPopularCandidates me video store nahi rahega ager true aa gaya toh hamare uss array me store ho  jayega 
            )
        }
    );

    // now we remove the duplicate video from the personalizedvideo and popular videos 
    const uniquePersonalizedVideos = removeDuplicateVideos(personalizedCandidates)


    const uniquePopularVideos = removeDuplicateVideos(recentPopularCandidates)

    // now we store the personlizedvideo ka id in a set for better seraching like we want to store only 1 video from personlised and popular video 
    // Bhai, iska main use aage popular videos ke saath comparison mein hoga, taaki jo video personalized list mein already hai, woh popular list se dobara add na ho.

    const personalizedIds = new Set(
        // isme ham uniquePersonalizedVideos pe map lagayenge aur har ek video ko lenge aur uske har ek video ke id ko ham string em convert karnge and then ham usse set me store karnge jo ki envetually hamare personlizedIds me store ho jayega 
        uniquePersonalizedVideos.map(
            (video) => String(video._id)
        )
    )

    // now we remove the videos that are in the personlizedlist     
    const nonDuplicatePopularVideos = uniquePopularVideos.filter(
        (video)=> !personalizedIds.has(String(video._id))
    )
    // hame apne nonDuplicatePopularVideos me sabse pahle uniquePopularVideos lena hai usme ham filter laga denge jisse hamare pass bass wohi video aayege jo true hold karta hoga ya null nahi hoga filter lagane ke baas ham har ek video ko lenge popular video ko then ham woh videos ko NAHI lenge jiska id hamare personlizedIds me id store hai ahu ha personlizedIds me ham has ka use karnege video ki id find karne ke liye but ham abhi jo video liye hai woh popular video ko video hai toh iske liye ham usse sambse pahle uske id ko string me convert karenge 


    // now we have to filter the repeated video from the popular and personlized source nahi toh woh baar baar aa jayega 

    const filteredPersonalizedVideos = filterRecentlyShownVideos(
        uniquePersonalizedVideos,
        impressionMap
        // impression map me hamre pass kon kon si video user ko show hui aur kab hui aur kitni baar show hui woh store rakhta hai 
    )

    const filteredPopularVideos = filterRecentlyShownVideos(
        uniquePopularVideos,
        impressionMap
    )

    // now we make the latest popular videos fallback list 
    // ager hamara personlized list khatam ho jaye toh ham kah se video linge apna data fill karna ke liye = video response me video kaha se dalenge =  popular video se 

    const usedVideoIds = new Set(
        [
            ...filteredPersonalizedVideos.map(
                (video) => String(video._id)
            ),

            ...filteredPopularVideos.map(
                (video)=> String(video._id)
            )
        ]
    )
    // Iska fayda: Jab hum fallback videos choose karenge, toh check kar sakte hain ki video pehle se use toh nahi hui:

    // now we store the videos from the popular list jo ki hamra na toh phale ke popuar me tha ko ki abhi page me jaa rha hai aur na hi hamre personlised list me hai 
    const fallbackCandidates = candidateVideos.filter(
        (video)=>{
            const videoId = String(video._id);

            // jo video pahle hi source me hai unhe dubar nahi lena hai 
            if(usedVideoIds.has(videoId)) return false;

            // Intuition: Agar function ke result mein video bachi 
            // (length > 0), toh true return hoga 
            // aur fallback mein aa sakti hai. Agar video filter hokar nikal gayi, toh false return hoga.

            return filterRecentlyShownVideos(
                [video],
                impressionMap
            ).length > 0;
            // ager video baar baar nahi dikhayi gai toh keep  karo 


        }
    );

    // fallbackCandidates ko set se unique rakhnge 
    const uniqueFallbackVideos = removeDuplicateVideos(fallbackCandidates);

    // now we mix the peronlized and the popular video 
    // exixsting ration ke according mix karnge videos ko 
    const mixedVideos = builtMixedFeed(
        filteredPersonalizedVideos,
        filteredPopularVideos,
        limit,
        PERSONALIZED_RATIO
    )

    // ager feed choti hai toh ham fallbace video se fill karnge 
    // current video feed me jitni id hai usse save karo 
    const finalVideoIds = new Set(
        mixedVideos.map(
            (video)=> String(video._id)
        )
    )

    // fallback videos ko tabhi add akrenge jab woh pahle se hi feed me na ho 
    for(const video of uniqueFallbackVideos){
        if(mixedVideos.length>= VIDEO_CANDIDATE_LIMIT) break;

        const videoId = String(video._id);

        if(finalVideoIds.has(videoId)) continue;
        // mtlab usko chor do aage badho 

        mixedVideos.push(video);
        finalVideoIds(videoId);
    }


    // Page 1 ka skip 0, page 2 ka skip limit, aur aage isi pattern se hoga.
    const skip = (page - 1) * limit;

    const videos = mixedVideos.slice(
        skip,
        skip + limit
    );

    // Total sirf generated candidate feed ki count hai,
    // poori database ki total video count nahi.
    const totalVideos = mixedVideos.length;

    const totalPages = Math.ceil(
        totalVideos / limit
    );

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                videos,
                page,
                limit,
                totalVideos,
                totalPages,
                hasNextPage: page < totalPages,
                asPreviousPage: page > 1
            },
            "Video feed fetched successfully"
        )
    )
})