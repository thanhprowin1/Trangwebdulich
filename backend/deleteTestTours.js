const mongoose = require('mongoose');
const Tour = require('./models/Tour');
const Review = require('./models/Review');
require('dotenv').config({ path: './config.env' });

async function deleteTestTours() {
    try {
        const dbUrl = process.env.DATABASE_URL || process.env.DATABASE;
        if (!dbUrl) {
            throw new Error('DATABASE_URL hoặc DATABASE không được định nghĩa trong config.env');
        }
        await mongoose.connect(dbUrl);
        console.log('✅ Kết nối database thành công\n');

        // Tìm tour test
        const testTours = await Tour.find({ name: /Test Soft Delete/i });
        
        console.log('📝 Tìm thấy tour test:');
        if (testTours.length === 0) {
            console.log('ℹ️ Không tìm thấy tour test nào');
        } else {
            testTours.forEach((tour, index) => {
                console.log(`${index + 1}. ${tour._id} - ${tour.name}`);
            });

            console.log(`\n🗑️ Xóa ${testTours.length} tour test...\n`);
            for (const tour of testTours) {
                await Tour.deleteOne({ _id: tour._id }, { forceDelete: true });
                console.log(`✅ Đã xóa: ${tour._id}`);
            }
            console.log('\n🧹 Dọn dẹp hoàn thành!');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Lỗi:', err.message);
        process.exit(1);
    }
}

deleteTestTours();

