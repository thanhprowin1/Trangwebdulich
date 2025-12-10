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
    },
    // Thông tin bản đồ và hotspot
    mapCenter: {
        lat: {
            type: Number,
            default: null
        },
        lng: {
            type: Number,
            default: null
        }
    },
    mapZoom: {
        type: Number,
        default: 13
    },
    hotspots: [{
        name: {
            type: String,
            required: true
        },
        lat: {
            type: Number,
            required: true
        },
        lng: {
            type: Number,
            required: true
        },
        image360Url: String,
        image360Urls: [String], // hỗ trợ nhiều ảnh 360 cho mỗi hotspot
        video360Url: String,
        description: String,
        // Liên kết điều hướng giữa các ảnh 360° (dùng cho kiểu Street View)
        // Gồm danh sách mũi tên từ ảnh hiện tại sang ảnh khác (có thể cùng hoặc khác hotspot)
        links: [{
            fromSceneIndex: {
                type: Number,
                default: null // nếu null áp dụng cho tất cả ảnh của hotspot
            },
            toHotspotIndex: {
                type: Number,
                default: 0 // chỉ số hotspot đích trong mảng hotspots
            },
            toSceneIndex: {
                type: Number,
                default: 0 // chỉ số ảnh đích (image360Urls) trong hotspot đích
            },
            text: {
                type: String,
                default: 'Đi tiếp'
            },
            pitch: {
                type: Number,
                default: 0
            },
            yaw: {
                type: Number,
                default: 0
            }
        }]
    }]
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
