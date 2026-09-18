Comment Controller

GET
├── getVideoComments
├── getTweetComments
├── getCommentReplies

POST
├── addVideoComment
├── addTweetComment

PATCH
├── updateComment
├── pinComment
├── unpinComment

DELETE
├── deleteComment

---

# getVideoComments

- Description: Retrieves comments for a specific video.
- Parameters:
  - videoId (string): The ID of the video for which comments are being retrieved.
  - page (number, optional): The page number for pagination. Default is 1.
  - limit (number, optional): The number of comments to retrieve per page. Default is 10.

- Video valid hai?
- Video exist karti hai?
- Sirf top-level comments lao
- Deleted comments mat lao
- Pinned comments pehle lao
- New comments pehle lao
- Pagination lagao
- Response bhejo*

--- 

# intusion

-Input kya hai?
    -Video ID

-Output kya hai?
    - Comments list

- Conditions kya hain?
  - Video exist kare
  - Deleted comments nahi
  - Top level comments hi
  - Pagination
  - Sorting

``` js

// GET /api/v1/comments/video/:videoId?page=1&limit=20

const getVideoComments = asyncHandler(async (req, res) => {

    // ---------------------------------------------------
    // STEP 1 : URL se video ki id nikalo
    // ---------------------------------------------------
    // Route:
    // /api/v1/comments/video/68d123abc
    //
    // Result:
    // videoId = "68d123abc"
    //
    // Hame comments laane ke liye pata hona chahiye
    // kis video ke comments chahiye.
    const { videoId } = req.params


    // ---------------------------------------------------
    // STEP 2 : Validate Video ID
    // ---------------------------------------------------
    // MongoDB ObjectId ka format fixed hota hai.
    //
    // Valid:
    // 68d123abc456def789xyz12
    //
    // Invalid:
    // hello
    // 123
    // abc
    //
    // Invalid id database tak nahi jani chahiye.
    validateObjectId(videoId, "video ID")


    // ---------------------------------------------------
    // STEP 3 : Pagination Setup
    // ---------------------------------------------------
    // Agar video pe 50,000 comments hain to
    // saare ek saath nahi bhej sakte.
    //
    // Isliye pagination use karte hain.
    //
    // page=1 => first 20 comments
    // page=2 => next 20 comments
    // page=3 => next 20 comments
    //
    // Agar user page na bheje to default 1.
    const page =
        Math.max(
            Number.parseInt(req.query.page) || 1,
            1
        )


    // ---------------------------------------------------
    // STEP 4 : Limit Setup
    // ---------------------------------------------------
    // Ek request me kitne comments bhejne hain.
    //
    // Default = 20
    // Minimum = 1
    // Maximum = 100
    //
    // Isse koi user limit=100000 bhejkar
    // server ko slow nahi kar sakta.
    const limit =
        Math.min(
            Math.max(
                Number.parseInt(req.query.limit) || 20,
                1
            ),
            100
        )


    // ---------------------------------------------------
    // STEP 5 : Skip Calculate Karo
    // ---------------------------------------------------
    // MongoDB ko batana padta hai:
    //
    // Kitne records ignore karne hain.
    //
    // Formula:
    // (page - 1) * limit
    //
    // Example:
    //
    // page = 1
    // skip = 0
    //
    // page = 2
    // skip = 20
    //
    // page = 3
    // skip = 40
    const skip = (page - 1) * limit

    // Video open
    //         ↓
    //   First 20 comments load
    //         ↓
    //   Scroll down
    //         ↓
    //   Next 20 comments load


    // ---------------------------------------------------
    // STEP 6 : Check Video Exists
    // ---------------------------------------------------
    // ID valid hona alag baat hai.
    //
    // Lekin ho sakta hai video database me ho hi na.
    //
    // Example:
    //
    // videoId valid hai
    // but video delete ho chuki hai.
    //
    // Isliye existence check karte hain.
    const videoExists =
        await Video.exists({
            _id: videoId
        })


    // Agar video nahi mili
    // to comments bhi nahi mil sakte.
    if (!videoExists) {
        throw new ApiError(
            404,
            "Video not found"
        )
    }


    // ---------------------------------------------------
    // STEP 7 : Filter Object Banao
    // ---------------------------------------------------
    // Hame sirf:
    //
    // 1. Isi video ke comments
    // 2. Top-level comments
    // 3. Non-deleted comments
    //
    // chahiye.
    //
    // parentComment: null
    //
    // matlab:
    // reply nahi
    // original comment
    const filter = {

        // isi video ke comments
        video: videoId,

        // replies nahi chahiye
        parentComment: null,

        // deleted comments nahi chahiye
        isDeleted: false,
    }


    // ---------------------------------------------------
    // STEP 8 : Comments aur Count Ek Sath Lao
    // ---------------------------------------------------
    // Hame 2 cheeze chahiye:
    //
    // 1. Comments
    // 2. Total Count
    //
    // Dono independent hain.
    //
    // Isliye Promise.all use karte hain.
    //
    // Performance better hoti hai.
    const [comments, totalComments] =
        await Promise.all([


            // ==========================================
            // QUERY 1 : COMMENTS FETCH KARO
            // ==========================================
            Comment.find(filter)


                // --------------------------------------
                // Owner Populate
                // --------------------------------------
                // Normally:
                //
                // owner: "68abc123"
                //
                // Populate ke baad:
                //
                // owner: {
                //   username,
                //   fullName,
                //   avatar
                // }
                .populate(
                    "owner",
                    commentOwnerFields
                )


                // --------------------------------------
                // Sorting
                // --------------------------------------
                //
                // isPinned: -1
                //
                // pinned comments sabse upar
                //
                // createdAt: -1
                //
                // newest comments pehle
                //
                // Example:
                //
                // 📌 Great Video
                // Nice Tutorial
                // Awesome
                //
                .sort({
                    isPinned: -1,
                    createdAt: -1
                })


                // --------------------------------------
                // Pagination
                // --------------------------------------
                //
                // Skip old records
                .skip(skip)

                // Limit records
                .limit(limit)


                // --------------------------------------
                // Lean
                // --------------------------------------
                //
                // Mongoose document nahi
                // normal JavaScript object return karo.
                //
                // Faster response.
                .lean(),



            // ==========================================
            // QUERY 2 : TOTAL COMMENTS COUNT
            // ==========================================
            //
            // Frontend ko pata hona chahiye:
            //
            // Total comments kitne hain?
            //
            // Example:
            // 143 comments
            //
            Comment.countDocuments(filter)

        ])


    // ---------------------------------------------------
    // STEP 9 : Response Return Karo
    // ---------------------------------------------------
    // Frontend ko:
    //
    // comments
    // page
    // limit
    // total comments
    // total pages
    // next page hai ya nahi
    //
    // sab bhej do.
    return res.status(200).json(

        new ApiResponse(

            200,

            {

                // current page ke comments
                comments,

                // current page
                page,

                // current limit
                limit,

                // total comments
                totalComments,

                // total pages
                totalPages:
                    Math.ceil(
                        totalComments / limit
                    ),
                    
// totalComments = 45
// limit = 20
// 45 / 20
// 2.25
// Math.ceil(2.25)
// 3
// Total 3 pages hain.

                // next page hai?
                hasNextPage:
                    page * limit < totalComments,
            },

// page = 1
// limit = 20
// totalComments = 45
// 1 * 20 < 45
// true
// Next page available hai.

            "Comments fetched successfully"
        )
    )
})

```