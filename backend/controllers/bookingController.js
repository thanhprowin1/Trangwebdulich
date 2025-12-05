const Booking = require('../models/Booking');
const Tour = require('../models/Tour');
const mongoose = require('mongoose');

// Helper function để validate ObjectId
const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

exports.createBooking = async (req, res) => {
    try {
        // Validate startDate not in the past
        if (!req.body.startDate) {
            return res.status(400).json({
                status: 'fail',
                message: 'Vui lòng chọn ngày khởi hành'
            });
        }
        const startDate = new Date(req.body.startDate);
        if (isNaN(startDate.getTime())) {
            return res.status(400).json({
                status: 'fail',
                message: 'Ngày khởi hành không hợp lệ'
            });
        }
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (startDate < startOfToday) {
            return res.status(400).json({
                status: 'fail',
                message: 'Ngày khởi hành không được ở trong quá khứ'
            });
        }

        // Kiểm tra số lượng người còn nhận
        const tour = await Tour.findById(req.body.tour);
        if (!tour) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy tour'
            });
        }

        // Kiểm tra ngày khởi hành phải nằm trong danh sách startDates của tour
        if (!tour.startDates || tour.startDates.length === 0) {
            return res.status(400).json({
                status: 'fail',
                message: 'Tour này chưa có ngày khởi hành. Vui lòng liên hệ admin.'
            });
        }

        // So sánh ngày (chỉ so sánh ngày, không so sánh giờ)
        const selectedDateStr = startDate.toISOString().split('T')[0];
        const isValidDate = tour.startDates.some(tourDate => {
            const tourDateStr = new Date(tourDate).toISOString().split('T')[0];
            return tourDateStr === selectedDateStr;
        });

        if (!isValidDate) {
            const availableDates = tour.startDates
                .map(d => new Date(d).toLocaleDateString('vi-VN'))
                .join(', ');
            return res.status(400).json({
                status: 'fail',
                message: `Ngày khởi hành không hợp lệ. Các ngày có sẵn: ${availableDates}`
            });
        }

        const requestedPeople = parseInt(req.body.numberOfPeople, 10);
        if (isNaN(requestedPeople) || requestedPeople < 1) {
            return res.status(400).json({
                status: 'fail',
                message: 'Số lượng người phải lớn hơn 0'
            });
        }

        if (requestedPeople > tour.maxGroupSize) {
            return res.status(400).json({
                status: 'fail',
                message: `Tour chỉ nhận tối đa ${tour.maxGroupSize} người`
            });
        }

        // Tạo đơn đặt tour mới
        const newBooking = await Booking.create({
            tour: req.body.tour,
            user: req.user.id,
            price: tour.price * requestedPeople,
            numberOfPeople: requestedPeople,
            startDate: req.body.startDate
        });

        res.status(201).json({
            status: 'success',
            data: {
                booking: newBooking
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

exports.getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.user.id })
            .populate({
                path: 'tour',
                select: 'name destination price duration images'
            })
            .sort('-createdAt');

        res.status(200).json({
            status: 'success',
            results: bookings.length,
            data: {
                bookings
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

exports.getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate({
                path: 'tour',
                select: 'name destination price duration images'
            })
            .populate({
                path: 'user',
                select: 'name email'
            })
            .sort('-createdAt');

        res.status(200).json({
            status: 'success',
            results: bookings.length,
            data: {
                bookings
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

exports.updateBookingStatus = async (req, res) => {
    try {
        // Validate ObjectId
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({
                status: 'fail',
                message: 'ID đơn đặt tour không hợp lệ'
            });
        }

        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy đơn đặt tour'
            });
        }

        const { status, paid } = req.body;

        if (!status && typeof paid !== 'boolean') {
            return res.status(400).json({
                status: 'fail',
                message: 'Không có dữ liệu nào để cập nhật'
            });
        }

        // Không cho phép đánh dấu hoàn thành nếu đơn chưa được thanh toán
        if (status === 'completed') {
            const willBePaid = typeof paid === 'boolean' ? paid : booking.paid;
            if (!willBePaid) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Đơn đặt tour phải được thanh toán trước khi đánh dấu hoàn thành'
                });
            }
        }

        if (status) {
            booking.status = status;
        }

        if (typeof paid === 'boolean') {
            booking.paid = paid;
        }

        await booking.save();

        res.status(200).json({
            status: 'success',
            data: {
                booking
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

// User hủy đơn đặt tour của chính họ
exports.cancelMyBooking = async (req, res) => {
    try {
        // Validate ObjectId
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({
                status: 'fail',
                message: 'ID đơn đặt tour không hợp lệ'
            });
        }

        console.log('cancelMyBooking called with:', {
            bookingId: req.params.id,
            userId: req.user._id,
            path: req.path,
            method: req.method
        });
        
        // Tìm booking với điều kiện user để đảm bảo user chỉ hủy đơn của chính họ
        // Sử dụng findOne với điều kiện user để tránh vấn đề populate
        // req.user._id là ObjectId từ Mongoose document
        const booking = await Booking.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!booking) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy đơn đặt tour hoặc bạn không có quyền hủy đơn này'
            });
        }

        // Chỉ cho phép hủy đơn nếu đơn đang ở trạng thái pending hoặc confirmed
        if (booking.status === 'cancelled') {
            return res.status(400).json({
                status: 'fail',
                message: 'Đơn đặt tour này đã được hủy rồi'
            });
        }

        if (booking.status === 'completed') {
            return res.status(400).json({
                status: 'fail',
                message: 'Không thể hủy đơn đặt tour đã hoàn thành'
            });
        }

        // Cập nhật trạng thái thành cancelled
        booking.status = 'cancelled';
        await booking.save();

        res.status(200).json({
            status: 'success',
            message: 'Đơn đặt tour đã được hủy thành công',
            data: {
                booking
            }
        });
    } catch (err) {
        console.error('Error in cancelMyBooking:', err);
        res.status(400).json({
            status: 'fail',
            message: err.message || 'Có lỗi xảy ra khi hủy đơn đặt tour'
        });
    }
};

