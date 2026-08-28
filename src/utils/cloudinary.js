// here we write the code for basic snipit of the cloudinary for file upload

// yaha ham ye kar rhae hai ki hamra file server pe toh aa gaya hai 
// ab hamre pass bass yaha pe server pe uss file ka local path chaiye jisse ki ham cloudinary pe upload karenge

// and we also have to remove after suceffully uploaded to the server 

import { v2 as cloudinary } from "cloudinary"
// now we import the fs = file system for unlinking the file = delleting
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY
})


// now we make the method to upload the file or videos on the cloudinary 

const uploadOnCloudinary = async (LocalFilePath) => {
    // iske ander ham apne file jaha local storage pe hai uska path send karnenge
    try{
        // first of all we check ki hamara file present hai ya nahi 
        if(!LocalFilePath) return null
        // if present then we upload the file that was on the local path to the cloudinary 
        // iske ander hai url dete hai but yaha pe ham local path denge 
        // also we can give the file type in a object 
        const response = await cloudinary.uploader.upload(LocalFilePath, {
            resource_type: "auto"
        })

        // our file is uploaded to the cloudinary sucessufully
        console.log("File is uploaded on Cloudinary sucessfully", response.url);
        return response;
    }catch(error){
        // here we not only show the error but we unlink/ delete the file from locally saved temporarlly file as the upload operation got failed 

        fs.unlinkSync(LocalFilePath);
        return null;
    }   
}

// at the last we export the method uploadOnCloudinary
export {uploadOnCloudinary}