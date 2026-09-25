Request Received
        ↓
Extract content
        ↓
Validate content
        ↓
Validate mentions
        ↓
Remove duplicate mentions
        ↓
Validate ObjectIds
        ↓
Create Tweet
        ↓
Store owner
        ↓
Store mentions
        ↓
Send Response

```jsx

const createTweet = asyncHandler(async(req, res) => {

    const { content } = req.body;

    // content validation

    if(!content?.trim()){

        throw new ApiError(
            400,
            "Tweet content is required"
        );
    }

    // maximum length validation

    if(content.trim().length > 300){

        throw new ApiError(
            400,
            "Tweet cannot exceed 300 characters"
        );
    }

    // now we find all the mentions from the content

    const mentionMatches =
        content.match(
            /@([a-zA-Z0-9_]+)/g
        ) || [];

    // remove the @ symbol from usernames

    const usernames =
        mentionMatches.map(
            (username) =>
                username.substring(1)
        );

    // remove duplicate usernames

    // `new Set(usernames)` duplicate usernames ko remove karta hai,
    // kyunki Set me har value sirf ek baar store hoti hai.
    // `...` Set ki values ko spread karta hai, aur [] unhe dobara array bana dete hain.
    // Example: ["ujjwal", "rahul", "ujjwal"] => ["ujjwal", "rahul"]
    const uniqueUsernames = [
        ...new Set(usernames)
    ];

    // now we find all the users that exist in the database

    const mentionedUsers =
        await User.find(
            {
                username: {
                    $in: uniqueUsernames
                }
            }
        )
        .select("_id username");

    // now we store only the ids

    const mentions =
        mentionedUsers.map(
            (user) => user._id
        );

    // create tweet

    const tweet =
        await Tweet.create(
            {
                content: content.trim(),

                owner: req.user._id,

                mentions
            }
        );

    if(!tweet){

        throw new ApiError(
            500,
            "Failed to create tweet"
        );
    }

    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            tweet,
            "Tweet created successfully"
        )
    );

});

```

,