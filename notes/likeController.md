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


---

# getLikedVideos

# getLikedVideos Controller Roadmap

## Step 1: Create Controller Function

### 1.1 Create async controller
- Create `getLikedVideos`
- Wrap with `asyncHandler`

### 1.2 Get request objects
- Access `req`
- Access `res`

---

## Step 2: Pagination Setup

### 2.1 Get page number
- Read `req.query.page`
- Default value = 1

### 2.2 Get limit
- Read `req.query.limit`
- Default value = 20
- Maximum value = 100

### 2.3 Calculate skip
- Formula:
```js
(page - 1) * limit
```

---

## Step 3: Search and Sorting Setup

### 3.1 Get search query
- Read `req.query.search`
- Default empty string

### 3.2 Get sort field
- Read `req.query.sortBy`
- Default = `createdAt`

### 3.3 Get sort order
- Read `req.query.sortType`
- Default = `desc`

### 3.4 Create sort object
- Create dynamic sorting object

Example:

```js
{
    views: -1
}
```

---

## Step 4: Create Filter Object

### 4.1 Filter current user likes
- Match current user id

### 4.2 Filter only video likes
- Check video field exists

### 4.3 Create filter object

Example:

```js
{
    likedBy: userId,
    video: {
        $exists: true
    }
}
```

---

## Step 5: Start Aggregation Pipeline

### 5.1 Call Like.aggregate()
- Start aggregation pipeline

---

## Step 6: Match Stage

### 6.1 Apply filter
- Match current user's likes
- Match only video likes

Purpose:
- Remove unnecessary documents before lookup

---

## Step 7: Sort Likes

### 7.1 Sort latest likes first

```js
{
    createdAt: -1
}
```

Purpose:
- Recently liked videos should appear first

---

## Step 8: Video Lookup

### 8.1 Join Video Collection

```text
Like
 ↓
Video
```

### 8.2 Match video id

```js
localField: "video"
foreignField: "_id"
```

Purpose:
- Fetch actual video details

---

## Step 9: Video Pipeline

### 9.1 Filter Deleted Videos

Check:

```js
isDeleted: false
```

Purpose:
- Deleted videos should not appear

---

### 9.2 Filter Published Videos

Check:

```js
isPublished: true
```

Purpose:
- Unpublished videos should not appear

---

### 9.3 Apply Search

Search on:

```js
title
```

Using:

```js
$regex
```

Purpose:
- Search liked videos

---

## Step 10: Owner Lookup

### 10.1 Join User Collection

```text
Video
 ↓
Owner(User)
```

### 10.2 Match owner id

```js
localField: "owner"
foreignField: "_id"
```

Purpose:
- Fetch channel owner details

---

## Step 11: Owner Projection

### 11.1 Keep required fields only

Fields:

- fullName
- username
- avatar

Purpose:
- Remove unnecessary user data

---

## Step 12: Convert Owner Array

### 12.1 Use $first

Before:

```js
owner: [ {...} ]
```

After:

```js
owner: { ... }
```

Purpose:
- Easier frontend access

---

## Step 13: Video Projection

### 13.1 Keep required video fields

Fields:

- title
- description
- thumbnail
- duration
- views
- owner
- createdAt

Purpose:
- Lightweight API response

---

## Step 14: Unwind Video

### 14.1 Remove video array

Before:

```js
video: [ {...} ]
```

After:

```js
video: { ... }
```

Purpose:
- Convert array into object

---

## Step 15: Apply Sorting

### 15.1 Dynamic Sorting

Examples:

```js
views
createdAt
duration
```

Purpose:
- User controlled sorting

---

## Step 16: Replace Root

### 16.1 Remove Like Wrapper

Before:

```js
{
    likeData,
    video
}
```

After:

```js
{
    videoData
}
```

Purpose:
- Return clean video objects

---

## Step 17: Pagination

### 17.1 Apply Skip

```js
$skip
```

Purpose:
- Skip previous page records

---

### 17.2 Apply Limit

```js
$limit
```

Purpose:
- Return only required records

---

## Step 18: Total Count

### 18.1 Count documents

Use:

```js
countDocuments()
```

Purpose:
- Calculate pagination info

---

## Step 19: Calculate Metadata

### 19.1 Total Pages

Formula:

```js
Math.ceil(totalLikedVideos / limit)
```

### 19.2 Has Next Page

Formula:

```js
(page * limit) < totalLikedVideos
```

---

## Step 20: Return Response

### 20.1 Return Videos

Send:

- videos

### 20.2 Return Pagination

Send:

- page
- limit
- totalLikedVideos
- totalPages
- hasNextPage

### 20.3 Success Message

```js
"Liked videos fetched successfully"
```

---

# Collection Flow

```text
User
 ↓
Like Collection
 ↓
Match Current User
 ↓
Video Lookup
 ↓
Video Filters
 ↓
Owner Lookup
 ↓
Owner Projection
 ↓
Owner Flatten
 ↓
Video Projection
 ↓
Sorting
 ↓
Pagination
 ↓
Response
```




----

``` 
const getLikedVideos = asyncHandler(async (req, res) => {

    // Pagination

    const page = Math.max(
        Number.parseInt(req.query.page) || 1,
        1
    );

    const limit = Math.min(
        Math.max(
            Number.parseInt(req.query.limit) || 20,
            1
        ),
        100
    );

    const skip = (page - 1) * limit;

    // Search

    const search = req.query.search?.trim() || "";

    // Sorting

    let sortOptions = {
        createdAt: -1
    };

    if(req.query.sortBy === "views"){
        sortOptions = {
            views: -1
        };
    }

    if(req.query.sortBy === "duration"){
        sortOptions = {
            duration: -1
        };
    }

    // Filter

    const filter = {

        likedBy: new mongoose.Types.ObjectId(
            req.user._id
        ),

        video: {
            $exists: true
        }
    };

    // Aggregate

    const likedVideos = await Like.aggregate([

        {
            $match: filter
        },

        {
            $lookup: {

                from: "videos",

                localField: "video",

                foreignField: "_id",

                as: "video",

                pipeline: [

                    {
                        $match: {

                            isDeleted: false,

                            isPublished: true,

                            ...(search && {
                                title: {
                                    $regex: search,
                                    $options: "i"
                                }
                            })
                        }
                    },

                    {
                        $lookup: {

                            from: "users",

                            localField: "owner",

                            foreignField: "_id",

                            as: "owner",

                            pipeline: [

                                {
                                    $project: {

                                        fullName: 1,

                                        username: 1,

                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },

                    {
                        $addFields: {

                            owner: {
                                $first: "$owner"
                            }
                        }
                    },

                    {
                        $project: {

                            title: 1,

                            description: 1,

                            thumbnail: 1,

                            duration: 1,

                            views: 1,

                            owner: 1,

                            createdAt: 1
                        }
                    }
                ]
            }
        },

        {
            $unwind: "$video"
        },

        {
            $replaceRoot: {
                newRoot: "$video"
            }
        },

        {
            $sort: sortOptions
        },

        {
            $skip: skip
        },

        {
            $limit: limit
        }
    ]);

    // Total Count

    const totalLikedVideos =
        await Like.countDocuments(filter);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    videos: likedVideos,

                    page,

                    limit,

                    totalLikedVideos,

                    totalPages: Math.ceil(
                        totalLikedVideos / limit
                    ),

                    hasNextPage:
                        page * limit <
                        totalLikedVideos
                },
                "Liked videos fetched successfully"
            )
        );
});
```

h