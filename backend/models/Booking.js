const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    tour: {
        type: mongoose.Schema.ObjectId,
        ref: 'Tour',
        required: [true, 'Đơn đặt phải thuộc về một tour']
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Đơn đặt phải thuộc về một người dùng']
    },
    price: {
        type: Number,
        required: [true, 'Đơn đặt phải có giá']
    },
    numberOfPeople: {
        type: Number,
        required: [true, 'Vui lòng nhập số lượng người']
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    startDate: {
        type: Date,
        required: [true, 'Vui lòng chọn ngày khởi hành']
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled'],
        default: 'pending'
    },
    paid: {
        type: Boolean,
        default: false
    }
});

bookingSchema.pre(/^find/, function(next) {
    this.populate('user').populate({
        path: 'tour',
        select: 'name'
    });
    next();
});

module.exports = mongoose.model('Booking', bookingSchema);
