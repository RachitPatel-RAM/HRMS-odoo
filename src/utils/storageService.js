const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configure Cloudinary (kept for reference or future re-enabling)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer (Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * Uploads a file buffer to Local Storage (Bypassing Cloudinary to fix Signature Errors)
 * @param {Buffer} buffer - File buffer
 * @param {string} folder - Folder name (unused in local, but kept for interface)
 * @returns {Promise<string>} - Relative URL of uploaded image
 */
const uploadToCloudinary = (buffer, folder = 'hrms_uploads') => {
    return new Promise((resolve, reject) => {
        try {
            const fileName = `avatar_${Date.now()}.png`;
            // Ensure path is correct relative to src/utils -> public/uploads
            const uploadDir = path.join(__dirname, '../../public/uploads');

            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const filePath = path.join(uploadDir, fileName);

            fs.writeFile(filePath, buffer, (err) => {
                if (err) {
                    console.error("Local Save Error:", err);
                    return reject(err);
                }
                console.log("Saved to local storage:", fileName);
                // Return URL accessible via static middleware
                resolve(`/uploads/${fileName}`);
            });
        } catch (e) {
            reject(e);
        }
    });
};

module.exports = { upload, uploadToCloudinary };
