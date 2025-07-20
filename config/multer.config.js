const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Ensure 'uploads/' directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Debugging log
console.log("📂 Multer configuration loaded...");

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log("🟢 File received for upload:", file.originalname);
        const uploadPath = path.join(__dirname, '../uploads');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const filename = file.fieldname + '-' + Date.now() + path.extname(file.originalname);
        console.log("📝 Saving file as:", filename);
        cb(null, filename);
    }
});

// File type validation
const fileFilter = (req, file, cb) => {
    console.log("🔍 Checking file type:", file.mimetype);
    const allowedTypes = /jpeg|jpg|png|gif/;
    const isValidExt = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const isValidMime = allowedTypes.test(file.mimetype);

    if (isValidExt && isValidMime) {
        console.log("✅ File type valid:", file.originalname);
        cb(null, true);
    } else {
        console.log("❌ Invalid file type:", file.originalname);
        cb(null, false); // Gracefully reject without throwing
    }
};

// Multer instance
const upload = multer({
    storage: storage,
    limits: { fileSize: 1 * 1024 * 1024 }, // 1MB limit
    fileFilter: fileFilter
});

module.exports = upload;