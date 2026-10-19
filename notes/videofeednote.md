# code 

```jsx
// ============================================================
// STEP 1: IMPORTS
// ============================================================

// Video model se database ki videos fetch karenge.
import Video from "../models/video.model.js";

// Existing recommendation service reuse karenge.
// Naya recommendation system banane ki zaroorat nahi.
import {
  builtUserIntrestProfile,
  calculateInterestScore
} from "./recommendation.service.js";

// Tere project ke existing helpers.
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";


// ============================================================
// STEP 2: FEED SETTINGS
// ============================================================

// Feed ka kitna part personalized hona chahiye.
// 0.8 = 80% personalized, baaki popular.
// Baad mein ise config file se bhi laa sakte hain.
const PERSONALIZED_RATIO = 0.8;

// Ek request mein maximum kitni videos return karni hain.
// Isse ek request mein bahut zyada videos load nahi hongi.
const MAX_FEED_LIMIT = 50;

// Interest scoring ke liye latest kitni candidate videos
// database se laani hain. Ye final feed size nahi hai.
const VIDEO_CANDIDATE_LIMIT = 500;


// ============================================================
// STEP 3: DUPLICATES REMOVE KARNE KA HELPER
// ============================================================

function removeDuplicateVideos(videos) {
  // Set mein un videos ki IDs rakhenge jo pehle mil chuki hain.
  const seenIds = new Set();

  return videos.filter((video) => {
    // MongoDB ObjectId ko string mein convert kar rahe hain,
    // taaki ID comparison consistent rahe.
    const id = String(video._id);

    // Agar ID pehle aa chuki hai, toh video reject karo.
    if (seenIds.has(id)) {
      return false;
    }

    // Pehli baar ID mili hai, isliye use yaad rakho.
    seenIds.add(id);

    // Video unique hai, isliye use list mein rakho.
    return true;
  });
}


// ============================================================
// STEP 4: PERSONALIZED + POPULAR VIDEOS MIX KARNA
// ============================================================

function buildMixedFeed(
  personalizedVideos,
  popularVideos,
  limit,
  personalizedRatio = PERSONALIZED_RATIO
) {
  // Example: limit 10 aur ratio 0.8
  // Personalized target = 8, popular target = 2.
  const personalizedLimit = Math.round(
    limit * personalizedRatio
  );

  const popularLimit = limit - personalizedLimit;

  // Final ordered list isi array mein banegi.
  const feed = [];

  // Dono lists mein current position track karenge.
  let personalizedIndex = 0;
  let popularIndex = 0;

  // Jab tak kisi bhi list mein videos bachi hain,
  // naye batches banate rahenge.
  while (
    personalizedIndex < personalizedVideos.length ||
    popularIndex < popularVideos.length
  ) {
    // Har batch mein maximum `limit` videos hongi.
    const batch = [];

    // --------------------------------------------------------
    // STEP 4A: Personalized videos ko pehle priority do
    // --------------------------------------------------------

    // Target quota tak videos lo, ya list khatam hone tak.
    while (
      batch.length < personalizedLimit &&
      personalizedIndex < personalizedVideos.length
    ) {
      batch.push(personalizedVideos[personalizedIndex]);
      personalizedIndex++;
    }

    // --------------------------------------------------------
    // STEP 4B: Popular videos ka quota fill karo
    // --------------------------------------------------------

    // Personalized videos ke baad popular videos add karo.
    while (
      batch.length < limit &&
      batch.length < personalizedLimit + popularLimit &&
      popularIndex < popularVideos.length
    ) {
      batch.push(popularVideos[popularIndex]);
      popularIndex++;
    }

    // --------------------------------------------------------
    // STEP 4C: Agar batch abhi bhi chhota hai, toh fallback
    // --------------------------------------------------------

    // Example: 10 videos chahiye thi, lekin personalized
    // sirf 3 aur initial popular sirf 2 mili.
    // Ab available list se baaki jagah fill karenge.

    while (batch.length < limit) {
      // Personalized videos abhi bhi available hain toh
      // unhe use karo, warna popular list se lo.
      if (personalizedIndex < personalizedVideos.length) {
        batch.push(personalizedVideos[personalizedIndex]);
        personalizedIndex++;
      } else if (popularIndex < popularVideos.length) {
        batch.push(popularVideos[popularIndex]);
        popularIndex++;
      } else {
        // Dono lists khatam: aur videos available nahi hain.
        break;
      }
    }

    // Safety: agar batch mein kuch bhi add nahi hua,
    // toh infinite loop se bachne ke liye stop karo.
    if (batch.length === 0) {
      break;
    }

    // Batch ko final feed mein append karo.
    feed.push(...batch);
  }

  return feed;
}


// ============================================================
// STEP 5: VIDEO HOME FEED
// ============================================================

export const getVideoHomeFeed = asyncHandler(
  async (req, res) => {

    // --------------------------------------------------------
    // STEP 5A: User aur pagination values
    // --------------------------------------------------------

    // Ye endpoint authenticated user ke liye hai.
    const userId = req.user._id;

    // Page missing ya invalid ho toh page 1 use karo.
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    // Default 10 videos; minimum 1 aur maximum 50.
    const limit = Math.min(
      MAX_FEED_LIMIT,
      Math.max(
        1,
        Number.parseInt(req.query.limit, 10) || 10
      )
    );

    // --------------------------------------------------------
    // STEP 5B: User ka interest profile lao
    // --------------------------------------------------------

    // Existing function watch history, likes, searches,
    // comments etc. se interests calculate karti hai.
    const userProfile = await builtUserIntrestProfile(userId);

    // Map mein keyword -> interest weight hota hai.
    const videoInterests = userProfile.videoInterests;

    // Popularity candidates existing function se mil rahe hain.
    const popularCandidates = userProfile.popularVideos || [];

    // --------------------------------------------------------
    // STEP 5C: Database se video candidates lao
    // --------------------------------------------------------

    // Abhi latest published videos mein se candidates la rahe hain.
    // Ye limit final feed size nahi hai.
    const candidateVideos = await Video.aggregate([
      {
        $match: {
          isDeleted: false,
          isPublished: true
        }
      },
      {
        $sort: {
          createdAt: -1
        }
      },
      {
        $limit: VIDEO_CANDIDATE_LIMIT
      },
      {
        $project: {
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
    ]);

    // --------------------------------------------------------
    // STEP 5D: Har candidate ka interest score calculate karo
    // --------------------------------------------------------

    const scoredVideos = candidateVideos.map((video) => {

      // Title, description, category aur tags ko combine karo.
      // Missing fields ko filter(Boolean) hata dega.
      const videoText = [
        video.title,
        video.description,
        video.category,
        ...(Array.isArray(video.tags) ? video.tags : [])
      ]
        .filter(Boolean)
        .join(" ");

      // Existing helper user profile ke keyword weights
      // ke basis par score calculate karta hai.
      const interestScore = calculateInterestScore(
        videoText,
        videoInterests
      );

      // Original video fields ke saath score return karo.
      return {
        ...video,
        interestScore
      };
    });

    // --------------------------------------------------------
    // STEP 5E: Personalized list ko score ke hisaab se sort karo
    // --------------------------------------------------------

    // Highest interest score wali videos pehle aayengi.
    scoredVideos.sort(
      (a, b) => b.interestScore - a.interestScore
    );

    // Sirf matching videos personalized list mein rakho.
    // Score zero hone par video ko popular list se phir bhi
    // milne ka chance ho sakta hai.
    const personalizedVideos = scoredVideos.filter(
      (video) => video.interestScore > 0
    );

    // --------------------------------------------------------
    // STEP 5F: Popular list ko deduplicate karo
    // --------------------------------------------------------

    // Popular candidates ko bhi ek unique list bana rahe hain.
    const uniquePopularVideos = removeDuplicateVideos(
      popularCandidates
    );

    // --------------------------------------------------------
    // STEP 5G: Personalized aur popular lists ka overlap hatao
    // --------------------------------------------------------

    // Personalized videos ko priority dete hue pehle unki IDs
    // collect karo, phir popular list se overlapping IDs hatao.
    const personalizedIds = new Set(
      personalizedVideos.map((video) => String(video._id))
    );

    const nonDuplicatePopularVideos = uniquePopularVideos.filter(
      (video) => !personalizedIds.has(String(video._id))
    );

    // --------------------------------------------------------
    // STEP 5H: Dono lists ko ek mixed feed mein combine karo
    // --------------------------------------------------------

    const mixedVideos = buildMixedFeed(
      personalizedVideos,
      nonDuplicatePopularVideos,
      limit,
      PERSONALIZED_RATIO
    );

    // --------------------------------------------------------
    // STEP 5I: Combined feed par pagination lagao
    // --------------------------------------------------------

    // Page 1: index 0 se.
    // Page 2: index limit se.
    // Page 3: index limit * 2 se.
    const skip = (page - 1) * limit;

    const videos = mixedVideos.slice(
      skip,
      skip + limit
    );

    // Total pages combined feed ki length se calculate honge.
    const totalVideos = mixedVideos.length;

    const totalPages = Math.ceil(totalVideos / limit);

    // --------------------------------------------------------
    // STEP 5J: Response bhejo
    // --------------------------------------------------------

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          videos,
          pagination: {
            page,
            limit,
            totalVideos,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
          }
        },
        "Video feed fetched successfully"
      )
    );
  }
);
```

