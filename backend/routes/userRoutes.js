const express = require('express');
const multer = require('multer');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// ============ PROTECTED ROUTES ============
// Tất cả routes dưới đây đều cần authentication
router.use(authController.protect);

// ============ ADMIN ONLY ROUTES ============
// Đặt các routes admin lên đầu để tránh conflict với /:id

// Admin: Lấy danh sách tất cả users
router.get('/all', authController.restrictTo('admin'), userController.getAllUsers);

// Profile routes
router.get('/profile', userController.getProfile);
router.patch('/profile', userController.updateProfile);

// Avatar upload - Đặt trước route /:id để tránh conflict
router.post('/avatar', (req, res, next) => {
    console.log('Avatar upload route hit');
    console.log('Request method:', req.method);
    console.log('Request path:', req.path);
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Has file:', !!req.file);
    
    upload.single('avatar')(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err);
            // Multer error handling
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        status: 'fail',
                        message: 'Kích thước file không được vượt quá 5MB!'
                    });
                }
                return res.status(400).json({
                    status: 'fail',
                    message: `Lỗi upload: ${err.message}`
                });
            }
            // Other errors (fileFilter, etc.)
            return res.status(400).json({
                status: 'fail',
                message: err.message || 'Lỗi khi upload file!'
            });
        }
        console.log('File uploaded successfully:', req.file?.filename);
        next();
    });
}, userController.uploadAvatar);

// Password routes
router.patch('/update-password', userController.updatePassword);

// Account management
router.delete('/delete-account', userController.deleteAccount);

// User stats
router.get('/stats', userController.getUserStats);

// Admin: Cập nhật thông tin user
router.patch('/:id', authController.restrictTo('admin'), userController.updateUser);

// Admin: Xóa user
router.delete('/:id', authController.restrictTo('admin'), userController.deleteUser);

module.exports = router;

