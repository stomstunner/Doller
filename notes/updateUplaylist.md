# code 

```jsx
// now we make the controller for updating a playlist
const updatePlaylist = asyncHandler(async(req, res) => {

    // 1. first of all we take the playlistId from params
    const { playlistId } = req.params;

    // 2. now we validate the object id
    validateObjectId(
        playlistId,
        "Playlist ID"
    )

    // 3. now we extract update data from req.body
    const { name, description, isPublic } = req.body;

    // 4. now we check ki playlist exist karti hai ya nahi aur kya current user iska owner hai
    const playlist = await Playlist.findOne(
        {
            _id: playlistId,
            isDeleted: false,
            owner: req.user._id
        }
    )

    // 5. if playlist not found or user is not allowed
    if(!playlist){
        throw new ApiError(
            404,
            "Playlist not found or you are not allowed to update this playlist"
        )
    }

    // 6. now we handle thumbnail update if user uploaded a new image
    let thumbnail = playlist.thumbnail;

    if(req.file?.path){
        const uploadedThumbnail = await uploadOnCloudinary(req.file.path);

        if(!uploadedThumbnail?.url){
            throw new ApiError(
                500,
                "Failed to upload new playlist thumbnail"
            )
        }

        // if old thumbnail exists on cloudinary then delete it
        if(playlist.thumbnail?.publicId){
            try {
                await deleteFromCloudinary(playlist.thumbnail.publicId);
            } catch(error){
                console.log(error);
            }
        }

        thumbnail = {
            url: uploadedThumbnail.url,
            publicId: uploadedThumbnail.public_id
        }
    }

    // 7. now we validate and update playlist name if provided
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

    // 8. now we validate and update playlist description if provided
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

    // 9. now we update isPublic visibility if provided
    if(isPublic !== undefined){
        playlist.isPublic = isPublic === "true" || isPublic === true;
    }

    playlist.thumbnail = thumbnail;

    // 10. save the updated playlist in database
    await playlist.save();

    // 11. now we fetch the populated updated playlist
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

    // 12. now we send the final response to frontend
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
cd