const Booking = require('../models/Booking');
const Tour = require('../models/Tour');
const TourExtension = require('../models/TourExtension');
const mongoose = require('mongoose');

// Helper function để validate ObjectId
const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};
// Tính giá mở rộng dựa trên số ngày và số người
const calculateExtensionPrice = (tour, additionalDays, additionalPeople) => {
    const pricePerDay = tour.price / tour.duration;
    const pricePerPerson = tour.price / tour.maxGroupSize;

    const extensionPrice = (pricePerDay * additionalDays) + (pricePerPerson * additionalPeople);

    return {
        pricePerDay: parseFloat(pricePerDay.toFixed(2)),
        pricePerPerson: parseFloat(pricePerPerson.toFixed(2)),
        extensionPrice: parseFloat(extensionPrice.toFixed(2))
    };
};

exports.createBooking = async (req, res) => {
    // Ghi chú: Đã loại bỏ transaction để tương thích với môi trường MongoDB standalone.
    // Trong môi trường production, nên sử dụng replica set và kích hoạt lại transaction.
    try {
        const {
            tour: tourId,
            startDate: startDateStr,
            numberOfPeople,
            additionalDays,
            additionalPeople
        } = req.body;

        // 1. Validate inputs
        if (!startDateStr) {
            throw new Error('Vui lòng chọn ngày khởi hành');
        }
        const startDate = new Date(startDateStr);
        if (isNaN(startDate.getTime()) || startDate < new Date(new Date().setHours(0, 0, 0, 0))) {
            throw new Error('Ngày khởi hành không hợp lệ hoặc ở trong quá khứ');
        }

        const requestedPeople = parseInt(numberOfPeople, 10);
        if (isNaN(requestedPeople) || requestedPeople < 1) {
            throw new Error('Số lượng người phải lớn hơn 0');
        }

        const days = parseInt(additionalDays, 10) || 0;
        const people = parseInt(additionalPeople, 10) || 0;
        if (days < 0 || people < 0) {
            throw new Error('Số ngày và số người mở rộng phải >= 0');
        }

        // 2. Fetch tour and validate capacity & dates
        const tour = await Tour.findById(tourId);
        if (!tour) {
            throw new Error('Không tìm thấy tour');
        }

        // Chỉ kiểm tra giới hạn số người khi không có bất kỳ yêu cầu mở rộng nào
        if (days === 0 && people === 0) {
            if (requestedPeople > tour.maxGroupSize) {
                throw new Error(`Số người không được vượt quá ${tour.maxGroupSize}`);
            }
        }

        const selectedDateStr = startDate.toISOString().split('T')[0];
        const isValidDate = tour.startDates.some(d => new Date(d).toISOString().split('T')[0] === selectedDateStr);
        if (!isValidDate) {
            throw new Error('Ngày khởi hành không có sẵn');
        }

        // 3. Create initial booking
        const newBooking = new Booking({
            tour: tourId,
            user: req.user.id,
            price: tour.price * requestedPeople,
            numberOfPeople: requestedPeople,
            startDate: startDate
        });
        await newBooking.save();

        // 4. Handle extension if requested
        if (days > 0 || people > 0) {
            const pricing = calculateExtensionPrice(tour, days, people);

            await TourExtension.create({
                booking: newBooking._id,
                tour: tourId,
                user: req.user.id,
                additionalDays: days,
                additionalPeople: people,
                pricePerDay: pricing.pricePerDay,
                pricePerPerson: pricing.pricePerPerson,
                extensionPrice: pricing.extensionPrice,
                status: 'pending' // Mặc định là pending để admin duyệt
            });

            // Update booking with extension info
            newBooking.extension = {
                additionalDays: days,
                additionalPeople: people,
                extensionPrice: pricing.extensionPrice,
                totalPrice: newBooking.price + pricing.extensionPrice,
                extensionStatus: 'pending',
                requestedAt: new Date()
            };
            await newBooking.save();
        }

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

        // Bổ sung trường finalPrice để FE hiển thị giá cuối cùng
        const bookingsWithFinal = bookings.map(b => {
            const obj = b.toObject();
            const ext = obj.extension || {};
            const isApproved = ext.extensionStatus === 'approved';
            obj.basePrice = obj.price;
            obj.finalPrice = isApproved
                ? (ext.totalPrice || (obj.price + (ext.extensionPrice || 0)))
                : obj.price;
            return obj;
        });

        res.status(200).json({
            status: 'success',
            results: bookingsWithFinal.length,
            data: {
                bookings: bookingsWithFinal
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

        const bookingsWithFinal = bookings.map(b => {
            const obj = b.toObject();
            const ext = obj.extension || {};
            const isApproved = ext.extensionStatus === 'approved';
            obj.basePrice = obj.price;
            obj.finalPrice = isApproved
                ? (ext.totalPrice || (obj.price + (ext.extensionPrice || 0)))
                : obj.price;
            return obj;
        });

        res.status(200).json({
            status: 'success',
            results: bookingsWithFinal.length,
            data: {
                bookings: bookingsWithFinal
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

// Admin: Xóa booking (soft delete - giữ lại dữ liệu cho kế toán)
exports.deleteBooking = async (req, res) => {
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

        // Soft delete - đánh dấu là đã xóa thay vì xóa hoàn toàn
        booking.isDeleted = true;
        booking.deletedAt = new Date();
        booking.deletedBy = req.user._id;
        await booking.save();

        res.status(200).json({
            status: 'success',
            message: 'Đơn đặt tour đã được xóa thành công',
            data: {
                booking
            }
        });
    } catch (err) {
        console.error('Error in deleteBooking:', err);
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

// Revenue statistics grouped by month (and year)
// Chỉ tính các đơn đã hoàn thành (completed) và chưa bị xóa
exports.getRevenueStats = async (req, res) => {
    try {
        const year = req.query.year ? parseInt(req.query.year, 10) : undefined;

        // Build match stage correctly
        const matchStage = {
            status: 'completed', // Chỉ tính đơn đã hoàn thành
            isDeleted: false // Loại trừ các đơn bị xóa
        };

        const pipeline = [
            { $match: matchStage },
            {
                $addFields: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' }
                }
            }
        ];

        // Add year filter if provided
        if (year && !isNaN(year)) {
            pipeline.push({
                $match: { year: year }
            });
        }

        pipeline.push(
            {
                $group: {
                    _id: {
                        year: '$year',
                        month: '$month'
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
        );

        const stats = await Booking.aggregate(pipeline);

        res.status(200).json({
            status: 'success',
            results: stats.length,
            data: { stats }
        });
    } catch (err) {
        console.error('Error in getRevenueStats:', err);
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

// Completed tours aggregated by bookings (only completed bookings)
// Mặc định: chỉ tính các đơn đã hoàn thành (status = 'completed'), có thể tùy chỉnh qua query params
// Query hỗ trợ:
// - statuses: "completed" hoặc danh sách khác nếu muốn override
// - paidOnly: true|false (mặc định false)
// - days: số ngày gần đây (ví dụ 90)
exports.getPopularTours = async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 6;

        // Parse query
        const statuses = typeof req.query.statuses === 'string'
            ? req.query.statuses.split(',').map(s => s.trim()).filter(Boolean)
            : [];
        const paidOnly = String(req.query.paidOnly ?? 'false').toLowerCase() === 'true';
        const days = req.query.days ? parseInt(req.query.days, 10) : undefined;

        const matchStage = { isDeleted: false };
        if (paidOnly) matchStage.paid = true;
        // Mặc định chỉ lấy các đơn đã hoàn thành
        if (statuses.length > 0) {
            matchStage.status = { $in: statuses };
        } else {
            matchStage.status = 'completed';
        }
        if (!isNaN(days) && days > 0) {
            const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            matchStage.createdAt = { $gte: from };
        }

        const pipeline = [
            { $match: matchStage },
            {
                $group: {
                    _id: '$tour',
                    bookings: { $sum: 1 },
                    peopleCount: { $sum: '$numberOfPeople' },
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
            { $unwind: '$tour' },
            // Loại trừ tour đã bị soft delete (deletedAt != null)
            { $match: { 'tour.deletedAt': null } }
        ];

        const popular = await Booking.aggregate(pipeline);

        const tours = popular.map(item => ({
            _id: item.tour._id,
            name: item.tour.name,
            destination: item.tour.destination,
            price: item.tour.price,
            duration: item.tour.duration,
            maxGroupSize: item.tour.maxGroupSize,
            images: item.tour.images,
            averageRating: item.tour.averageRating,
            bookingsCount: item.bookings,
            peopleCount: item.peopleCount,
            revenue: item.revenue
        }));

        res.status(200).json({
            status: 'success',
            results: tours.length,
            data: { tours }
        });
    } catch (err) {
        console.error('Error in getPopularTours:', err);
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};