# code

// ============================================================
// STEP 1: IMPORTS
// ============================================================

import Video from "../models/video.model.js";
import WatchHistory from "../models/watchHistory.model.js";
import FeedImpression from "../models/FeedImpression.model.js";

import {
  builtUserIntrestProfile,
  calculateInterestScore
} from "./recommendation.service.js";


// ============================================================
// STEP 2: FEED SETTINGS
// ============================================================

// Ek request mein maximum kitni videos return karni hain.
const MAX_FEED_LIMIT = 50;

// Ranking ke liye maximum kitni recent candidate videos laani hain.
const VIDEO_CANDIDATE_LIMIT = 500;

// Recent impression ko kitne din tak repeat exposure maana jayega.
const IMPRESSION_WINDOW_DAYS = 7;

// Is window mein baar-baar dikhayi gayi, lekin watch na hui
// video ko temporarily suppress karenge.
const MAX_UNWATCHED_IMPRESSIONS = 3;

// Popular videos ki existing list ko use karenge.
// Popular candidates recommendation service se hi aayenge.


// ============================================================
// STEP 3: HELPER — UNIQUE VIDEOS
// ============================================================

function removeDuplicateVideos(videos) {
  const seenIds = new Set();

  return videos.filter((video) => {
    const videoId = String(video._id);

    // Agar video pehle aa chuki hai toh duplicate hata do.
    if (seenIds.has(videoId)) {
      return false;
    }

    seenIds.add(videoId);
    return true;
  });
}


