```jsx
const getCommunityFeed = asyncHandler(async(req, res) => {

    // pagination

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

    // search

    const search =
        req.query.search?.trim() || "";

    // aggregation pipeline

    const tweets = await Tweet.aggregate(

        [

            // only active tweets

            {

                $match: {

                    isDeleted: false

                }

            },

            // owner details

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

            // mentions details

            {

                $lookup: {

                    from: "users",

                    localField: "mentions",

                    foreignField: "_id",

                    as: "mentions",

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

            // convert owner array to object

            {

                $addFields: {

                    owner: {

                        $first: "$owner"

                    }

                }

            },

            // search by content, username or fullname

            ...(search ? [

                {

                    $match: {

                        $or: [

                            {

                                content: {

                                    $regex: search,

                                    $options: "i"

                                }

                            },

                            {

                                "owner.username": {

                                    $regex: search,

                                    $options: "i"

                                }

                            },

                            {

                                "owner.fullName": {

                                    $regex: search,

                                    $options: "i"

                                }

                            }

                        ]

                    }

                }

            ] : []),

            // check if current user liked tweet

            {

                $lookup: {

                    from: "likes",

                    let: {

                        tweetId: "$_id"

                    },

                    pipeline: [

                        {

                            $match: {

                                $expr: {

                                    $and: [

                                        {

                                            $eq: [

                                                "$tweet",

                                                "$$tweetId"

                                            ]

                                        },

                                        {

                                            $eq: [

                                                "$likedBy",

                                                req.user._id

                                            ]

                                        }

                                    ]

                                }

                            }

                        }

                    ],

                    as: "likedTweet"

                }

            },

            // engagement score + liked status

            {

                $addFields: {

                    engagementScore: {

                        $add: [

                            "$likeCount",

                            {

                                $multiply: [

                                    "$replyCount",

                                    3

                                ]

                            },

                            {

                                $multiply: [

                                    "$repostCount",

                                    5

                                ]

                            },

                            {

                                $multiply: [

                                    "$saveCount",

                                    8

                                ]

                            }

                        ]

                    },

                    isLiked: {

                        $gt: [

                            {

                                $size: "$likedTweet"

                            },

                            0

                        ]

                    }

                }

            },

            // select fields

            {

                $project: {

                    content: 1,

                    owner: 1,

                    mentions: 1,

                    images: 1,

                    isEdited: 1,

                    editedAt: 1,

                    createdAt: 1,

                    updatedAt: 1,

                    likeCount: 1,

                    replyCount: 1,

                    repostCount: 1,

                    saveCount: 1,

                    engagementScore: 1,

                    isLiked: 1

                }

            },

            // sorting

            {

                $sort: {

                    engagementScore: -1,

                    createdAt: -1

                }

            },

            {

                $skip: skip

            },

            {

                $limit: limit

            }

        ]

    );

    // count for pagination

    const totalTweets = await Tweet.countDocuments(

        {

            isDeleted: false

        }

    );

    return res

    .status(200)

    .json(

        new ApiResponse(

            200,

            {

                tweets,

                page,

                limit,

                totalTweets,

                totalPages: Math.ceil(
                    totalTweets / limit
                ),

                hasNextPage:
                    (page * limit)
                    < totalTweets

            },

            "Community feed fetched successfully"

        )

    );

});

````
----

// --------------------------------------------------
// CHECK KARNA HAI KI CURRENT USER NE TWEET KO LIKE
// KIYA HAI YA NAHI
// --------------------------------------------------

{
    $lookup: {

        // MongoDB ki Like collection me jana hai
        from: "likes",

        // --------------------------------------------------
        // Yaha hum current tweet ki _id ko ek temporary
        // variable me store kar rahe hain.
        //
        // Maan lo current tweet hai:
        //
        // {
        //     _id: "tweet101"
        // }
        //
        // Toh:
        //
        // tweetId = "tweet101"
        //
        // ho jayega.
        // --------------------------------------------------

        let: {

            tweetId: "$_id"

        },

        // --------------------------------------------------
        // Ab Like collection ke andar search karenge.
        // --------------------------------------------------

        pipeline: [

            {
                $match: {

                    // --------------------------------------------------
                    // $expr ka use tab karte hain jab hame
                    // MongoDB ke fields/variables ko compare karna ho.
                    //
                    // Hame compare karna hai:
                    //
                    // Like document ka tweet
                    //
                    // VS
                    //
                    // current Tweet ki _id
                    //
                    // Aur ek aur condition:
                    //
                    // Like document ka likedBy
                    //
                    // VS
                    //
                    // current logged-in user
                    // --------------------------------------------------

                    $expr: {

                        // --------------------------------------------------
                        // $and ka matlab:
                        //
                        // DONO conditions TRUE honi chahiye.
                        //
                        // Condition 1:
                        // Like current tweet ka hona chahiye.
                        //
                        // Condition 2:
                        // Like current user ka hona chahiye.
                        // --------------------------------------------------

                        $and: [

                            // ==================================================
                            // CONDITION 1
                            // ==================================================

                            {
                                $eq: [

                                    // --------------------------------------------------
                                    // "$tweet"
                                    //
                                    // Ye Like collection ke document ka
                                    // tweet field hai.
                                    //
                                    // Example:
                                    //
                                    // {
                                    //     tweet: "tweet101"
                                    // }
                                    //
                                    // "$tweet" = "tweet101"
                                    // --------------------------------------------------

                                    "$tweet",

                                    // --------------------------------------------------
                                    // "$$tweetId"
                                    //
                                    // Ye hamara let wala variable hai.
                                    //
                                    // let me:
                                    //
                                    // tweetId: "$_id"
                                    //
                                    // tha.
                                    //
                                    // Agar current tweet "tweet101" hai,
                                    // toh "$$tweetId" = "tweet101"
                                    // --------------------------------------------------

                                    "$$tweetId"

                                ]

                            },

                            // ==================================================
                            // CONDITION 2
                            // ==================================================

                            {
                                $eq: [

                                    // --------------------------------------------------
                                    // "$likedBy"
                                    //
                                    // Like document ke andar jis user ne
                                    // like kiya hai uski ID.
                                    //
                                    // Example:
                                    //
                                    // likedBy: "user1"
                                    //
                                    // --------------------------------------------------

                                    "$likedBy",

                                    // --------------------------------------------------
                                    // req.user._id
                                    //
                                    // Ye currently logged-in user ki ID hai.
                                    //
                                    // Maan lo:
                                    //
                                    // req.user._id = "user1"
                                    //
                                    // --------------------------------------------------

                                    req.user._id

                                ]

                            }

                        ]

                    }

                }

            }

        ],

        // --------------------------------------------------
        // Jo matching Like documents milenge unko
        // "likedTweet" naam ke field me rakh do.
        // --------------------------------------------------

        as: "likedTweet"

    }

}