PHASE 1 : CORE CRUD
-------------------

1. createTweet
2. updateTweet
3. deleteTweet

4. getTweetById
5. getUserTweets


PHASE 2 : ENGAGEMENT
--------------------

6. toggleTweetLike
7. toggleTweetSave
8. toggleTweetRepost

9. incrementTweetView


PHASE 3 : USER ACTIVITY
-----------------------

10. getLikedTweets
11. getSavedTweets
12. getRepostedTweets

13. getMentionedTweets

14. getTweetReplies


PHASE 4 : FEED SYSTEM
---------------------

15. getCommunityFeed

16. getTrendingTweets


PHASE 5 : PROFILE FEATURES
--------------------------

17. pinTweet

18. unpinTweet


=================================
DEPENDENCIES TO BUILD IN BETWEEN
=================================

Tweet Model
    ↓

Tweet Controller
    ├── createTweet
    ├── updateTweet
    ├── deleteTweet
    ├── getTweetById
    └── getUserTweets

    ↓

SaveTweet Model
    ↓

toggleTweetSave
getSavedTweets

    ↓

Repost Model
    ↓

toggleTweetRepost
getRepostedTweets

    ↓

Comment Integration
    ↓

getTweetReplies

    ↓

Mention System
    ↓

getMentionedTweets

    ↓

Feed System
    ├── getCommunityFeed
    └── getTrendingTweets

    ↓

Profile Features
    ├── pinTweet
    └── unpinTweet