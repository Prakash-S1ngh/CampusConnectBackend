const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Ensure 'uploads/' directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Debugging log to check if multer is even being used
console.log("📂 Multer configuration loaded...");

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log("🟢 File received for upload:", file.originalname); // ✅ Debugging
        const uploadPath = path.join(__dirname, '../uploads');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        console.log("📝 Saving file as:", file.fieldname + '-' + Date.now() + path.extname(file.originalname)); // ✅ Debugging
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// File type validation
const fileFilter = (req, file, cb) => {
    console.log("🔍 Checking file type:", file.mimetype); // ✅ Debugging
    const allowedTypes = /jpeg|jpg|png|gif/;
    const isValidExt = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const isValidMime = allowedTypes.test(file.mimetype);

    if (isValidExt && isValidMime) {
        console.log("✅ File type valid:", file.originalname);
        cb(null, true);
    } else {
        console.log("❌ Invalid file type:", file.originalname);
        cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed!'));
    }
};

// Multer instance
const upload = multer({
    storage: storage,
    limits: { fileSize: 1 * 1024 * 1024 }, // 1MB file limit
    fileFilter: fileFilter
});

module.exports = upload;