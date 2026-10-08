```jsx
const getWatchHistory = asyncHandler(async(req, res) => {

    // first of all we get the page number
    // from the req.query
    const page = Math.max(
        Number(req.query.page) || 1,
        1
    );

    // now we get the limit
    // and make sure that limit should not
    // be greater than 50
    const limit = Math.min(
        Math.max(
            Number(req.query.limit) || 10,
            1
        ),
        50
    );

    // now we calculate the skip
    const skip = (page - 1) * limit;

    // now we get the search value
    // if search is not provided then it will be empty
    const search = req.query.search || "";

    // now we create the sort options
    // latest watched video will come first
    const sortOptions = {
        lastWatchedAt: -1
    };

    // now we convert the current user's id
    // into ObjectId
    const userId = new mongoose.Types.ObjectId(
        req.user._id
    );


    // now we make the aggregation pipeline
    // for getting the watch history
    const watchHistory = await WatchHistory.aggregate(
        [
            // first we find the watch history
            // of the current user
            {
                $match: {
                    user: userId
                }
            },

            // now we lookup the video
            // because WatchHistory only contains
            // the video id
            {
                $lookup: {
                    from: "videos",

                    localField: "video",

                    foreignField: "_id",

                    as: "video",

                    // now we use the pipeline
                    // to get only required video details
                    pipeline: [

                        // now we only get videos that are not deleted,
                        // published, and match the search
                        {
                            $match: {
                                isDeleted: false,
                                isPublished: true,
                                $or: [
                                    {
                                        title: {
                                            $regex: search,
                                            $options: "i"
                                        }
                                    },
                                    {
                                        description: {
                                            $regex: search,
                                            $options: "i"
                                        }
                                    }
                                ]
                            }
                        },

                        // now we lookup the owner
                        // of the video
                        {
                            $lookup: {
                                from: "users",

                                localField: "owner",

                                foreignField: "_id",

                                as: "owner",

                                // now we use the pipeline
                                // to get only useful details
                                // from the owner
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

                        // now owner is an array
                        // so we take the first value
                        // and store it as an object
                        {
                            $addFields: {
                                owner: {
                                    $first: "$owner"
                                }
                            }
                        },

                        // now we project only required
                        // video information
                        {
                            $project: {

                                // video information
                                videoFile: 1,

                                thumbnail: 1,

                                title: 1,

                                description: 1,

                                duration: 1,

                                // owner information
                                owner: 1,

                                // video dates
                                createdAt: 1,

                                updatedAt: 1
                            }
                        }
                    ]
                }
            },

            // now video is an array
            // so we convert it into an object
            //
            // if video does not exist
            // then this watch history will be removed
            {
                $unwind: "$video"
            },

            // now we sort the watch history
            // according to the last watched time
            {
                $sort: sortOptions
            },

            // now we skip the previous records
            // according to the current page
            {
                $skip: skip
            },

            // now we take only the required records
            // according to the limit
            {
                $limit: limit
            },

            // now we project only required fields
            {
                $project: {

                    // WatchHistory information
                    _id: 1,

                    videoDuration: 1,

                    watchDuration: 1,

                    watchPercentage: 1,

                    isCompleted: 1,

                    lastPosition: 1,

                    watchCount: 1,

                    lastWatchedAt: 1,

                    // Video information
                    video: 1
                }
            }
        ]
    );


    // now we make another aggregation pipeline
    // for getting the total number of records
    const totalCountResult = await WatchHistory.aggregate(
        [
            // first we find the watch history
            // of the current user
            {
                $match: {
                    user: userId
                }
            },

            // now we lookup the video
            // so that we can check whether
            // the video is still available or not
            {
                $lookup: {
                    from: "videos",

                    localField: "video",

                    foreignField: "_id",

                    as: "video",

                    // now we use the pipeline
                    // to get only valid videos
                    pipeline: [

                        // now we only get videos
                        // which are not deleted
                        // and are published
                        {
                            $match: {
                                isDeleted: false,
                                isPublished: true
                            }
                        },

                        // now we apply the search
                        {
                            $match: {
                                $or: [
                                    {
                                        title: {
                                            $regex: search,
                                            $options: "i"
                                        }
                                    },
                                    {
                                        description: {
                                            $regex: search,
                                            $options: "i"
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
            },

            // now video is an array
            // so we convert it into an object
            //
            // if video does not exist
            // then this watch history will be removed
            {
                $unwind: "$video"
            },

            // now we count all the matching
            // watch history records
            {
                $count: "totalCount"
            }
        ]
    );


    // now we create a variable
    // for storing the total count
    let totalCount = 0;


    // now we check whether totalCountResult
    // contains any value or not
    if(totalCountResult.length > 0){

        totalCount =
            totalCountResult[0].totalCount;
    }


    // now we calculate the total number
    // of pages
    const totalPages =
        Math.ceil(totalCount / limit);


    // now we check whether the next page
    // is available or not
    let hasNextPage = false;

    if(page < totalPages){

        hasNextPage = true;
    }


    // now we check whether the previous page
    // is available or not
    let hasPreviousPage = false;

    if(page > 1){

        hasPreviousPage = true;
    }


    // now we return the final response
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                watchHistory,

                pagination: {

                    page,

                    limit,

                    totalCount,

                    totalPages,

                    hasNextPage,

                    hasPreviousPage
                }
            },

            "Watch History Fetched Successfully"
        )
    );
});
```
k