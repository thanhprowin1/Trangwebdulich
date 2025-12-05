const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    review: {
        type: String,
        required: [true, 'Nội dung đánh giá không được để trống']
    },
    // Ảnh 360 do người dùng đính kèm trong đánh giá (lưu URL Cloudinary - hỗ trợ nhiều ảnh)
    image360Urls: [
        {
            type: String,
            required: false
        }
    ],
    // Trường cũ để tương thích ngược (sẽ luôn là phần tử đầu tiên trong image360Urls nếu có)
    image360Url: {
        type: String,
        required: false
    },
    rating: {
        type: Number,
        required: [true, 'Vui lòng cho điểm đánh giá'],
        min: 1,
        max: 5
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    tour: {
        type: mongoose.Schema.ObjectId,
        ref: 'Tour',
        required: [true, 'Đánh giá phải thuộc về một tour']
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Đánh giá phải thuộc về một người dùng']
    }
});

// Chỉ populate khi cần thiết (không tự động populate)
// reviewSchema.pre(/^find/, function(next) {
//     this.populate({
//         path: 'user',
//         select: 'name'
//     });
//     next();
// });

module.exports = mongoose.model('Review', reviewSchema);
