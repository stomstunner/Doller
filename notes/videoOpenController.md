#  get video by id 

```jsx
    const getVideoById = asyncHandler(async(req, res) => {

    // first of all we fetch the video id from the req.params
    const { videoId } = req.params;

    // now we validate the object id
    // ki videoId ek valid MongoDB ObjectId hai ya nahi
    validateObjectId(
        videoId,
        "Video ID"
    );

    // now we convert the video id into ObjectId
    // because aggregation ke andar hame ObjectId chahiye
    const videoObjectId =
        new mongoose.Types.ObjectId(videoId);

    // now we write the most important code
    // for getting the complete video information
    // using the aggregation pipeline
    const videoResult = await Video.aggregate(
        [

            // ------------------------------------------------
            // 1. FIRST WE FIND THE VIDEO
            // ------------------------------------------------

            {
                $match: {
                    // video id se particular video find karenge
                    _id: videoObjectId,

                    // deleted video ko fetch nahi karna
                    isDeleted: false,

                    // sirf published video ko fetch karna
                    isPublished: true
                }
            },

            // ------------------------------------------------
            // 2. NOW WE GET THE OWNER INFORMATION
            // ------------------------------------------------

            {
                $lookup: {
                    // hame user collection se owner ka data chahiye
                    from: "users",

                    // video document ke andar owner ki id hai
                    localField: "owner",

                    // users collection me owner ki id _id field me hai
                    foreignField: "_id",

                    // owner ka data owner field me aa jayega
                    as: "owner",

                    // ab user collection ke andar bhi
                    // ek choti aggregation pipeline chalayenge
                    pipeline: [
                        {
                            // frontend ko sirf ye fields chahiye
                            // isliye baaki user fields ko nahi bhejenge
                            $project: {
                                fullName: 1,
                                username: 1,
                                avatar: 1
                            }
                        }
                    ]
                }
            },

            // lookup se data array me aata hai
            // lekin ek video ka ek hi owner hota hai
            // isliye owner array me se first object le lenge
            {
                $addFields: {
                    owner: {
                        $first: "$owner"
                    }
                }
            },

            // ------------------------------------------------
            // 3. NOW WE CHECK CURRENT USER LIKED THE VIDEO OR NOT
            // ------------------------------------------------

            {
                $lookup: {
                    // like collection se data lenge
                    from: "likes",

                    // current video ki _id
                    localField: "_id",

                    // Like model me video field ke saath match karenge
                    foreignField: "video",

                    // matched likes userLike field me aa jayenge
                    as: "userLike",

                    // ab lookup ke andar ek aur pipeline
                    // jisme sirf current user ka like check karenge
                    pipeline: [
                        {
                            $match: {

                                // current logged-in user ki id
                                likedBy:
                                    new mongoose.Types.ObjectId(
                                        req.user._id
                                    )
                            }
                        }
                    ]
                }
            },

            // ab userLike array ko check karenge
            // agar array ka size 0 se greater hai
            // to user ne video ko like kiya hai
            {
                $addFields: {
                    isLiked: {
                        $cond: [
                            {
                                $gt: [
                                    {
                                        $size: "$userLike"
                                    },
                                    0
                                ]
                            },

                            // agar condition true hai
                            true,

                            // agar condition false hai
                            false
                        ]
                    }
                }
            },

            // ------------------------------------------------
            // 4. NOW WE GET TOTAL LIKE COUNT
            // ------------------------------------------------

            {
                $lookup: {
                    // ab saare likes ko lookup karenge
                    from: "likes",

                    // current video ki id
                    localField: "_id",

                    // likes collection me video field
                    foreignField: "video",

                    // saare likes likes field me aa jayenge
                    as: "likes"
                }
            },

            // ab likes array ke size se
            // total like count nikalenge
            {
                $addFields: {
                    likeCount: {
                        $size: "$likes"
                    }
                }
            },

            // ------------------------------------------------
            // 5. NOW WE CHECK CURRENT USER REPOSTED OR NOT
            // ------------------------------------------------

            {
                $lookup: {
                    // repost collection se data lenge
                    from: "reposts",

                    // current video ki id
                    localField: "_id",

                    // Repost model me video field
                    foreignField: "video",

                    // current user ka repost
                    // userRepost field me aa jayega
                    as: "userRepost",

                    // ab sirf current logged-in user ka repost check karenge
                    pipeline: [
                        {
                            $match: {
                                repostedBy:
                                    new mongoose.Types.ObjectId(
                                        req.user._id
                                    )
                            }
                        }
                    ]
                }
            },

            // ab userRepost array ko check karenge
            // agar array empty nahi hai
            // to user ne video repost kiya hai
            {
                $addFields: {
                    isReposted: {
                        $cond: [
                            {
                                $gt: [
                                    {
                                        $size: "$userRepost"
                                    },
                                    0
                                ]
                            },
                            true,
                            false
                        ]
                    }
                }
            },

            // ------------------------------------------------
            // 6. NOW WE GET TOTAL REPOST COUNT
            // ------------------------------------------------

            {
                $lookup: {
                    // repost collection se saare repost lenge
                    from: "reposts",

                    // current video ki id
                    localField: "_id",

                    // repost collection me video field
                    foreignField: "video",

                    // saare reposts reposts field me aa jayenge
                    as: "reposts"
                }
            },

            // ab reposts array ke size se
            // total repost count nikalenge
            {
                $addFields: {
                    repostCount: {
                        $size: "$reposts"
                    }
                }
            },

            // ------------------------------------------------
            // 7. NOW WE CHECK CURRENT USER COMMENTED OR NOT
            // ------------------------------------------------

            {
                $lookup: {
                    // comment collection se data lenge
                    from: "comments",

                    // current video ki id
                    localField: "_id",

                    // Comment model me video field
                    foreignField: "video",

                    // current user ke comments
                    // userComment field me aa jayenge
                    as: "userComment",

                    // ab sirf current logged-in user ke comments check karenge
                    pipeline: [
                        {
                            $match: {

                                // comment kis user ne kiya hai
                                owner:
                                    new mongoose.Types.ObjectId(
                                        req.user._id
                                    ),

                                // deleted comment ko consider nahi karenge
                                isDeleted: false
                            }
                        }
                    ]
                }
            },

            // ab userComment array ko check karenge
            // agar array ka size 0 se greater hai
            // to user ne video par comment kiya hai
            {
                $addFields: {
                    hasCommented: {
                        $cond: [
                            {
                                $gt: [
                                    {
                                        $size: "$userComment"
                                    },
                                    0
                                ]
                            },
                            true,
                            false
                        ]
                    }
                }
            },

            // ------------------------------------------------
            // 8. NOW WE GET CURRENT USER'S PLAYLISTS
            // ------------------------------------------------

            {
                $lookup: {
                    // playlist collection se data lenge
                    from: "playlists",

                    // current video ki id ko
                    // nested pipeline ke andar use karna hai
                    // isliye let ka use karenge
                    let: {
                        videoId: "$_id"
                    },

                    // playlists ka final result
                    // playlists field me aa jayega
                    as: "playlists",

                    // ab playlist collection ke andar
                    // nested aggregation pipeline chalegi
                    pipeline: [

                        // sabse pehle current user ki playlists lenge
                        {
                            $match: {
                                owner:
                                    new mongoose.Types.ObjectId(
                                        req.user._id
                                    ),

                                // deleted playlist ko nahi lenge
                                isDeleted: false
                            }
                        },

                        // ab har playlist ke liye check karenge
                        // ki current video uske videos array me hai ya nahi
                        {
                            $addFields: {
                                isAdded: {
                                    $in: [
                                        "$$videoId",
                                        "$videos"
                                    ]
                                }
                            }
                        },

                        // frontend ko playlist ki sirf required information denge
                        {
                            $project: {
                                name: 1,
                                isPublic: 1,
                                isAdded: 1
                            }
                        }
                    ]
                }
            },

            // ------------------------------------------------
            // 9. NOW WE CHECK USER HAS ANY PLAYLIST OR NOT
            // ------------------------------------------------

            {
                $addFields: {
                    hasPlaylists: {
                        $cond: [
                            {
                                $gt: [
                                    {
                                        $size: "$playlists"
                                    },
                                    0
                                ]
                            },
                            true,
                            false
                        ]
                    }
                }
            },

            // ------------------------------------------------
            // 10. NOW WE CHECK VIDEO IS ADDED TO ANY PLAYLIST
            // ------------------------------------------------

            {
                $addFields: {
                    isAddedToPlaylist: {
                        $cond: [
                            {
                                $gt: [
                                    {
                                        $size: {

                                            // playlists array me se
                                            // sirf woh playlists filter karenge
                                            // jisme video added hai
                                            $filter: {

                                                // kis array ko filter karna hai
                                                input: "$playlists",

                                                // current playlist ko
                                                // playlist naam denge
                                                as: "playlist",

                                                // check karenge ki
                                                // current playlist ka isAdded
                                                // true hai ya nahi
                                                cond: {
                                                    $eq: [
                                                        "$$playlist.isAdded",
                                                        true
                                                    ]
                                                }
                                            }
                                        }
                                    },

                                    // agar filtered playlists
                                    // 0 se greater hain
                                    0
                                ]
                            },

                            // video kisi playlist me added hai
                            true,

                            // video kisi playlist me added nahi hai
                            false
                        ]
                    }
                }
            },

            // ------------------------------------------------
            // 11. NOW WE PROJECT ONLY REQUIRED FIELDS
            // ------------------------------------------------

            {
                $project: {

                    // video information
                    videoFile: 1,
                    thumbnail: 1,
                    title: 1,
                    description: 1,
                    duration: 1,

                    // current view count
                    viewCount: 1,

                    // owner information
                    owner: 1,

                    // like information
                    likeCount: 1,
                    isLiked: 1,

                    // repost information
                    repostCount: 1,
                    isReposted: 1,

                    // comment information
                    hasCommented: 1,

                    // playlist information
                    hasPlaylists: 1,
                    isAddedToPlaylist: 1,
                    playlists: 1,

                    // video dates
                    createdAt: 1,
                    updatedAt: 1
                }
            }
        ]
    );

    // if videoResult array is empty
    // it means video does not exist
    // or video is deleted/unpublished
    if(videoResult.length === 0){
        throw new ApiError(
            404,
            "Video not found"
        );
    }

    // now we take the first video object from the result
    // so that aage hame baar-baar videoResult[0] nahi likhna pade
    const video = videoResult[0];

    // now we increase the view count
    // because user has opened this video
    //
    // there is NO cooldown system
    // every time this controller is called
    // one view will be added
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $inc: {
                viewCount: 1
            }
        },
        {
            new: true
        }
    );

    // now we update the view count in our video object
    // because aggregation pehle run hui thi
    // aur uske baad view count increase hua hai
    video.viewCount =
        updatedVideo.viewCount;

    // now we send the complete video information
    // to the frontend
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                video,
                "Video fetched successfully"
            )
        );
});



```

j