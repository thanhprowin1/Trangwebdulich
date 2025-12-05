const multer = require('multer');
const path = require('path');

// Cấu hình multer để lưu file vào memory (buffer) để upload lên S3
const storage = multer.memoryStorage();

// Kiểm tra file type - chỉ chấp nhận ảnh 360 (equirectangular)
const fileFilter = (req, file, cb) => {
    // Chấp nhận các định dạng ảnh phổ biến cho ảnh 360
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận file ảnh 360 (jpeg, jpg, png)!'));
    }
};

// Cấu hình multer cho ảnh 360 (phù hợp với Cloudinary free plan)
const upload360 = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // Giới hạn 10MB cho ảnh 360 (Cloudinary free plan)
    },
    fileFilter: fileFilter
});

module.exports = upload360;








