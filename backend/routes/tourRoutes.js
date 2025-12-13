const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');

const router = express.Router();

// Public routes
router.get('/destinations', tourController.getDestinations);
router.get('/destination/:destination', tourController.getToursByDestination);

// Admin routes - MUST be before /:id routes to avoid route conflicts
router.get('/admin/deleted', authController.protect, authController.restrictTo('admin'), tourController.getDeletedTours);
router.patch('/:id/restore', authController.protect, authController.restrictTo('admin'), tourController.restoreTour);

router
    .route('/')
    .get(tourController.getAllTours)
    .post(authController.protect, authController.restrictTo('admin'), tourController.createTour);

router
    .route('/:id')
    .get(tourController.getTour)
    .patch(authController.protect, authController.restrictTo('admin'), tourController.updateTour)
    .delete(authController.protect, authController.restrictTo('admin'), tourController.deleteTour);

module.exports = router;
