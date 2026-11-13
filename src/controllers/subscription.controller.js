import mongoose from "mongoose";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { validateObjectId } from "../utils/validateObjectId.js";
import { Subscription } from "../models/subscription.models.js";
import { User } from "../models/user.models.js";

// first of all we make the controller of the tollgesubcription jsise user creater ko subcribe ya unsubscribe kar sake aur ager woh twiter wale section me hai toh creator ko follow ya unfollow kar sake 