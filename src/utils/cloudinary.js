import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";

cloudinary.config({
    cloud_name: "dxyex1ajo",
    api_key: 971316559521243,
    api_secret:"_6mSrs4MFvB0SA2vI-xaad-clyk"
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });
        console.log("File uploaded to Cloudinary:", response.url);

        return response;
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        fs.unlinkSync(localFilePath);

        return null;
    }
};

export { uploadOnCloudinary };
