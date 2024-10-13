
import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";
import { extractPublicId } from 'cloudinary-build-url'
 // Configuration
 cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_SECRET // Click 'View API Keys' above to copy your API secret
});


const uploadOnCloudinary = async (localFilePath)=>{
    try {
        if(!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type : "auto"
        })

        //  console.log("file is uploaded on cloudinary ", response.url);

        fs.unlinkSync(localFilePath)
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath)
        return null
    }
}


const deleteOnCloudinary = async (url) => {
    if (!url) {
        return null
    }
    const publicId = extractPublicId(url)
    await cloudinary.uploader.destroy(publicId,function(res){return res});

}

export {uploadOnCloudinary, deleteOnCloudinary}