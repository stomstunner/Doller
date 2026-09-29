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