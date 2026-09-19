// here we write the code for the validate the object id whenever we get any objectID 

// idea simple ahi ki mongodb ka objectID diffrent hot ahi from the normal id so if i get the normal text then i have to send a error and if the object id id valid then i have to go further 

import mongoose from "mongoose";
import {ApiError} from "./ApiError.js"

// we direct export the validateObjectId as a utiliti 
export const validateObjectId = ( id, filedName = "Object ID") => {
    if(!mongoose.Types.ObjectId.isValid(id)){
        throw new ApiError(
            400,
            `invalid ${filedName}`
        )
    };
};