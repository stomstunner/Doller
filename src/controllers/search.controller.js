// here we make the controller ofr the user searches in the videos and in the tweet 

import mongoose from "mongoose";
import {asyncHandler} from "../utils/asynchandler.js";
import {ApiError} from "../utils/ApiError.js";
import {validateObjectId} from "../utils/validateObjectId.js";
import {ApiResponse} from "../utils/ApiResponse.js";

import {Video} from "../models/video.models.js";
import {Tweet} from "../models/tweet.models.js";
import {GlobalSearch} from "../models/globalSearch.models.js";
import { User } from "../models/user.models.js";

const globalSearch = asyncHandler(async(req, res)=> {
    // store the query from the request 
    const query  = req.query.query?.trim() || "";
    const searchType = req.query.searchType?.trim() || "all";

    // pagination code 
    const page = Math.max(
        Number.parseInt(req.query.page) || 1,
        1
    )

    const limit  = Math.min(
        Math.max(
            Number.parseInt(req.query.limit)|| 10,
            1
        ),
        50
    )

    const skip = (page - 1) * limit;

    // isse hamara special character ko regex ek regular vlaue ke tarah hi dekhega like ham mongodb me regex ka use karnge toh usse special character ka agla treat karta hai so ham chahate hai ki regex user ke special charater ko special character hi treat kare na ki regex character 
    // now we escape the special characters
    // from the search query

    const search = query.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );

    if(!query){
        throw new ApiError(
            400, 
            "Search query is required "
        )
    }

    if(query.length > 200){ 
        throw new ApiError(
            400,
            "Search query cannot exceed 200 characters"
        )
    }

    // for validation of the search type we firstly make a varibale that storeed the predefined types in an array then we just check ki hamara searchTypes ka values uss array me exist karta hai ya nahi 
    const allowedSearchTypes = ["all","video","tweet","user"];
    if(!allowedSearchTypes.includes(searchType)){
        // ager in me se match nahi hua toh error
        throw new ApiError(
            400,
            "Invalid Search Type"
        )
    }

    // // now we intitlize the result array  like user me kitna data hai tweet me kya data haia aur videos me kya data hai 
    // let users = [];
    // let videos = [];
    // let tweets = [];

    // // also we make the count of the restul for each section 
    // let totalVideos = 0;
    // let totalTweets = 0;
    // let totalUsers = 0;

    
    const users = (searchType === "all" || searchType === "user")
    ? await User.aggregate(
        [
            // first level of aggeration
            {
                $match: {
                    $or:[
                        {
                            fullName:{
                                $regex: search,
                                $options: "i"
                            }
                        },
                        {
                            username:{
                                $regex: search,
                                $options: "i"
                            }
                        }
                    ]
                }
            },

            // now we use the facet jisse mai simultensilly filterd result ko bhej bhi sake saat me kitne retult hai total usse bhi store kar sake 
            {
                $facet:{
                    // isme top me hamare pass 2 chize hone 1st result and 2nd is count 
                    result:[
                        // result me ham filter ckarnge pagination lagangne 
                        {
                            $sort: {
                                fullName: 1
                            }
                        },
                        {
                            $skip: skip
                        },
                        {
                            $limit: limit
                        },
                        // and then we selecte the few field jisse hame user ko bhejne hai 
                        {   
                            $project:{
                                fullName: 1,
                                username: 1,
                                avatar: 1
                            }
                        }
                    ],

                    // 2nd pipeline hai hamre pass total user kitne hai result me unko count karna isme ham sort , limit nahi lagange kyuki hame total count chaiye 
                    totalCount: [
                        {
                            $count: "total"
                        }
                    ]
                }
            }
        ]
    ) : [{result: [], totalCount: []}];

    // eventually we write the terninary operatior 
    // const user = ()? true(await user.aggreaget) : false = [result empty aur totalcount empty ]

    // now we look into the videoquery 
    const videos = (searchType === "all" || searchType === "video")
    ? await Video.aggregate(
        [
            {
                $match: {
                    isDeleted: false,
                    isPublished : true,
                    $or: [
                        {
                            title: {
                                $regex: search,
                                $options: "i"
                            }
                        },
                        {
                            description: {
                                $regex: search,
                                $options: "i"
                            }
                        }
                    ]
                }
            },
            // now we use the facet for similtounius ipline in the videos for the finding the correct video and the couting of the vidoe 

            {
                $facet:{
                    results: [
                        // isme ham apne sare pagination ke concept likhnge and the lookup and whnat data we want to send to the results to the user
                        {
                            $sort: {
                                createdAt: -1
                            }
                        },
                        {
                            $skip: skip
                        },
                        {
                            $limit: limit
                        },
                        // now we lookup to the user from the videos abhi ham video ke ander hai aggreaget kar rahe hai 

                        {
                            $lookup: {
                                from: "users",
                                // abhi ham video ke ander hai toh woh user hamara video ka owner hai 
                                localField: "owner",
                                foreignField: "_id",
                                // user ki id de bhai 
                                as:"owner",
                                // now we again make a pipeline kyuki hame user ke kuch selected filed hi chaiye 
                                pipeline:[
                                    {
                                        $project: {
                                            fullName: 1,
                                            username: 1,
                                            avatar: 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields:{
                                owner:{
                                    $first: "$owner"
                                }
                            }
                        },
                        {
                            $project: {
                                thumbnail: 1,
                                title: 1,
                                description: 1,
                                duration: 1,
                                viewCount: 1,
                                owner: 1,
                                createdAt: 1
                            }
                        }
                    ],
                    totalCount: [
                        {
                            $count: "total"
                        }
                    ]
                }
            }
        ]
    ): [
        {
            result:[],
            totalCount: []
        }
    ]

    // now we make the tweets query 
    const tweets = (searchType === "all" || searchType === "tweet")
    ? await Tweet.aggregate(
        [
            {
                $match:{
                    isDeleted: false,
                    content:{
                        $regex: search,
                        $options: "i"
                    }
                }
            },
            {
                $facet:{
                    result:[
                        {
                            $sort: {
                                createdAt: -1
                            }
                        },
                        {
                            $skip: skip
                        },
                        {
                            $limit: limit
                        },
                        {
                            // abhi ham tweet me hai toh user ke ander jaa ke tweet ke owner ka data lenge 
                            $lookup:{
                                from: "users",
                                localField:"owner",
                                foreignField: "_id",
                                as: "owner",
                                pipeline:[
                                    {
                                        $project: {
                                            fullName:1,
                                            username:1,
                                            avatar: 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields:{
                                owner: {
                                    $first: "$owner"
                                }
                            }
                        },
                        {
                            $project:{
                                content:1,
                                owner: 1,
                                mentions:1,
                                images:1,
                                likeCount:1,
                                repostCount:1,
                                replyCount:1,
                                viewCount:1,
                                isEdited:1,
                                isPinned:1,
                                createdAt:1
                            }
                        }
                    ],
                    totalCount: [
                        {
                            $count: "total"
                        }
                    ]
                }
            }
        ]
    ):[
        {
            result:[],
            totalCount: []
        }
    ]

    // now we get the toatal count from the each aggregationand if count is not found then we assume it will be zero
    const totalUsers = users[0]?.totalCount[0]?.total || 0;
    const totalVideos = videos[0]?.totalCount[0]?.total ||0;
    const totalTweets = tweets[0]?.totalCount[0]?.total || 0;

    // now we calculate the total result 
    const resultCount = totalUsers + totalVideos + totalTweets;

    // now we save the search history only for the first page
    // when the user goes to the next page, we do not save history again
    // this way, one search creates only one history entry
    // and pagination requests do not create duplicate entries

    if(page ===1 && req.query.suggestions !== "true"){
        // now we search ki same history current user ke history me save hai ya nahi 

        // now we normalize the query 
        const normalizedQuery = query.toLowerCase().trim();

        // now we update the existing history and create history becasue we want ki hamre pass double search history toh na hi ho but i want ki jaisse hi dublicated search history search ho toh pahle ham check karnege uske baad ham us search ho sabse pahle result me show karnege 
        
        await GlobalSearch.findOneAndUpdate(
            {
                user: req.user._id,
                normalizedQuery,
                searchType
            },
            {
                // now we set the updation of the filed ki jo bhi mil gya usse update akr do isme bass  important hai ki ham uska date recet wla save akr rahe hai 
                $set: {
                    // purana content mil gya toh ham bass uska date update karenge 
                    searchedAt: new Date()
                },
                // ager hamne nay content nahi mila toh ham set karnege sare vlaue ko 
                $setOnInsert: {
                    query,
                    normalizedQuery,
                    searchType,
                    user: req.user._id,
                    resultCount,
                    isDeleted: false
                }
            },
            {
                upsert: true,
                // it mease ki ager present nahi ho toh naya create akr denge 
                new: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        )
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                query,
                searchType,
                resultCount,
                users:{
                    results : users[0].results,
                    totalUsers,
                    page,
                    limit,
                    totalPages: Math.ceil(totalUsers / limit),
                    hasNextPage: (page * limit) < totalUsers
                },
                videos :{
                    results: videos[0].results,
                    totalVideos,
                    page,
                    limit,
                    totalPages: Math.ceil(totalVideos / limit),
                    hasNextPage: (page * limit) < totalVideos
                },
                tweets :{
                    results: tweets[0].results,
                    totalTweets,
                    page,
                    limit,
                    totalPages: Math.ceil(totalTweets / limit),
                    hasNextPage: (page * limit) < totalTweets
                } 
            },
            "Global Search Completed Successfully"
        )
    )
})

const getGLobalHistory = asyncHandler(async(req, res) => {
    const {userId} = req.user._id;

    validateObjectId(
        userId,
        "User ID"
    )

    // now we write the code for pagination 
    // pagination code 
    const page = Math.max(
        Number.parseInt(req.query.page) || 1,
        1
    )

    const limit  = Math.min(
        Math.max(
            Number.parseInt(req.query.limit)|| 10,
            1
        ),
        50
    )

    const skip = (page - 1) * limit;

    // now we get the search from the database 
    const searchHistory = await GlobalSearch.find({
        user : userId,
        isDeleted: false
    })
    .sort(
        {
            searchedAt: -1
        }
    )
    .skip(skip)
    .limit(limit)
    .lean()

    if(!searchHistory){
        throw new ApiError(
            404,
            "Search results not found"
        )
    }

    // now we count the total search history 
    const totalHistory = await GlobalSearch.countDocuments({
        user: userId,
        isDeleted: false
    });

    if(!totalHistory){
        throw new ApiError(
            404,
            "Search Count not found"
        )
    }

    return res
    .status(200)
    .json(
        new ApiError(
            200,
            {
                searchHistory,
                page,
                limit,
                totalHistory,
                totalPages : Math.ceil(totalHistory / limit),
                hasNextPage: (page * limit) < totalHistory
            },
            "Global search history fetched Successfully"
        )
    )


})

// now we make the 