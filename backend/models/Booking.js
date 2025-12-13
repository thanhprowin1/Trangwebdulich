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
    },
    // Thông tin mở rộng tour
    extension: {
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
        extensionPrice: {
            type: Number,
            default: 0,
            min: [0, 'Giá mở rộng phải >= 0']
        },
        totalPrice: {
            type: Number,
            default: 0
        },
        extensionStatus: {
            type: String,
            enum: ['none', 'pending', 'approved', 'rejected'],
            default: 'none'
        },
        requestedAt: Date,
        approvedAt: Date
    },
    // Soft delete - để giữ lại dữ liệu cho kế toán
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    deletedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        default: null
    }
});

// Bật virtuals khi xuất JSON/Object
bookingSchema.set('toJSON', { virtuals: true });
bookingSchema.set('toObject', { virtuals: true });

// Virtual: basePrice = price
bookingSchema.virtual('basePrice').get(function() {
    return this.price;
});

// Virtual: finalPrice = price nếu chưa approved, ngược lại dùng totalPrice hoặc price + extensionPrice
bookingSchema.virtual('finalPrice').get(function() {
    try {
        const ext = this.extension || {};
        if (ext.extensionStatus === 'approved') {
            return (typeof ext.totalPrice === 'number' && ext.totalPrice > 0)
                ? ext.totalPrice
                : this.price + (ext.extensionPrice || 0);
        }
        return this.price;
    } catch (e) {
        return this.price;
    }
});

// Virtual: finalDuration = số ngày cuối cùng (bao gồm ngày mở rộng nếu đã duyệt)
bookingSchema.virtual('finalDuration').get(function() {
    try {
        const tour = this.tour;
        const ext = this.extension || {};

        if (!tour || !tour.duration) {
            return 0;
        }

        const baseDuration = tour.duration;

        if (ext.extensionStatus === 'approved' && ext.additionalDays > 0) {
            return baseDuration + ext.additionalDays;
        }

        return baseDuration;
    } catch (e) {
        return this.tour ? this.tour.duration : 0;
    }
});

bookingSchema.pre(/^find/, function(next) {
    this.populate('user').populate({
        path: 'tour',
        // Cần duration để hiển thị số ngày trong FE
        select: 'name duration price destination images'
    });
    next();
});

module.exports = mongoose.model('Booking', bookingSchema);
