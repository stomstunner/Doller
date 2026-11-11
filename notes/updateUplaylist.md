# code 
```jsx 

// now we make the controller for updating a playlist
const updatePlaylist = asyncHandler(async(req, res) => {

    // 1. first of all we take the playlistId from url params
    const { playlistId } = req.params;

    // 2. now we validate the object id
    validateObjectId(
        playlistId,
        "Playlist ID"
    )

    // 3. now we extract update details from req.body
    const { name, description, isPublic } = req.body;

    // 4. now we check ki playlist exist karti hai ya nahi aur kya logged in user hi owner hai
    const playlist = await Playlist.findOne(
        {
            _id: playlistId,
            isDeleted: false,
            owner: req.user._id
        }
    )

    // 5. if playlist not found or user is not owner
    if(!playlist){
        throw new ApiError(
            404,
            "Playlist not found or you are not allowed to edit this playlist"
        )
    }

    // 6. now we validate and update playlist name if provided
    if(name !== undefined){
        if(!name?.trim()){
            throw new ApiError(
                400,
                "Playlist name cannot be empty"
            )
        }

        if(name.trim().length > 100){
            throw new ApiError(
                400,
                "Playlist name cannot exceed 100 characters"
            )
        }

        playlist.name = name.trim();
    }

    // 7. now we validate and update playlist description if provided
    if(description !== undefined){
        if(!description?.trim()){
            throw new ApiError(
                400,
                "Playlist description cannot be empty"
            )
        }

        if(description.trim().length > 500){
            throw new ApiError(
                400,
                "Playlist description cannot exceed 500 characters"
            )
        }

        playlist.description = description.trim();
    }

    // 8. now we update isPublic visibility if provided
    if(isPublic !== undefined){
        playlist.isPublic = isPublic === "true" || isPublic === true;
    }

    // 9. updated playlist ko save kar do database me
    await playlist.save();

    // 10. now we fetch the populated updated playlist
    const updatedPlaylist = await Playlist.findById(playlistId)
    .populate(
        "owner",
        "fullName username avatar"
    )
    .lean()

    if(!updatedPlaylist){
        throw new ApiError(
            500,
            "Failed to fetch updated playlist details"
        )
    }

    // 11. now we send the response to the frontend
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatedPlaylist,
            "Playlist Updated Successfully"
        )
    )
})

export {
    updatePlaylist
}
```
 code