// Revenue statistics grouped by month (and year)
// Chỉ tính các đơn đã hoàn thành (completed)
exports.getRevenueStats = async (req, res) => {
    try {
        const year = req.query.year ? parseInt(req.query.year, 10) : undefined;

        const matchStage = { status: 'completed' }; // Chỉ tính đơn đã hoàn thành
        if (year && !isNaN(year)) {
            matchStage.$expr = {
                $eq: [{ $year: '$createdAt' }, year]
            };
        }

        const pipeline = [
            { $match: matchStage }, // Luôn filter theo status
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    totalRevenue: { $sum: '$price' },
                    totalBookings: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    month: '$_id.month',
                    totalRevenue: 1,
                    totalBookings: 1
                }
            }
        ];

        const stats = await Booking.aggregate(pipeline);

        res.status(200).json({
            status: 'success',
            results: stats.length,
            data: { stats }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

// Popular tours by number of bookings (and revenue)
// Chỉ tính các đơn đã hoàn thành (completed)
exports.getPopularTours = async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 6;

        const pipeline = [
            { $match: { status: 'completed' } }, // Chỉ tính đơn đã hoàn thành
            {
                $group: {
                    _id: '$tour',
                    bookings: { $sum: 1 },
                    revenue: { $sum: '$price' }
                }
            },
            { $sort: { bookings: -1 } },
            { $limit: isNaN(limit) ? 6 : limit },
            {
                $lookup: {
                    from: 'tours',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'tour'
                }
            },
            { $unwind: '$tour' }
        ];

        const popular = await Booking.aggregate(pipeline);

        // Map để trả về đầy đủ thông tin tour
        const tours = popular.map(item => ({
            ...item.tour,
            bookingsCount: item.bookings,
            revenue: item.revenue
        }));

        res.status(200).json({
            status: 'success',
            results: tours.length,
            data: { tours }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};