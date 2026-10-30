# video delete

```jsx

// lets make the controller for the delete video controller

const deleteVideo = asyncHandler(async(req, res)=>{

    // we take the video id
    const {videoId} = req.params;

    // now we validate the video id
    validateObjectId(
        videoId,
        "Video ID"
    );

    // now we take the video from the aggregation and check
    // ki video exist karti hai aur owner current user hi hai

    const videoResult = await Video.aggregate([
        {
            // first we match the video
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
                owner: new mongoose.Types.ObjectId(req.user._id),
                isDeleted: false
            }
        },
        {
            // now we get all comments belonging to this video
            $lookup: {
                from: "comments",
                let: {
                    videoId: "$_id"
                },
                as: "videoComments",
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: ["$video", "$$videoId"]
                            }
                        }
                    },
                    {
                        // now we get all replies of these comments
                        // including nested replies using graphLookup
                        $graphLookup: {
                            from: "comments",
                            startWith: "$_id",
                            connectFromField: "_id",
                            connectToField: "parentComment",
                            as: "replies"
                        }
                    },
                    {
                        // now we only keep comment IDs and reply IDs
                        $project: {
                            _id: 1,
                            replyIds: "$replies._id"
                        }
                    }
                ]
            }
        },
        {
            // now we get all likes belonging to this video
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "videoLikes",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            comment: 1
                        }
                    }
                ]
            }
        },
        {
            // now we get all reposts belonging to this video
            $lookup: {
                from: "reposts",
                localField: "_id",
                foreignField: "video",
                as: "videoReposts",
                pipeline: [
                    {
                        $project: {
                            _id: 1
                        }
                    }
                ]
            }
        },
        {
            // now we get all playlists containing this video
            $lookup: {
                from: "playlists",
                let: {
                    videoId: "$_id"
                },
                as: "videoPlaylists",
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $in: ["$$videoId", "$videos"]
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 1
                        }
                    }
                ]
            }
        },
        {
            // now we select only the fields required for deletion
            $project: {
                _id: 1,
                videoFile: 1,
                thumbnail: 1,
                videoComments: 1,
                videoLikes: 1,
                videoReposts: 1,
                videoPlaylists: 1
            }
        }
    ]);

    // now we check whether the video exists or not
    if(videoResult.length === 0){
        throw new ApiError(
            404,
            "Video not found or you are not allowed to delete this video"
        );
    }

    // now we store the video data
    const video = videoResult[0];

    // now we collect all comment IDs and their reply IDs
    const commentIds = [];

    for(const comment of video.videoComments){
        commentIds.push(comment._id);

        for(const replyId of comment.replyIds || []){
            commentIds.push(replyId);
        }
    }

    // now we remove duplicate comment IDs
    const uniqueCommentIds = [
        ...new Set(commentIds.map((commentId) => commentId.toString()))
    ];

    // now we permanently delete the separate thumbnail from Cloudinary
    // if thumbnail publicId is same as video publicId,
    // it means thumbnail is generated from the video itself
    if(
        video.thumbnail?.publicId &&
        video.thumbnail.publicId !== video.videoFile?.publicId
    ){
        try{
            await deleteFromCloudinary(video.thumbnail.publicId);
        }catch(error){
            console.log(error);
        }
    }

    // now we delete the video file from Cloudinary
    if(video.videoFile?.publicId){
        try{
            await deleteFromCloudinary(video.videoFile.publicId, "video");
        }catch(error){
            console.log(error);
        }
    }

    // now we delete all likes on comments and their replies
    if(uniqueCommentIds.length > 0){
        await Like.deleteMany({
            comment: {
                $in: uniqueCommentIds
            }
        });
    }

    // now we delete all comments and their replies
    if(uniqueCommentIds.length > 0){
        await Comment.deleteMany({
            _id: {
                $in: uniqueCommentIds
            }
        });
    }

    // now we delete all likes belonging to this video
    await Like.deleteMany({
        video: video._id
    });

    // now we delete all reposts belonging to this video
    await Repost.deleteMany({
        video: video._id
    });

    // now we remove this video from all playlists
    await Playlist.updateMany(
        {
            videos: video._id
        },
        {
            $pull: {
                videos: video._id
            }
        }
    );

    // now we permanently delete the video from the database
    await Video.findByIdAndDelete(video._id);

    // now we return the response
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Video deleted successfully"
        )
    );
});
```
j