const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Tour = require('./models/Tour');
require('./models/Review');

dotenv.config({ path: path.join(__dirname, 'config.env') });

const SAMPLE_IMAGE_360_URL = 'https://pannellum.org/images/alma.jpg';

const addSample360Image = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('Connected to MongoDB. Looking for a tour to update...');

        // Tìm một tour chưa có ảnh 360
        let tour = await Tour.findOne({
            $or: [
                { image360Url: { $exists: false } },
                { image360Url: null },
                { image360Url: '' }
            ]
        });

        // Nếu tất cả tour đều có ảnh 360 thì sử dụng tour đầu tiên
        if (!tour) {
            tour = await Tour.findOne();
        }

        if (!tour) {
            console.log('Không tìm thấy tour nào trong cơ sở dữ liệu.');
            process.exit(0);
        }

        tour.image360Url = SAMPLE_IMAGE_360_URL;
        await tour.save();

        console.log('Đã thêm ảnh 360 mẫu cho tour:', tour.name);
        console.log('URL:', SAMPLE_IMAGE_360_URL);
        process.exit(0);
    } catch (error) {
        console.error('Có lỗi xảy ra khi thêm ảnh 360 mẫu:', error);
        process.exit(1);
    }
};

addSample360Image();

