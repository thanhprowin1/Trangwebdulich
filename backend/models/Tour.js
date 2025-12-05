const mongoose = require('mongoose');

const tourSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tên tour không được để trống'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Mô tả tour không được để trống']
    },
    price: {
        type: Number,
        required: [true, 'Giá tour không được để trống']
    },
    duration: {
        type: Number,
        required: [true, 'Thời gian tour không được để trống']
    },
    maxGroupSize: {
        type: Number,
        required: [true, 'Số lượng người tối đa không được để trống']
    },
    destination: {
        type: String,
        required: [true, 'Điểm đến không được để trống']
    },
    startDates: [{
        type: Date
    }],
    images: [String],
    image360Url: {
        type: String,
        default: null
    },
    video360Url: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    ratings: [{
        type: mongoose.Schema.ObjectId,
        ref: 'Review'
    }],
    averageRating: {
        type: Number,
        default: 0,
        min: [0, 'Đánh giá phải lớn hơn hoặc bằng 0'],
        max: [5, 'Đánh giá phải nhỏ hơn hoặc bằng 5']
    },
    bookingsCount: {
        type: Number,
        default: 0
    }
});

// Middleware để tính toán averageRating khi lấy tour
tourSchema.pre(/^find/, function(next) {
    this.populate({
        path: 'ratings',
        select: 'rating'
    });
    next();
});

// Post hook để tính averageRating sau khi populate
tourSchema.post(/^find/, async function(docs) {
    if (!Array.isArray(docs)) {
        docs = [docs];
    }

    for (let doc of docs) {
        if (doc && doc.ratings && Array.isArray(doc.ratings)) {
            if (doc.ratings.length > 0) {
                const totalRating = doc.ratings.reduce((sum, review) => {
                    return sum + (review.rating || 0);
                }, 0);
                doc.averageRating = (totalRating / doc.ratings.length).toFixed(1);
            } else {
                doc.averageRating = 0;
            }
        }
    }
});

module.exports = mongoose.model('Tour', tourSchema);
