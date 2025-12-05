const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');
const upload360 = require('../middleware/upload360Middleware');

const router = express.Router();

// Lấy tất cả đánh giá của một tour (không cần auth)
router.get('/tour/:tourId', reviewController.getReviewsByTour);

// Tạo đánh giá mới (cần auth) + upload ảnh 360 (field: image360)
router.post(
  '/',
  authController.protect,
  upload360.array('image360', 10), // cho phép tối đa 10 ảnh 360 mỗi review
  reviewController.createReview
);

// Cập nhật đánh giá (cần auth) + có thể thay ảnh 360
router.patch(
  '/:reviewId',
  authController.protect,
  upload360.array('image360', 10),
  reviewController.updateReview
);

// Xóa đánh giá (cần auth)
router.delete('/:reviewId', authController.protect, reviewController.deleteReview);

module.exports = router;

