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




## addVideoComment

- videoId mila?
- valid hai?
- video exist karti hai?
- content aaya?
- empty to nahi?
- comment create karo
- response bhejo


# updateComment

```jsx
// PATCH /api/v1/comments/:commentId
// Body: { "content": "Updated Comment" }

const updateComment = asyncHandler(async (req, res) => {

    // 1. Comment ID nikalo
    const { commentId } = req.params

    // 2. Updated content nikalo
    const { content } = req.body

    // 3. Comment ID validate karo
    validateObjectId(commentId, "Comment ID")

    // 4. Content validate karo
    if (!content?.trim()) {

        throw new ApiError(
            400,
            "Updated comment content is required"
        )
    }

    // 5. Comment dhundo
    const comment = await Comment.findOne({

        _id: commentId,

        // Sirf owner hi edit kar sakta hai
        owner: req.user._id,

        // Deleted comment edit nahi hoga
        isDeleted: false
    })

    // 6. Comment mila?
    if (!comment) {

        throw new ApiError(
            404,
            "Comment not found or you are not allowed to edit it"
        )
    }

    // 7. Content update karo
    comment.content = content.trim()

    // 8. Edited flag lagao
    comment.isEdited = true

    // 9. Edited time save karo
    comment.editedAt = new Date()

    // 10. Database me save karo
    await comment.save()

    // 11. Updated comment owner details ke saath fetch karo
    const updatedComment = await Comment.findById(
        comment._id
    )
        .populate(
            "owner",
            commentOwnerFields
        )
        .lean()

    // 12. Response bhejo
    return res
        .status(200)
        .json(

            new ApiResponse(

                200,

                updatedComment,

                "Comment updated successfully"
            )
        )
})
```




# pinComment

- Kaunsa comment pin karna hai?
- Comment ID valid hai?
- Comment exist karta hai?
- Comment video ka hai ya tweet ka?
- Us video/tweet ka owner kaun hai?
- Request bhejne wala user owner hai?
- Comment already pinned to nahi?
- isPinned = true
- Save
- Response

---
commentId
    ↓
 Validate
    ↓
 Find Comment
    ↓
   Video ?
 ↓         ↓
Yes       No
 ↓         ↓
Video     Tweet
Owner     Owner
 ↓         ↓
Permission Check
       ↓
isPinned = true
       ↓
    save()
       ↓
    response

---
``` jsx


// PATCH /api/v1/comments/:commentId/pin

const pinComment = asyncHandler(async (req, res) => {
    
    // 1. Comment ID nikalo
    const { commentId } = req.params

    // 2. Validate Comment ID
    validateObjectId(commentId, "Comment ID")

    // 3. Comment find karo
    const comment = await Comment.findById(commentId)

    if (!comment) {

        throw new ApiError(
            404,
            "Comment not found"
        )
    }

    // Deleted comment pin nahi ho sakta
    if (comment.isDeleted) {

        throw new ApiError(
            400,
            "Deleted comment cannot be pinned"
        )
    }

    // Already pinned?
    if (comment.isPinned) {

        throw new ApiError(
            400,
            "Comment is already pinned"
        )
    }

    // ------------------------
    // Video Comment
    // ------------------------

    if (comment.video) {
        // kya comment kisi video se linked hai?

        const video = await Video.findById(
            comment.video
            // toh hamne do tum comment ke video ka vlaue jo ki ek id hai 
            // Video.findById("video456")
        ).select("owner")

//         {
//     _id: "comment123",

//     content: "Nice Video",

//     owner: "rahulId",

//     video: "video456",
// kya comment kisi video se linked hai 

//     tweet: null
// }

        if (!video) {

            throw new ApiError(
                404,
                "Video not found"
            )
        }

        if (
            video.owner.toString() !==
            req.user._id.toString()
        ) {

            throw new ApiError(
                403,
                "Only video owner can pin comments"
            )
        }
    }

    // ------------------------
    // Tweet Comment
    // ------------------------

    else if (comment.tweet) {

        const tweet = await Tweet.findById(
            comment.tweet
        ).select("owner")

        if (!tweet) {
            
            throw new ApiError(
                404,
                "Tweet not found"
            )
        }

        if (
            tweet.owner.toString() !==
            req.user._id.toString()
        ) {

            throw new ApiError(
                403,
                "Only tweet owner can pin comments"
            )
        }
    }

    // 4. Pin Comment
    comment.isPinned = true

    await comment.save()

    // 5. Updated Comment lao
    const pinnedComment =
        await Comment.findById(comment._id)
            .populate(
                "owner",
                commentOwnerFields
            )
            .lean()

    // 6. Response
    return res
        .status(200)
        .json(

            new ApiResponse(

                200,

                pinnedComment,

                "Comment pinned successfully"
            )
        )
})  

```

---

# deleteComment

- Validate karo
- Comment ID lo
- Comment find karo
- Comment exist karta hai?
- Kya ye comment isi user ka hai?
- Already deleted to nahi?
- isDeleted = true
- content = "Comment deleted"
- Agar reply tha to parent ka replyCount kam karo
- Save
- Response

- Comment ID lo
- Validate karo
- Comment find karo
- Owner check karo

- Kya ye top level comment hai?

       YES
        ↓
Poora thread delete karo

         NO
        ↓
    Soft delete current reply
        ↓
     Iske niche ke saare replies delete karo