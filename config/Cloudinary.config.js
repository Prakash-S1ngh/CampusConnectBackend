const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload file to Cloudinary
const uploadOnCloudinary = async (filePath, folderName = 'campus') => {
    try {
        if (!folderName || typeof folderName !== 'string') {
            throw new Error('Invalid folder name provided');
        }

        const result = await cloudinary.uploader.upload(filePath, {
            folder: folderName,
        });

        console.log('File uploaded to Cloudinary:', result.secure_url);
        return result;
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw error;
    }
};

// Extract public_id from Cloudinary URL
const extractPublicId = (url) => {
    const parts = url.split('/');
    const fileName = parts[parts.length - 1];
    const publicId = fileName.split('.')[0]; // Remove extension
    return `${parts[parts.length - 2]}/${publicId}`; // e.g., campus/filename
};

// Delete file from Cloudinary
const deleteFromCloudinary = async (public_id) => {
    try {
      // Try image first
      let result = await cloudinary.uploader.destroy(public_id, {
        resource_type: "image",
      });
  
      // If not found or not deleted, try video
      if (result.result !== "ok" && result.result !== "not found") {
        result = await cloudinary.uploader.destroy(public_id, {
          resource_type: "video",
        });
      }
  
      console.log("Cloudinary delete result:", result);
      return result;
    } catch (error) {
      console.error("Error deleting from Cloudinary:", error);
      throw error;
    }
  };

module.exports = {
    uploadOnCloudinary,
    deleteFromCloudinary,
    extractPublicId
};