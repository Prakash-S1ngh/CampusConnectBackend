const cloudinary = require('cloudinary').v2;

require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (filePath, folderName='campus') => {
    try {
       
        if (!folderName || typeof folderName !== 'string') {
            throw new Error('Invalid folder name provided');
        }
        const result = await cloudinary.uploader.upload(filePath, {
            folder: folderName, // Use the provided folder name dynamically
        });

        console.log('File uploaded to Cloudinary:', result.secure_url);
        return result;
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw error;
    }
};

module.exports = uploadOnCloudinary;


