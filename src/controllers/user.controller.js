import {asyncHandler} from "../utils/assyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {deleteOnCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiRespones.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


const generateAccessTokenAndRefreshToken = async (userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generationg access or refresh token")
    }
}

const registerUser = asyncHandler(async (req, res)=>{
    // step 1: get user details from the frontend
 const {username, fullName, email, password} = req.body;
//  console.log("email: ", email);
 
   // step 2: Validation- not empty
 if(
    [username, fullName, email, password].some((field)=> field?.trim() === "")
 ){
    throw new ApiError(400, "All fields are required")
    
 }

   // step 3: check user already exist : username, email
 const existedUser = await User.findOne({
    $or : [{ username }, { email }]
 })

 if(existedUser){
    throw new ApiError(409, "User with email and username is already exist")
 }

   // step 4: check for images, check for avatar from the multer
 const avatarLocalPath = req.files?.avatar[0]?.path;
//  const coverImageLocalPath = req.files?.coverImage[0]?.path;

let coverImageLocalPath;

if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
    coverImageLocalPath = req.files.coverImage[0].path
}
 if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file is required")
 }

   // step 5: upload them to cloudinary, avatar, coverimage
   const avatar =  await uploadOnCloudinary(avatarLocalPath)
   const coverImage =  await uploadOnCloudinary(coverImageLocalPath)

   if(!avatar){
    throw new ApiError(400, "Avatar file is required")
   }

     // step 6: create user object - create entry in the db
  const user =  await User.create({
    email, 
    fullName,
    avatar : avatar.url,
    coverImage : coverImage?.url || "",
    username : username.toLowerCase(),
    password
   })
 
     // step 7: remove password and refreshToken fields from the response
   const createdUser = await User.findById(user._id).select(
     "-password -refreshToken"
   )

   if(!createdUser){
    throw new ApiError(500, "Something went wrong while registering user")
   }

     // step 8: return response
     return res.status(201).json(
         new ApiResponse(200, createdUser, "User registered Successfully")
     )
})

const loginUser = asyncHandler(async (req, res)=>{
    
    const {username, email, password} = req.body;
    if(!(username || email)){
        throw new ApiError(400, "Username or email is required")
}
   
 const user = await User.findOne({
    $or : [{ email }, { username }]
 })

 if(!user){
    throw new ApiError(404, "User does not exist")
 }

 const isPasswordValid = await user.isPasswordCorrect(password)
 if(!isPasswordValid){
    throw new ApiError(401, "Invalid User Credentials")
 }


 const {accessToken, refreshToken} = await generateAccessTokenAndRefreshToken(user._id)

 const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

 const options = {
    httpOnly : true,
    secure : true
 }

 return res.status(200)
 .cookie("accessToken", accessToken, options)
 .cookie("refreshToken", refreshToken, options)
 .json(new ApiResponse(200, {
    user: loggedInUser,
    accessToken,
    refreshToken
},
"User logged in successfully"
))

 
})

const logoutUser = asyncHandler(async(req, res)=>{
    await User.findByIdAndUpdate(req.user._id, {
        $unset : {
            refreshToken : 1
        }
        
    },
    {
        new : true
    }
)

    const options = {
        httpOnly : true,
        secure : true
     }

     return res
     .status(200)
     .clearCookie("accessToken", options)
     .clearCookie("refreshToken", options)
     .json(new ApiResponse(200, {}, "Logout Successful"))
})

const refreshAccessToken = asyncHandler(async(req, res)=>{
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if(!incomingRefreshToken){
    throw new ApiError(401, "Unauthorized Request")
  }

 try {
   const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
 
   const user = await User.findById(decodedToken._id)
   if(!user){
     throw new ApiError(401, "Invalid refresh Token")
   }
 
   if (incomingRefreshToken !== user.refreshToken) {
     throw new ApiError(401, "Refresh Token is expired or used")
   } 
 
   const options = {
     httpOnly : true,
     secure : true
  }
 
  const {accessToken, newRefreshToken} = await generateAccessTokenAndRefreshToken(user._id)
 
  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", newRefreshToken, options)
  .json(new ApiRespones(200, {accessToken, refreshToken: newRefreshToken }, "Access Token Refreshed"))
 } catch (error) {
   throw new ApiError(401, error?.message || "Invalid refresh token")
 }

})

const changeCurrentPassword = asyncHandler(async(req, res)=>{
  const {oldPassword, newPassword} = req.body;

  const user = await User.findById(req?.user._id)

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect){
    throw new ApiError(400, "Invalid Old Password")
  }

  user.password = newPassword
  await user.save({validateBeforeSave: false})

  return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"))

})

const getCurrentUser = asyncHandler(async(req, res)=>{
  return res.
  status(200).json(new ApiResponse(200, req.user, "Current User fetched Successfully"))
})

const updateUserDetails = asyncHandler(async(req, res)=>{
  const {fullName, email} = req.body;

  if(!fullName || !email){
    throw new ApiError(400, "All fields are required")
  }

  const user = await User.findByIdAndUpdate(req.user._id, {
    $set: {
       fullName,
       email
    }
  }, {new: true}).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200, user, "Account Details Updated Successfully"))


})



const updateUserAvatar = asyncHandler(async(req, res)=>{

  const avatarLocalPath = req.file?.path
  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file is missing")

  }



    const deleteAvatar = await deleteOnCloudinary(req.user?.avatar)
    
   

  
  

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if(!avatar.url){
    throw new ApiError(400, "Error while uploading on avatar")
  }

  const updateAvatar = await User.findByIdAndUpdate(req?.user._id, {
    $set: {
      avatar: avatar.url
    }
  }, {new: true}).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200, updateAvatar, "Avatar Updated Successfully"))
})

//same as coverImage update


const getUserChannel = asyncHandler(async(req, res)=>{
  const {username} = req.params;

  if(!username.trim()){
    throw new ApiError(400, "username  not found")
  }

  const channel = await User.aggregate([{
     $match: {
       username : username?.toLowerCase()
     }
  },
  {
    $lookup : {
      from: "subscriptions",
      localField: "_id",
      foreignField: "channel",
      as: "subscribers"
    }
  },
  {
    $lookup : {
      from: "subscriptions",
      localField: "_id",
      foreignField: "subscriber",
      as: "subscribedTo"
    }
  },

  {
    $addFields: {
      subscribersCount : {
        $size: "$subscribers"
      },

      channelSubscribedToCount: {
        $size: "$subscribedTo"
      },
      isSubsCribed: {
        $cond: {
          if : {$in: [req.user?._id, "$subscribers.subscriber"]},
          then: true,
          else: false
        }
      }

    }
  },
  {
    $project: {
      fullName: 1,
      username: 1,
      avatar: 1,
      coverImage: 1,
      email: 1,
      subscribersCount : 1,
      channelSubscribedToCount : 1,
      isSubsCribed : 1
    }
  }

])

if(!channel.length){
  throw new ApiError(404, "Channel doesn't exist")
}

return res
.status(200)
.json( new ApiResponse(200, channel[0], "User Channel fetched Successfully"))
})


const getWatchHistory = asyncHandler(async(req, res)=>{
  const user = User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id)
      }
    },

    {
      $lookup:{
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
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
            $addFields: {
              owner: {
                $first: "$owner"
              }
            }
          }
        ]
      }
    }
  ])

  return res
  .status(200)
  .json( new ApiResponse(200, user[0].watchHistory, "Watch History fetched successfully"))
})
export {registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateUserDetails, updateUserAvatar, getUserChannel, getWatchHistory}