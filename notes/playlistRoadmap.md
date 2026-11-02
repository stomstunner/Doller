Playlist Model Fields
name, description, saveCount, videoCount, isPublic,
isDeleted, thumbnail, videos, owner, shareCount.
Controllers --- Implementation Order
---

# 1. createPlaylist --- sabse pehle
- Current user ko owner set karna.
- name aur description validate karna.
- Optional thumbnail upload karna.
- isPublic request ke according set karna.
- videos empty aur counts zero se initialize karna.
---

# 2. addVideoToPlaylist
- Playlist aur video IDs validate karna.
- Playlist exist karti ho, deleted na ho aur current user ki ho.
- Video exist karti ho aur deleted na ho.
- Duplicate video add na hone dena.
- videos mein ID add karke videoCount update karna.
---

# 3. removeVideoFromPlaylist
- Playlist owner verify karna.
- Video playlist mein present honi chahiye.
- videos se ID remove karna aur videoCount update karna.
---

# 4. getPlaylistById
- Playlist details fetch karna.
- Public playlist sab dekh saken.
- Private playlist sirf owner dekh sake.
- Deleted playlist return na karna.
---

# 5. getPlaylistVideos
- Playlist ke videos fetch karna.
- Video owner ki selected details lookup karna.
- Pagination lagana.
- Private playlist par owner access check karna.
---

# 6. getUserPlaylists
- userId ki public playlists fetch karna.
- Deleted playlists exclude karna.
- Pagination lagana.
---

# 7. getMyPlaylists
- Current user ki public aur private playlists fetch karna.
- Deleted playlists exclude karna.
- Pagination lagana.
---

# 8. updatePlaylist
- Sirf owner update kar sake.
- Name, description, isPublic aur thumbnail update kar sake.
---

# 9. deletePlaylist
- Sirf owner delete kar sake.
- Soft delete: isDeleted: true.
- Playlist ke andar ke videos delete nahi karne.
Existing Like Controller
- togglePlaylistLike aur getSavedPlaylists already Like controller
  mein hain.
- Inhi ko use karna; duplicate save/unsave controllers mat banana.
- Decide karna hai ki saveCount ko Like/Save operation ke saath
  maintain karna hai.
Universal Share --- Later
Abhi Playlist module mein share controller mat banana. Baad mein ek
reusable Share feature banayenge jo current item/page (video, tweet,
playlist, profile, etc.) identify karke uska link share kare.
Routes and Testing
Saare controllers ke baad routes banana. Phir Postman se valid/invalid
IDs, missing fields, owner permissions, private/deleted playlists,
duplicate video, pagination aur thumbnail upload/update test karna.
Start Here
Sabse pehle createPlaylist controller bana. Uske baad
addVideoToPlaylist, phir removeVideoFromPlaylist.