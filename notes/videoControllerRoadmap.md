video.controller.js

1. createVideo
2. getVideoById
3. getUserVideos
4. getVideoFeed
5. updateVideo
6. deleteVideo
7. incrementVideoView
8. toggleVideoRepost
9. getVideoReposts
---

# createVideo

              USER
                ↓
        create video request
                ↓
        ┌─────────────────┐
        │ Validate input  │
        └────────┬────────┘
                 ↓
          Video file hai?
                 ↓
          Cloudinary upload
                 ↓
       ┌─────────┴──────────┐
       │                    │
Thumbnail diya?       Thumbnail nahi diya?
       │                    │
      YES                   NO
       │                    │
Upload thumbnail      Video se frame
to Cloudinary         extract karo
       │                    │
       │              Thumbnail banao
       │                    │
       └─────────┬──────────┘
                 ↓
        Video information
          MongoDB me save
                 ↓
             Response

