import {asyncHandler} from "../utils/assyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiRespones.js";

const registerUser = asyncHandler(async (req, res)=>{
    // step 1: get user details from the frontend
 const {username, fullName, email, password} = req.body;
 console.log("email: ", email);
 
   // step 2: Validation- not empty
 if(
    [username, fullName, email, password].some((field)=> field?.trim() === "")
 ){
    throw new ApiError(400, "All fields are required")
    
 }

   // step 3: check user already exist : username, email
 const existedUser = User.findOne({
    $or : [{ username }, { email }]
 })

 if(existedUser){
    throw new ApiError(409, "User with email and username is already exist")
 }

   // step 4: check for images, check for avatar from the multer
 const avatarLocalPath = req.files?.avatar[0]?.path;
 const coverImageLocalPath = req.files?.coverImage[0]?.path;

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
     return res.status(201).json({
        new ApiResponse(200, createdUser, "User registered Successfully")
     })
})

export {registerUser}