const mongoose = require('mongoose');

const tourExtensionSchema = new mongoose.Schema({
    booking: {
        type: mongoose.Schema.ObjectId,
        ref: 'Booking',
        required: [true, 'Mở rộng phải thuộc về một đơn đặt']
    },
    tour: {
        type: mongoose.Schema.ObjectId,
        ref: 'Tour',
        required: [true, 'Mở rộng phải thuộc về một tour']
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Mở rộng phải thuộc về một người dùng']
    },
    // Thông tin mở rộng
    additionalDays: {
        type: Number,
        default: 0,
        min: [0, 'Số ngày mở rộng phải >= 0']
    },
    additionalPeople: {
        type: Number,
        default: 0,
        min: [0, 'Số người mở rộng phải >= 0']
    },
    // Giá tính toán
    pricePerDay: {
        type: Number,
        required: [true, 'Giá mỗi ngày là bắt buộc']
    },
    pricePerPerson: {
        type: Number,
        required: [true, 'Giá mỗi người là bắt buộc']
    },
    extensionPrice: {
        type: Number,
        required: [true, 'Giá mở rộng là bắt buộc']
    },
    // Trạng thái
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending'
    },
    // Ghi chú từ admin
    adminNote: String,
    // Thời gian
    requestedAt: {
        type: Date,
        default: Date.now()
    },
    approvedAt: Date,
    rejectedAt: Date
});

// Middleware để populate thông tin liên quan
tourExtensionSchema.pre(/^find/, function(next) {
    this.populate({
        path: 'booking',
        select: 'numberOfPeople startDate price'
    }).populate({
        path: 'tour',
        select: 'name price duration'
    }).populate({
        path: 'user',
        select: 'name email'
    });
    next();
});

module.exports = mongoose.model('TourExtension', tourExtensionSchema);

