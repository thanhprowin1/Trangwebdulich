const express = require('express');
const upload = require('../middleware/uploadMiddleware');
const upload360 = require('../middleware/upload360Middleware');
const authController = require('../controllers/authController');
const { uploadToS3 } = require('../utils/s3Service');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryService');
const Tour = require('../models/Tour');

const router = express.Router();

// Route upload single image (chỉ admin mới được upload)
router.post('/image', 
    authController.protect, 
    authController.restrictTo('admin'), 
    upload.single('image'), 
    (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Vui lòng chọn file ảnh!'
                });
            }

            // Trả về URL của ảnh đã upload
            const imageUrl = `/uploads/${req.file.filename}`;
            
            res.status(200).json({
                status: 'success',
                data: {
                    imageUrl: imageUrl,
                    filename: req.file.filename
                }
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }
);

// Route upload multiple images (tối đa 10 ảnh)
router.post('/images', 
    authController.protect, 
    authController.restrictTo('admin'), 
    upload.array('images', 10), 
    (req, res) => {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Vui lòng chọn ít nhất 1 file ảnh!'
                });
            }

            // Trả về mảng URL của các ảnh đã upload
            const imageUrls = req.files.map(file => `/uploads/${file.filename}`);
            
            res.status(200).json({
                status: 'success',
                data: {
                    imageUrls: imageUrls,
                    count: req.files.length
                }
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }
);

// Route upload ảnh 360 lên Cloudinary (chỉ admin)
router.post('/image360', 
    authController.protect, 
    authController.restrictTo('admin'), 
    upload360.single('image360'), 
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Vui lòng chọn file ảnh 360!'
                });
            }

            // Kiểm tra Cloudinary credentials
            if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Cloudinary chưa được cấu hình. Vui lòng kiểm tra file config.env!'
                });
            }

            // Upload lên Cloudinary
            const image360Url = await uploadToCloudinary(req.file, '360-images');
            
            res.status(200).json({
                status: 'success',
                data: {
                    image360Url: image360Url
                }
            });
        } catch (error) {
            console.error('Error uploading 360 image to Cloudinary:', error);
            res.status(500).json({
                status: 'error',
                message: error.message || 'Có lỗi xảy ra khi upload ảnh 360!'
            });
        }
    }
);

// Route xóa ảnh 360 từ Cloudinary (không cần tourId - cho tour chưa lưu)
router.delete('/image360', 
    authController.protect, 
    authController.restrictTo('admin'), 
    async (req, res) => {
        try {
            // Lấy image360Url từ query parameter
            let image360Url = req.query.image360Url;
            
            if (image360Url) {
                image360Url = decodeURIComponent(image360Url);
            }

            console.log('Delete 360 image (no tourId) - image360Url:', image360Url);

            if (!image360Url) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Vui lòng cung cấp URL ảnh 360 cần xóa!'
                });
            }

            // Kiểm tra Cloudinary credentials
            if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Cloudinary chưa được cấu hình. Vui lòng kiểm tra file config.env!'
                });
            }

            // Xóa ảnh từ Cloudinary
            try {
                console.log('Attempting to delete image from Cloudinary:', image360Url);
                await deleteFromCloudinary(image360Url);
                console.log('Successfully deleted image from Cloudinary');
            } catch (error) {
                console.warn('Warning: Could not delete from Cloudinary:', error.message);
                console.error('Full error:', error);
                // Vẫn trả về success nếu không xóa được (ảnh có thể đã bị xóa trước đó)
            }

            res.status(200).json({
                status: 'success',
                message: 'Đã xóa ảnh 360° từ Cloudinary thành công!'
            });
        } catch (error) {
            console.error('Error deleting 360 image:', error);
            res.status(500).json({
                status: 'error',
                message: error.message || 'Có lỗi xảy ra khi xóa ảnh 360!'
            });
        }
    }
);

// Route xóa ảnh 360 từ Cloudinary và cập nhật tour (chỉ admin)
router.delete('/image360/:tourId', 
    authController.protect, 
    authController.restrictTo('admin'), 
    async (req, res) => {
        try {
            const { tourId } = req.params;
            // Lấy image360Url từ query parameter hoặc body và decode
            let image360Url = req.query.image360Url || req.body.image360Url;
            const forceDelete = req.query.force === 'true';
            
            if (image360Url) {
                image360Url = decodeURIComponent(image360Url);
            }

            console.log('Delete request - tourId:', tourId);
            console.log('Delete request - image360Url:', image360Url);

            if (!image360Url) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Vui lòng cung cấp URL ảnh 360 cần xóa!'
                });
            }

            // Kiểm tra Cloudinary credentials
            if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Cloudinary chưa được cấu hình. Vui lòng kiểm tra file config.env!'
                });
            }

            // Tìm tour
            const tour = await Tour.findById(tourId);
            if (!tour) {
                return res.status(404).json({
                    status: 'fail',
                    message: 'Không tìm thấy tour!'
                });
            }

            // Kiểm tra tour có ảnh 360 này không (trừ trường hợp force delete)
            if (!forceDelete && tour.image360Url !== image360Url) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'URL ảnh 360 không khớp với tour!'
                });
            }

            // Xóa ảnh từ Cloudinary
            try {
                console.log('Attempting to delete image from Cloudinary:', image360Url);
                await deleteFromCloudinary(image360Url);
                console.log('Successfully deleted image from Cloudinary');
            } catch (error) {
                // Nếu lỗi xóa trên Cloudinary, vẫn tiếp tục xóa trong database
                console.warn('Warning: Could not delete from Cloudinary:', error.message);
                console.error('Full error:', error);
            }

            // Cập nhật tour: xóa image360Url
            if (tour.image360Url) {
                tour.image360Url = null;
                await tour.save();
            }

            res.status(200).json({
                status: 'success',
                message: 'Đã xóa ảnh 360° thành công!',
                data: {
                    tour: tour
                }
            });
        } catch (error) {
            console.error('Error deleting 360 image:', error);
            res.status(500).json({
                status: 'error',
                message: error.message || 'Có lỗi xảy ra khi xóa ảnh 360!'
            });
        }
    }
);

module.exports = router;

