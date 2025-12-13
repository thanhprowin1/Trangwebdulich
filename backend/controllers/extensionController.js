const TourExtension = require('../models/TourExtension');
const Booking = require('../models/Booking');
const Tour = require('../models/Tour');
const mongoose = require('mongoose');

// Helper function để validate ObjectId
const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

// Helper function để tính giá mở rộng
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

// User yêu cầu mở rộng tour
exports.requestExtension = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { additionalDays, additionalPeople } = req.body;
        const userId = req.user.id;

        // Validate bookingId
        if (!isValidObjectId(bookingId)) {
            return res.status(400).json({
                status: 'fail',
                message: 'ID đơn đặt không hợp lệ'
            });
        }

        // Validate input
        if (!additionalDays && !additionalPeople) {
            return res.status(400).json({
                status: 'fail',
                message: 'Vui lòng cung cấp số ngày hoặc số người mở rộng'
            });
        }

        const days = parseInt(additionalDays, 10) || 0;
        const people = parseInt(additionalPeople, 10) || 0;

        if (days < 0 || people < 0) {
            return res.status(400).json({
                status: 'fail',
                message: 'Số ngày và số người phải >= 0'
            });
        }

        // Kiểm tra booking tồn tại và thuộc về user
        const booking = await Booking.findById(bookingId).populate('tour');
        if (!booking) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy đơn đặt'
            });
        }

        if (booking.user.toString() !== userId) {
            return res.status(403).json({
                status: 'fail',
                message: 'Bạn không có quyền yêu cầu mở rộng cho đơn đặt này'
            });
        }

        // Kiểm tra tour tồn tại
        const tour = await Tour.findById(booking.tour._id);
        if (!tour) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy tour'
            });
        }

        // Tính giá mở rộng
        const priceInfo = calculateExtensionPrice(tour, days, people);

        // Kiểm tra xem đã có yêu cầu pending chưa
        const existingRequest = await TourExtension.findOne({
            booking: bookingId,
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({
                status: 'fail',
                message: 'Bạn đã có một yêu cầu mở rộng đang chờ xử lý'
            });
        }

        // Tạo yêu cầu mở rộng
        const extension = await TourExtension.create({
            booking: bookingId,
            tour: tour._id,
            user: userId,
            additionalDays: days,
            additionalPeople: people,
            pricePerDay: priceInfo.pricePerDay,
            pricePerPerson: priceInfo.pricePerPerson,
            extensionPrice: priceInfo.extensionPrice
        });

        // Đồng bộ sang Booking.extension để FE hiển thị trạng thái
        const bookingToUpdate = await Booking.findById(bookingId);
        if (bookingToUpdate) {
            bookingToUpdate.extension = bookingToUpdate.extension || {};
            bookingToUpdate.extension.additionalDays = days;
            bookingToUpdate.extension.additionalPeople = people;
            bookingToUpdate.extension.extensionPrice = priceInfo.extensionPrice;
            bookingToUpdate.extension.totalPrice = bookingToUpdate.price + priceInfo.extensionPrice;
            bookingToUpdate.extension.extensionStatus = 'pending';
            bookingToUpdate.extension.requestedAt = new Date();
            await bookingToUpdate.save();
        }

        res.status(201).json({
            status: 'success',
            message: 'Yêu cầu mở rộng đã được gửi',
            data: {
                extension
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'fail',
            message: error.message
        });
    }
};

// User xem các yêu cầu mở rộng của mình
exports.getMyExtensions = async (req, res) => {
    try {
        const userId = req.user.id;

        const extensions = await TourExtension.find({ user: userId })
            .sort('-requestedAt');

        res.status(200).json({
            status: 'success',
            results: extensions.length,
            data: {
                extensions
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'fail',
            message: error.message
        });
    }
};

// User hủy yêu cầu mở rộng
exports.cancelExtension = async (req, res) => {
    try {
        const { extensionId } = req.params;
        const userId = req.user.id;

        // Validate extensionId
        if (!isValidObjectId(extensionId)) {
            return res.status(400).json({
                status: 'fail',
                message: 'ID yêu cầu mở rộng không hợp lệ'
            });
        }

        // Kiểm tra extension tồn tại
        const extension = await TourExtension.findById(extensionId);
        if (!extension) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy yêu cầu mở rộng'
            });
        }

        // Kiểm tra quyền
        if (extension.user.toString() !== userId) {
            return res.status(403).json({
                status: 'fail',
                message: 'Bạn không có quyền hủy yêu cầu này'
            });
        }

        // Kiểm tra trạng thái
        if (extension.status !== 'pending') {
            return res.status(400).json({
                status: 'fail',
                message: `Không thể hủy yêu cầu có trạng thái "${extension.status}"`
            });
        }

        // Cập nhật trạng thái
        extension.status = 'cancelled';
        await extension.save();

        // Đồng bộ trạng thái sang Booking.extension
        const booking = await Booking.findById(extension.booking);
        if (booking) {
            booking.extension = booking.extension || {};
            // Vì enum không có 'cancelled', đưa trạng thái về 'none' và reset số liệu mở rộng
            booking.extension.extensionStatus = 'none';
            booking.extension.additionalDays = 0;
            booking.extension.additionalPeople = 0;
            booking.extension.extensionPrice = 0;
            booking.extension.totalPrice = booking.price; // trở về giá gốc
            booking.extension.requestedAt = undefined;
            booking.extension.approvedAt = undefined;
            await booking.save();
        }

        res.status(200).json({
            status: 'success',
            message: 'Yêu cầu mở rộng đã được hủy',
            data: {
                extension
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'fail',
            message: error.message
        });
    }
};

