# Architecture of Search History

                    SEARCH SYSTEM
                         │
          ┌──────────────┴──────────────┐
          ↓                             ↓
   searchVideos()                searchTweets()
          │                             │
          ↓                             ↓
   videoQuery save                tweetQuery save
          │                             │
          └──────────────┬──────────────┘
                         ↓
                  SearchHistory
                         │
              ┌──────────┴──────────┐
              ↓                     ↓
 getSearchVideoHistory()   getSearchTweetHistory()
              │                     │
              ↓                     ↓
        Frontend display      Frontend display
              │                     │
              └──────────┬──────────┘
                         ↓
              deleteSearchHistory()
                         ↓
                  isDeleted: true
                         ↓
             Frontend se disappear
                         ↓
              Database me remains
                         ↓
              Future ML recommendation