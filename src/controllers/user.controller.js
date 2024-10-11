import {asyncHandler} from "../utils/assyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiRespones.js";

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
    if(!username || !email){
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
        .json(
            new ApiRespones(200, {
                user: loggedInUser,
                accessToken,
                refreshToken
            },
            "User logged in successfully"
        )
        )
})

const logoutUser = asyncHandler(async(req, res)=>{
    await User.findByIdAndUpdate(req.user._id, {
        $set : {
            refreshToken : undefined
        },
        {new : true}
    })

    const options = {
        httpOnly : true,
        secure : true
     }

     return res
     .status(200)
     .clearCookie("accessToken", options)
     .clearCookie("refreshToken", options)
     .json(new ApiRespones(200, {}, "Logout Successful"))
})
export {registerUser, loginUser, logoutUser}