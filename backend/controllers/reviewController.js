const Review = require('../models/Review');
const Tour = require('../models/Tour');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryService');

// Tạo đánh giá mới
exports.createReview = async (req, res) => {
    try {
        const { tour, review, rating } = req.body;

        // Kiểm tra tour có tồn tại không
        const tourExists = await Tour.findById(tour);
        if (!tourExists) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy tour'
            });
        }

        // Kiểm tra user đã đánh giá tour này chưa
        const existingReview = await Review.findOne({
            tour: tour,
            user: req.user._id
        });

        if (existingReview) {
            return res.status(400).json({
                status: 'fail',
                message: 'Bạn đã đánh giá tour này rồi'
            });
        }

        // Nếu có upload ảnh 360 thì upload lên Cloudinary trước (hỗ trợ nhiều ảnh, tối đa 10 ảnh)
        let image360Urls = [];
        if (req.files && req.files.length > 0) {
            try {
                for (const file of req.files) {
                    const url = await uploadToCloudinary(file, 'reviews/360-images');
                    image360Urls.push(url);
                }

                // Giới hạn tối đa 10 ảnh cho mỗi đánh giá
                if (image360Urls.length > 10) {
                    image360Urls = image360Urls.slice(0, 10);
                }
            } catch (uploadErr) {
                return res.status(400).json({
                    status: 'fail',
                    message: uploadErr.message || 'Không thể upload ảnh 360 lên Cloudinary'
                });
            }
        }

        // Tạo đánh giá mới
        const newReview = await Review.create({
            review,
            rating,
            tour,
            user: req.user._id,
            image360Urls,
            image360Url: image360Urls[0] || undefined
        });

        // Thêm review vào tour
        if (!tourExists.ratings) {
            tourExists.ratings = [];
        }
        tourExists.ratings.push(newReview._id);

        // Tính toán averageRating
        const allReviews = await Review.find({ tour: tour });
        const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
        tourExists.averageRating = (totalRating / allReviews.length).toFixed(1);

        await tourExists.save();

        res.status(201).json({
            status: 'success',
            data: {
                review: newReview
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

// Lấy tất cả đánh giá của một tour
exports.getReviewsByTour = async (req, res) => {
    try {
        const { tourId } = req.params;

        const reviews = await Review.find({ tour: tourId })
            .populate('user', 'name')
            .sort({ createdAt: -1 });

        // Tính rating trung bình
        const averageRating = reviews.length > 0
            ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
            : 0;

        res.status(200).json({
            status: 'success',
            results: reviews.length,
            averageRating,
            data: {
                reviews
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

// Xóa đánh giá
exports.deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;

        // Không populate để so sánh ID trực tiếp
        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy đánh giá'
            });
        }

        // Kiểm tra quyền: chỉ người tạo hoặc admin mới được xóa
        if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'fail',
                message: 'Bạn không có quyền xóa đánh giá này'
            });
        }

        // Xóa review khỏi tour
        await Tour.findByIdAndUpdate(
            review.tour,
            { $pull: { ratings: reviewId } }
        );

        await Review.findByIdAndDelete(reviewId);

        // Tính toán lại averageRating
        const remainingReviews = await Review.find({ tour: review.tour });
        const tour = await Tour.findById(review.tour);

        if (remainingReviews.length > 0) {
            const totalRating = remainingReviews.reduce((sum, r) => sum + r.rating, 0);
            tour.averageRating = (totalRating / remainingReviews.length).toFixed(1);
        } else {
            tour.averageRating = 0;
        }

        await tour.save();

        res.status(200).json({
            status: 'success',
            message: 'Đánh giá đã được xóa'
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

// Cập nhật đánh giá
exports.updateReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { review, rating } = req.body;

        const existingReview = await Review.findById(reviewId);
        if (!existingReview) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy đánh giá'
            });
        }

        // Kiểm tra quyền
        if (existingReview.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'fail',
                message: 'Bạn không có quyền cập nhật đánh giá này'
            });
        }

        // Chuẩn bị danh sách ảnh hiện tại
        let image360Urls = Array.isArray(existingReview.image360Urls) && existingReview.image360Urls.length > 0
            ? [...existingReview.image360Urls]
            : existingReview.image360Url
            ? [existingReview.image360Url]
            : [];

        // Xử lý xóa một số ảnh 360 cụ thể (nếu có removeImageUrls từ client)
        let removeImageUrls = req.body.removeImageUrls;
        if (removeImageUrls) {
            try {
                if (typeof removeImageUrls === 'string') {
                    // Có thể là JSON string hoặc một URL đơn
                    try {
                        removeImageUrls = JSON.parse(removeImageUrls);
                    } catch (parseErr) {
                        removeImageUrls = [removeImageUrls];
                    }
                }

                if (!Array.isArray(removeImageUrls)) {
                    removeImageUrls = [removeImageUrls];
                }

                const toRemoveSet = new Set(removeImageUrls);
                const remaining = [];

                for (const url of image360Urls) {
                    if (url && toRemoveSet.has(url)) {
                        try {
                            await deleteFromCloudinary(url);
                        } catch (deleteErr) {
                            console.error('Error deleting review image from Cloudinary:', deleteErr);
                        }
                    } else if (url) {
                        remaining.push(url);
                    }
                }

                image360Urls = remaining;
            } catch (e) {
                console.error('Error processing removeImageUrls:', e);
            }
        }

        // Xử lý upload / thay đổi ảnh 360 nếu có file mới (nhiều ảnh, tối đa 10 ảnh)
        if (req.files && req.files.length > 0) {
            try {
                // Upload các ảnh mới và thêm vào danh sách hiện có
                for (const file of req.files) {
                    const url = await uploadToCloudinary(file, 'reviews/360-images');
                    image360Urls.push(url);
                }

                // Giới hạn tối đa 10 ảnh cho mỗi đánh giá
                if (image360Urls.length > 10) {
                    image360Urls = image360Urls.slice(0, 10);
                }
            } catch (uploadErr) {
                return res.status(400).json({
                    status: 'fail',
                    message: uploadErr.message || 'Không thể upload ảnh 360 lên Cloudinary'
                });
            }
        }

        // Chuẩn bị dữ liệu cập nhật, đảm bảo xóa hẳn image360Url khi không còn ảnh nào
        const updateData = {
            review,
            rating,
            image360Urls
        };

        if (image360Urls && image360Urls.length > 0) {
            updateData.image360Url = image360Urls[0];
        } else {
            // Sử dụng null để Mongoose ghi đè giá trị cũ, tránh giữ lại URL cũ
            updateData.image360Url = null;
        }

        const updatedReview = await Review.findByIdAndUpdate(
            reviewId,
            updateData,
            { new: true, runValidators: true }
        );

        // Tính toán lại averageRating
        const allReviews = await Review.find({ tour: existingReview.tour });
        const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
        const tour = await Tour.findById(existingReview.tour);
        tour.averageRating = (totalRating / allReviews.length).toFixed(1);
        await tour.save();

        res.status(200).json({
            status: 'success',
            data: {
                review: updatedReview
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