// Admin xem tất cả yêu cầu mở rộng
exports.getAllExtensions = async (req, res) => {
    try {
        const { status } = req.query;

        let filter = {};
        if (status) {
            filter.status = status;
        }

        const extensions = await TourExtension.find(filter)
            .sort('-requestedAt');

        res.status(200).json({
            status: 'success',
            results: extensions.length,
            data: {
                extensions
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'fail',
            message: error.message
        });
    }
};

// Admin phê duyệt yêu cầu mở rộng
exports.approveExtension = async (req, res) => {
    try {
        const { extensionId } = req.params;
        const { adminNote } = req.body;

        // Validate extensionId
        if (!isValidObjectId(extensionId)) {
            return res.status(400).json({
                status: 'fail',
                message: 'ID yêu cầu mở rộng không hợp lệ'
            });
        }

        // Kiểm tra extension tồn tại
        const extension = await TourExtension.findById(extensionId);
        if (!extension) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy yêu cầu mở rộng'
            });
        }

        // Kiểm tra trạng thái
        if (extension.status !== 'pending') {
            return res.status(400).json({
                status: 'fail',
                message: `Không thể phê duyệt yêu cầu có trạng thái "${extension.status}"`
            });
        }

        // Cập nhật extension
        extension.status = 'approved';
        extension.approvedAt = new Date();
        if (adminNote) {
            extension.adminNote = adminNote;
        }
        await extension.save();

        // Đồng bộ trạng thái mở rộng vào Booking.extension
        const booking = await Booking.findById(extension.booking);
        if (booking) {
            // Đảm bảo object con tồn tại
            booking.extension = booking.extension || {};
            booking.extension.extensionStatus = 'approved';
            booking.extension.approvedAt = new Date();
            booking.extension.additionalDays = extension.additionalDays;
            booking.extension.additionalPeople = extension.additionalPeople;
            booking.extension.extensionPrice = extension.extensionPrice;
            booking.extension.totalPrice = booking.price + extension.extensionPrice;
            await booking.save();
        }

        res.status(200).json({
            status: 'success',
            message: 'Yêu cầu mở rộng đã được phê duyệt',
            data: {
                extension
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'fail',
            message: error.message
        });
    }
};

// Admin từ chối yêu cầu mở rộng
exports.rejectExtension = async (req, res) => {
    try {
        const { extensionId } = req.params;
        const { adminNote } = req.body;

        // Validate extensionId
        if (!isValidObjectId(extensionId)) {
            return res.status(400).json({
                status: 'fail',
                message: 'ID yêu cầu mở rộng không hợp lệ'
            });
        }

        // Kiểm tra extension tồn tại
        const extension = await TourExtension.findById(extensionId);
        if (!extension) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy yêu cầu mở rộng'
            });
        }

        // Kiểm tra trạng thái
        if (extension.status !== 'pending') {
            return res.status(400).json({
                status: 'fail',
                message: `Không thể từ chối yêu cầu có trạng thái "${extension.status}"`
            });
        }

        // Cập nhật extension
        extension.status = 'rejected';
        extension.rejectedAt = new Date();
        if (adminNote) {
            extension.adminNote = adminNote;
        }
        await extension.save();

        // Đồng bộ trạng thái sang Booking.extension
        const booking = await Booking.findById(extension.booking);
        if (booking) {
            booking.extension = booking.extension || {};
            booking.extension.extensionStatus = 'rejected';
            booking.extension.approvedAt = undefined;
            booking.extension.requestedAt = booking.extension.requestedAt || new Date();
            await booking.save();
        }

        res.status(200).json({
            status: 'success',
            message: 'Yêu cầu mở rộng đã bị từ chối',
            data: {
                extension
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'fail',
            message: error.message
        });
    }
};

