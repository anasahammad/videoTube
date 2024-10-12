import {Router} from "express"
import { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateUserDetails, updateUserAvatar } from "../controllers/user.controller.js"
import {upload} from "../middlewares/multer.middleware.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"
const router = Router()

router.route("/register").post(upload.fields([
    {
        name: "avatar",
        maxCount: 1
    },
    {
        name: "coverImage",
        maxCount: 1
    }
]),registerUser)

router.route("/login").post(loginUser)
//secure
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").patch(verifyJWT, changeCurrentPassword)

router.route("/current-user").get(verifyJWT ,getCurrentUser)

router.route("/update-details").patch(updateUserDetails)
router.route("/update-avatar").patch(updateUserAvatar)



export default router