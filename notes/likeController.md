# Like Controller 

## what we have to make 

- toggleVideoLike
- toggleCommentLike
- toggleTweetLike
- togglePlaylistLike

- getLikedVideos
- getLikedComments
- getLikedTweets
- getSavedPlaylists

---

# toggleVideoLike

User Clicks Like
        │
        ▼
  Video Exists?
        │
   No ─────► Error
        │
       Yes
        │
        ▼
  Like Exists?
        │
   Yes ─────► Delete Like
        │
        ▼
       No
        │
        ▼
    Create Like


Receive videoId
        │
        ▼
Validate ObjectId
        │
        ▼
Video Exists?
        │
        ▼
Find Existing Like
        │
 ┌──────┴──────┐
 │             │
 ▼             ▼
Found       Not Found
 │             │
 ▼             ▼
Delete      Create
Like        Like