// ============================================================
// STEP 4: HELPER — VIDEO TEXT
// ============================================================

function getVideoText(video) {
  // Title, description, category aur tags ko combine karenge.
  // Isi text par existing interest-scoring helper kaam karega.
  return [
    video.title,
    video.description,
    video.category,
    ...(Array.isArray(video.tags) ? video.tags : [])
  ]
    .filter(Boolean)
    .join(" ");
}


// ============================================================
// STEP 5: HELPER — FRESHNESS SCORE
// ============================================================

function calculateFreshnessScore(createdAt) {
  const createdTime = new Date(createdAt).getTime();

  // Invalid date ko score mein use nahi karenge.
  if (!Number.isFinite(createdTime)) {
    return 0;
  }

  const ageInDays = Math.max(
    0,
    (Date.now() - createdTime) / (1000 * 60 * 60 * 24)
  );

  // Nayi video ko zyada bonus, purani ko kam bonus.
  // Ye popularity ya interest score ka replacement nahi hai.
  return Math.max(0, 10 - ageInDays / 3);
}


// ============================================================
// STEP 6: MAIN FEED GENERATION
// ============================================================

export const generateVideoHomeFeed = async (userId, page, limit) => {

  // ----------------------------------------------------------
  // STEP 6A: User ki interest profile lao
  // ----------------------------------------------------------

  // Existing recommendation service reuse ho rahi hai.
  // Ye user ke past signals se interest profile banati hai.
  const userProfile = await builtUserIntrestProfile(userId);

  const videoInterests = userProfile.videoInterests;

  // Popular videos dobara calculate nahi karenge.
  const popularCandidates = userProfile.popularVideos || [];


  // ----------------------------------------------------------
  // STEP 6B: Watched video IDs lao
  // ----------------------------------------------------------

  // WatchHistory se watched videos ki IDs collect karenge.
  // Neeche "user" aur "video" fields assumed hain:
  // apne actual WatchHistory schema se match kar lena.
  const watchedVideos = await WatchHistory.aggregate([
    {
      $match: {
        user: userId
      }
    },
    {
      $group: {
        _id: "$video"
      }
    }
  ]);

  const watchedIds = new Set(
    watchedVideos.map((item) => String(item._id))
  );


  // ----------------------------------------------------------
  // STEP 6C: Recent impressions lao
  // ----------------------------------------------------------

  // Sirf recent period ki impressions consider karenge.
  // Purani impressions hamesha ke liye video ko block nahi karengi.
  const impressionCutoff = new Date();

  impressionCutoff.setDate(
    impressionCutoff.getDate() - IMPRESSION_WINDOW_DAYS
  );

  const recentImpressions = await FeedImpression.find({
    user: userId,
    lastShownAt: { $gte: impressionCutoff }
  })
    .select("video impressionCount lastShownAt")
    .lean();

  // Har video ka recent impression count yaad rakhenge.
  const impressionCounts = new Map();

  for (const impression of recentImpressions) {
    impressionCounts.set(
      String(impression.video),
      impression.impressionCount
    );
  }


  // ----------------------------------------------------------
  // STEP 6D: Eligible video candidates lao
  // ----------------------------------------------------------

  const candidateVideos = await Video.aggregate([
    {
      // Sirf published aur active videos.
      $match: {
        isDeleted: false,
        isPublished: true
      }
    },
    {
      // Recent uploads ko candidates mein chance denge.
      $sort: {
        createdAt: -1
      }
    },
    {
      // Database se unlimited videos load nahi karenge.
      $limit: VIDEO_CANDIDATE_LIMIT
    },
    {
      // Sirf feed ke liye required fields return karenge.
      $project: {
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
  ]);


  // ----------------------------------------------------------
  // STEP 6E: Watched aur repeatedly shown videos filter karo
  // ----------------------------------------------------------

  const eligibleVideos = candidateVideos.filter((video) => {
    const videoId = String(video._id);

    // Watched video ko initial feed se hata do.
    if (watchedIds.has(videoId)) {
      return false;
    }

    const count = impressionCounts.get(videoId) || 0;

    // Baar-baar dikhayi gayi video ko temporarily suppress karo.
    // Baad mein fallback ke through is restriction ko relax karenge.
    if (count >= MAX_UNWATCHED_IMPRESSIONS) {
      return false;
    }

    return true;
  });


  // ----------------------------------------------------------
  // STEP 6F: Personal interest + freshness score
  // ----------------------------------------------------------

  const scoredVideos = eligibleVideos.map((video) => {
    const videoText = getVideoText(video);

    // Existing helper user ke interest ke saath match check karega.
    const interestScore = calculateInterestScore(
      videoText,
      videoInterests
    );

    // Freshness bonus add karenge.
    const freshnessScore = calculateFreshnessScore(
      video.createdAt
    );

    // Repeat exposure ke saath ranking dheere-dheere kam hogi.
    const impressionCount =
      impressionCounts.get(String(video._id)) || 0;

    const repeatPenalty = impressionCount * 3;

    // Final score: interest sabse important hai.
    const finalScore =
      interestScore +
      freshnessScore -
      repeatPenalty;

    return {
      ...video,
      interestScore,
      freshnessScore,
      finalScore
    };
  });


  // ----------------------------------------------------------
  // STEP 6G: Personalized ranking
  // ----------------------------------------------------------

  // Highest final score wali video pehle aayegi.
  scoredVideos.sort(
    (a, b) => b.finalScore - a.finalScore
  );

  // Jinka interest match hai unhe personalized pool mein rakho.
  const personalizedVideos = scoredVideos.filter(
    (video) => video.interestScore > 0
  );


  // ----------------------------------------------------------
  // STEP 6H: Popular candidates filter karo
  // ----------------------------------------------------------

  const filteredPopularVideos = popularCandidates.filter((video) => {
    const videoId = String(video._id);

    // Watched videos dobara popular list se nahi aani chahiye.
    if (watchedIds.has(videoId)) {
      return false;
    }

    // Recent repeat exposure ko popular list se bhi hatao.
    const count = impressionCounts.get(videoId) || 0;

    if (count >= MAX_UNWATCHED_IMPRESSIONS) {
      return false;
    }

    return true;
  });


  // ----------------------------------------------------------
  // STEP 6I: Popular aur personalized lists ka duplicate hatao
  // ----------------------------------------------------------

  const uniquePopularVideos = removeDuplicateVideos(
    filteredPopularVideos
  );

  const personalizedIds = new Set(
    personalizedVideos.map((video) => String(video._id))
  );

  const nonDuplicatePopularVideos = uniquePopularVideos.filter(
    (video) => !personalizedIds.has(String(video._id))
  );


  // ----------------------------------------------------------
  // STEP 6J: Dono pools ko mix karo
  // ----------------------------------------------------------

  const feed = [];

  let personalizedIndex = 0;
  let popularIndex = 0;

  // Har 10 videos mein lagbhag 8 personalized aur 2 popular.
  // Agar kisi pool mein videos khatam ho jaayen, doosre se fill karo.
  while (feed.length < VIDEO_CANDIDATE_LIMIT) {
    let addedVideo = false;

    for (let position = 0; position < 10; position++) {
      const shouldUsePersonalized = position < 8;

      if (
        shouldUsePersonalized &&
        personalizedIndex < personalizedVideos.length
      ) {
        feed.push(personalizedVideos[personalizedIndex]);
        personalizedIndex++;
        addedVideo = true;
      } else if (
        popularIndex < nonDuplicatePopularVideos.length
      ) {
        feed.push(nonDuplicatePopularVideos[popularIndex]);
        popularIndex++;
        addedVideo = true;
      } else if (
        personalizedIndex < personalizedVideos.length
      ) {
        feed.push(personalizedVideos[personalizedIndex]);
        personalizedIndex++;
        addedVideo = true;
      }

      if (feed.length >= VIDEO_CANDIDATE_LIMIT) {
        break;
      }
    }

    // Dono lists khatam ho gayi toh loop stop karo.
    if (!addedVideo) {
      break;
    }
  }


  // ----------------------------------------------------------
  // STEP 6K: Fallback — agar filtered feed bahut chhoti hai
  // ----------------------------------------------------------

  // Agar watched/impression filtering ke baad candidates kam hain,
  // toh pehle recent impression restriction relax karenge.
  // Watched videos abhi bhi excluded rahengi.
  if (feed.length < limit) {
    const currentIds = new Set(
      feed.map((video) => String(video._id))
    );

    const fallbackVideos = candidateVideos
      .filter((video) => {
        const id = String(video._id);

        // Watched aur already-selected videos ko repeat nahi karna.
        return !watchedIds.has(id) && !currentIds.has(id);
      })
      .map((video) => {
        const interestScore = calculateInterestScore(
          getVideoText(video),
          videoInterests
        );

        return {
          ...video,
          interestScore,
          freshnessScore: calculateFreshnessScore(video.createdAt),
          finalScore:
            interestScore +
            calculateFreshnessScore(video.createdAt)
        };
      })
      .sort((a, b) => b.finalScore - a.finalScore);

    feed.push(...fallbackVideos);
  }


  // ----------------------------------------------------------
  // STEP 6L: Controlled variation
  // ----------------------------------------------------------

  // Same score wali ya close-score videos ka order har refresh
  // par thoda different ho sake, isliye top candidates ke andar
  // limited randomization karenge — poori feed shuffle nahi.
  //
  // Important: production mein stable pagination ke liye cursor ya
  // feed-session ID use karna better rahega.
  const topGroupSize = Math.min(feed.length, limit * 3);
  const topGroup = feed.slice(0, topGroupSize);

  for (let i = topGroup.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [topGroup[i], topGroup[j]] = [
      topGroup[j],
      topGroup[i]
    ];
  }

  const variedFeed = [
    ...topGroup,
    ...feed.slice(topGroupSize)
  ];


  // ----------------------------------------------------------
  // STEP 6M: Pagination sabse end mein
  // ----------------------------------------------------------

  // Page 1 => start 0
  // Page 2 => start limit
  // Page 3 => start limit * 2
  const startIndex = (page - 1) * limit;

  const videos = variedFeed.slice(
    startIndex,
    startIndex + limit
  );

  return {
    videos,
    pagination: {
      page,
      limit,
      totalVideos: variedFeed.length,
      totalPages: Math.ceil(variedFeed.length / limit),
      hasNextPage: page * limit < variedFeed.length,
      hasPreviousPage: page > 1
    }
  };
};


// ============================================================
// STEP 7: IMPRESSION RECORD KARNA
// ============================================================

export const recordVideoImpression = async (userId, videoId) => {
  // Video active aur published hai ya nahi, pehle verify karo.
  const videoExists = await Video.exists({
    _id: videoId,
    isDeleted: false,
    isPublished: true
  });

  if (!videoExists) {
    return null;
  }

  // User-video pair ka impression document update karo.
  // Pehli baar ho toh document create ho jayega.
  return FeedImpression.findOneAndUpdate(
    {
      user: userId,
      video: videoId
    },
    {
      $set: {
        lastShownAt: new Date()
      },
      $inc: {
        impressionCount: 1
      },
      $setOnInsert: {
        user: userId,
        video: videoId
      }
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
};

