```jsx
const incrementTweetView = asyncHandler(async(req, res) => {

    // first of all we fetch the tweet id from the req.params
    const { tweetId } = req.params;

    // now we validate the object id
    // ki tweetId ek valid MongoDB ObjectId hai ya nahi
    validateObjectId(
        tweetId,
        "Tweet ID"
    );

    // now we check whether the tweet exists or not
    // and also check that the tweet is not deleted
    const tweet = await Tweet.findOne({
        _id: tweetId,
        isDeleted: false
    });

    // if tweet does not exist
    if(!tweet){

        throw new ApiError(
            404,
            "Tweet not found"
        );
    }

    // now we check whether this user
    // has already viewed this tweet
    const existingView = await View.findOne({
        user: req.user._id,
        tweet: tweetId
    });

    // now we get the current time
    const currentTime = new Date();

    // ------------------------------------------------
    // if user is viewing this tweet for the first time
    // ------------------------------------------------

    if(!existingView){

        // now we create the view document
        await View.create({
            user: req.user._id,
            tweet: tweetId,
            viewedAt: currentTime
        });

        // now we increase the tweet view count by 1
        const updatedTweet = await Tweet.findByIdAndUpdate(
            tweetId,
            {
                $inc: {
                    viewCount: 1
                }
            },
            {
                new: true
            }
        );

        // now we return the updated view count
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {
                        viewCount: updatedTweet.viewCount
                    },
                    "Tweet view counted successfully"
                )
            );
    }

    // now we calculate the time passed
    // since the user's last counted view
    const timeDifference =
        currentTime.getTime() -
        existingView.viewedAt.getTime();

    // we are keeping 5 minutes as the cooldown time
    const cooldownTime = 5 * 60 * 1000;

    // now we check whether 5 minutes have passed or not
    if(timeDifference < cooldownTime){

        // if 5 minutes have not passed
        // then we don't increase the view count
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {
                        viewCount: tweet.viewCount
                    },
                    "Tweet view already counted recently"
                )
            );
    }

    // now 5 minutes have passed
    // so we update the last viewed time
    existingView.viewedAt = currentTime;

    await existingView.save();

    // now we increase the tweet view count by 1
    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $inc: {
                viewCount: 1
            }
        },
        {
            new: true
        }
    );

    // now we return the updated view count
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    viewCount: updatedTweet.viewCount
                },
                "Tweet view counted successfully"
            )
        );
});

```

he