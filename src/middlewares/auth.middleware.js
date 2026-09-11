// ye middleware bass check karega ki user hai ya nahi hai 
// so we verify user with the access token and refress token 

import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asynchandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.models.js";
  

// yaha 
// pe ahmra req aur next toh kaam aa rha hai but res nahi so ham woha pe underscore ka use karnge
export const verifyJWT = asyncHandler(async(req, _ , next)=>{
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        // so yaha hamne token nikal hai request.cookies se access token jo ki hamne login karte time bheja tha but ager cookie ke pass nahi hua ager ham moblile se access kar rkahe hai toh ham header se lenge jimse hame header me authorization milta hai then bearer space then token so ham bearer space ko replace kar denge empty se  then we get the token 
    
        if(!token){
            throw new ApiError(401, "Unautorized request ")
        }
    
        // now we take information from the jwt token ki hamara token sabhi bhi hai ya nahi jiske liye ham jwt ko import karwanege 
        // for verification we need the actual token and the public / private key 
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refressToken")
    
        // ager hamra user nahi hai toh
        if(!user){
            // TODO: 
            throw new ApiError(401, "Invalid Access Token")
        }
    
        // ager hamare pass user hai hi toh kya kare 
        // request  me ek object add kar denge 
        req.user = user
        next()
    } catch (error) {
        throw new ApiError(401, error?.massage || "invalid access token");
        
    }

})