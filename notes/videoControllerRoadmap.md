video.controller.js

1. createVideo
2. getVideoById
3. getUserVideos
4. getVideoFeed
5. updateVideo
6. deleteVideo
7. incrementVideoView
8. toggleVideoRepost
9. getVideoReposts
---

# createVideo

              USER
                ↓
        create video request
                ↓
        ┌─────────────────┐
        │ Validate input  │
        └────────┬────────┘
                 ↓
          Video file hai?
                 ↓
          Cloudinary upload
                 ↓
       ┌─────────┴──────────┐
       │                    │
Thumbnail diya?       Thumbnail nahi diya?
       │                    │
      YES                   NO
       │                    │
Upload thumbnail      Video se frame
to Cloudinary         extract karo
       │                    │
       │              Thumbnail banao
       │                    │
       └─────────┬──────────┘
                 ↓
        Video information
          MongoDB me save
                 ↓
             Response

---

```jsx
const createVideo = asyncHandler(async(req, res) => {

    // here we create the video
    //
    // steps
    //
    // 1 get the details of video from frontend
    //
    // 2 validations - title and description
    //
    // 3 check if video is present
    //
    // 4 upload the video to cloudinary
    //
    // 5 check if user has uploaded thumbnail or not
    //
    // 6 if thumbnail is uploaded then upload it to cloudinary
    //
    // 7 if thumbnail is not uploaded then generate
    //   thumbnail from the video
    //
    // 8 create video object - create entry in database
    //
    // 9 check for video creation
    //
    // 10 return response


    // first of all we get the title and description
    // because these values are coming from req.body
    const { title, description } = req.body;


    // now we validate the data
    // title and description should not be empty
    if(
        [title, description].some((field) =>
            field?.trim() === ""
        )
    ){
        throw new ApiError(
            400,
            "Title and description are required"
        )
    }


    // now we get the video file from req.files
    // multer gives us access to uploaded files through req.files
    //
    // here we get the first video file
    // and then get its local path
    const videoLocalPath =
        req.files?.video?.[0]?.path;


    // now we check whether video is present or not
    // because video is required to create a video
    if(!videoLocalPath){
        throw new ApiError(
            400,
            "Video is required"
        )
    }


    // now we upload the video to cloudinary
    // we provide the local path of the video
    // which multer has stored temporarily
    const video =
        await uploadOnCloudinary(
            videoLocalPath,
            "video"
        );


    // now we check whether video was successfully
    // uploaded to cloudinary or not
    if(!video){
        throw new ApiError(
            500,
            "Video upload failed"
        )
    }


    // now we check whether user has uploaded
    // a thumbnail or not
    //
    // thumbnail is optional in our application
    // because if user does not provide it
    // then we will generate it from the video
    const thumbnailLocalPath =
        req.files?.thumbnail?.[0]?.path;


    // now we create variables for thumbnail
    // because we need both URL and public ID
    //
    // URL will be used to display the thumbnail
    // public ID will be used later to delete
    // or replace the thumbnail from Cloudinary
    let thumbnailUrl;
    let thumbnailPublicId;


    // now we check whether user has provided
    // the thumbnail or not
    if(thumbnailLocalPath){

        // user has provided the thumbnail
        // so now we upload that thumbnail
        // to cloudinary
        const thumbnail =
            await uploadOnCloudinary(
                thumbnailLocalPath
            );


        // now we check whether thumbnail was
        // successfully uploaded or not
        if(!thumbnail){
            throw new ApiError(
                500,
                "Thumbnail upload failed"
            )
        }


        // now we get the thumbnail URL
        // from the cloudinary response
        thumbnailUrl =
            thumbnail.secure_url ||
            thumbnail.url;


        // now we get the public ID
        // from the cloudinary response
        //
        // we will use this public ID later
        // when user wants to update or delete
        // this thumbnail
        thumbnailPublicId =
            thumbnail.public_id;
    }


    // if user has not provided the thumbnail
    // then we generate a thumbnail from the video
    else{

        // cloudinary allows us to generate an image
        // from a particular frame of a video
        //
        // here we are taking the frame from 2nd second
        //
        // so_2 means that we want the frame
        // from 2 seconds into the video
        thumbnailUrl =
            video.secure_url
                .replace(
                    "/video/upload/",
                    "/video/upload/so_2/"
                )
                .replace(
                    /\.[^/.]+$/,
                    ".jpg"
                );


        // the automatically generated thumbnail
        // is actually a transformation of the video
        //
        // so its public ID is based on the video
        // public ID
        thumbnailPublicId =
            video.public_id;
    }


    // now we check whether we actually got
    // a thumbnail URL or not
    //
    // because thumbnail is required in our Video schema
    if(!thumbnailUrl){
        throw new ApiError(
            500,
            "Thumbnail could not be generated"
        )
    }


    // now we create the video object
    // and create the entry in our database
    const createdVideo =
        await Video.create({

            // here we store both URL and public ID
            // of the uploaded video
            videoFile: {
                url:
                    video.secure_url ||
                    video.url,

                publicId:
                    video.public_id
            },


            // here we store both URL and public ID
            // of the final thumbnail
            thumbnail: {
                url:
                    thumbnailUrl,

                publicId:
                    thumbnailPublicId
            },


            // title received from frontend
            title:
                title.trim(),


            // description received from frontend
            description:
                description.trim(),


            // cloudinary gives us the duration
            // of the uploaded video
            duration:
                video.duration,


            // owner is the currently logged-in user
            // req.user comes from verifyJWT middleware
            owner:
                req.user._id
        });


    // now we check whether our video was
    // successfully created in the database
    if(!createdVideo){
        throw new ApiError(
            500,
            "Something went wrong while creating the video"
        )
    }


    // now we send the response to the frontend
    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                createdVideo,
                "Video uploaded successfully"
            )
        )

});
```

j





