const express = require('express');
const extensionController = require('../controllers/extensionController');
const authController = require('../controllers/authController');

const router = express.Router();

// Middleware để kiểm tra user đã login
router.use(authController.protect);

// Routes cho user - KHÔNG cho phép admin
router.post('/:bookingId/request', authController.restrictTo('user'), extensionController.requestExtension);
router.get('/my-extensions', authController.restrictTo('user'), extensionController.getMyExtensions);
router.delete('/:extensionId/cancel', authController.restrictTo('user'), extensionController.cancelExtension);

// Routes cho admin
router.use(authController.restrictTo('admin'));
router.get('/', extensionController.getAllExtensions);
router.patch('/:extensionId/approve', extensionController.approveExtension);
router.patch('/:extensionId/reject', extensionController.rejectExtension);

module.exports = router;

