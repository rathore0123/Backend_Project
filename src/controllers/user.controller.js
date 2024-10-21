import asyncHandler from '../utils/asyncHandler.js'
import ApiError from "../utils/ApiError.js"
import jwt from "jsonwebtoken"
import { User } from "../models/User.model.js"
import ApiResponse from "../utils/ApiResponse.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"

const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false })
        return ({
            accessToken,
            refreshToken
        })
    } catch (error) {
        throw new ApiError(500, "something went wrong when generating accesstoken and refreshtoken")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUsername = await User.findOne({ username })
    if (existedUsername) {
        throw new ApiError(409, "username already exist");
    }
    const existedEmail = await User.findOne({ email })
    if (existedEmail) {
        throw new ApiError(409, "Email already registered");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath;

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar localpath is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "avatar is required");
    }

    const user = await User.create({
        username: username.toLowerCase(),
        fullName,
        email,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        password
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "Internal Server Error While Registering the User!!!")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {

    const { username, password, email } = req.body
    if (!(username || email)) {
        throw new ApiError(409, "username or email must required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (!user) {
        throw new ApiError(404, "user not found with the given usename or email")
    }

    const isPasswordValidated = user.isPasswordCorrect(password);
    if (!isPasswordValidated) {
        throw new ApiError(401, "Invalid user credentials")
    }

    const { refreshToken, accessToken } = await generateAccessTokenAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshtoken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "user logged In successfully"
            )
        )
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findOneAndUpdate(
        req.user?._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }

    )
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "logOut Successfully")
        )
})

const refreshAccessToken = asyncHandler(async(req, res) =>{
    const incomingRefreshToiken = req.cookies.refreshAccessToken || req.body.refreshAccessToken
    if(!incomingRefreshToiken) {
        throw new ApiError(401, "unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToiken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id);
        if(!user) {
            throw new ApiError(404, "invalid refresh token");
        }
    
        if(incomingRefreshToiken !== user?.refreshAccessToken) {
            throw new ApiError(404, "refresh token is expired or invalid");
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken } = await generateAccessTokenAndRefreshToken();
    
        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    "user": user,
                    "accessToken": accessToken,
                    "refreshToken": newRefreshToken
                },
                "new refresh token generated successfully"
                
                
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refresh token")
    }

})

export { registerUser, loginUser, logoutUser, refreshAccessToken }