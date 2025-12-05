const express = require('express');
const bookingController = require('../controllers/bookingController');
const paymentController = require('../controllers/paymentController');
const authController = require('../controllers/authController');

const router = express.Router();

// Public route for popular tours
router.get('/popular-tours', bookingController.getPopularTours);

// Callback routes - KHÔNG cần authentication
router.get('/payment/momo-return', paymentController.handleMoMoReturn); // Redirect sau khi thanh toán MoMo
router.post('/payment/momo-notify', paymentController.handleMoMoNotify); // Webhook từ MoMo
router.get('/payment/vnpay-return', paymentController.handleVNPayReturn); // Redirect sau thanh toán VNPay

// Protected routes
router.use(authController.protect);

// Route hủy đơn - PHẢI đặt TRƯỚC tất cả route có /:id để Express match đúng
router.patch('/cancel/:id', (req, res, next) => {
    console.log('Route /cancel/:id matched!', req.params.id);
    next();
}, bookingController.cancelMyBooking); // User hủy đơn của chính họ

// Payment routes - PHẢI đặt TRƯỚC route /:id
router.get('/payment/:id', paymentController.createPayment); // Lấy thông tin thanh toán
router.post('/payment/:id/process', paymentController.processPayment); // Xử lý thanh toán
router.get('/payment/:id/status', paymentController.getPaymentStatus); // Kiểm tra trạng thái thanh toán

// Stats endpoints (admin only)
router.get('/stats/revenue', authController.restrictTo('admin'), bookingController.getRevenueStats);
router.get('/stats/popular', authController.restrictTo('admin'), bookingController.getPopularTours);

router.get('/my-bookings', bookingController.getMyBookings);
router.post('/', bookingController.createBooking);
router.get('/', authController.restrictTo('admin'), bookingController.getAllBookings);
router.patch('/:id', authController.restrictTo('admin'), bookingController.updateBookingStatus);

module.exports = router;
