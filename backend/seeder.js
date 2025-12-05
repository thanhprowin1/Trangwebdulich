const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Tour = require('./models/Tour');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'config.env') });

// Kết nối database
mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('DB connection successful!'));

// Dữ liệu mẫu
const tours = [
    {
        name: 'Tour Du lịch Hạ Long 3 ngày 2 đêm',
        description: 'Khám phá vịnh Hạ Long xinh đẹp với những hòn đảo đá vôi và hang động kỳ thú',
        price: 2500000,
        duration: 3,
        maxGroupSize: 20,
        destination: 'Hạ Long',
        startDates: [
            '2025-12-01',
            '2025-12-15',
            '2025-12-30'
        ],
        images: ['halong1.jpg', 'halong2.jpg'],
        averageRating: 4.8
    },
    {
        name: 'Tour Đà Nẵng - Hội An 4 ngày 3 đêm',
        description: 'Khám phá Đà Nẵng hiện đại và phố cổ Hội An đầy màu sắc',
        price: 3500000,
        duration: 4,
        maxGroupSize: 15,
        destination: 'Đà Nẵng',
        startDates: [
            '2025-12-05',
            '2025-12-20',
            '2026-01-05'
        ],
        images: ['danang1.jpg', 'danang2.jpg'],
        averageRating: 4.7
    },
    {
        name: 'Tour Phú Quốc 3 ngày 2 đêm',
        description: 'Tận hưởng biển xanh, cát trắng và nắng vàng tại đảo ngọc Phú Quốc',
        price: 4000000,
        duration: 3,
        maxGroupSize: 25,
        destination: 'Phú Quốc',
        startDates: [
            '2025-12-10',
            '2025-12-25',
            '2026-01-10'
        ],
        images: ['phuquoc1.jpg', 'phuquoc2.jpg'],
        averageRating: 4.9
    }
];

// Tạo admin user
const adminUser = {
    name: 'Admin',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    phoneNumber: '0123456789',
    address: 'Hà Nội'
};

// Hàm import dữ liệu
const importData = async () => {
    try {
        // Xóa dữ liệu cũ
        await Tour.deleteMany();
        await User.deleteMany();

        // Import tours mới
        await Tour.create(tours);

        // Tạo admin user
        await User.create(adminUser);

        console.log('Data successfully loaded!');
        process.exit();
    } catch (err) {
        console.log(err);
    }
};

// Xóa tất cả dữ liệu
const deleteData = async () => {
    try {
        await Tour.deleteMany();
        await User.deleteMany();
        console.log('Data successfully deleted!');
        process.exit();
    } catch (err) {
        console.log(err);
    }
};

// Nếu argument là --import thì import data, --delete thì xóa data
if (process.argv[2] === '--import') {
    importData();
} else if (process.argv[2] === '--delete') {
    deleteData();
}

// Tạo admin user riêng biệt với password được mã hóa
const createAdmin = async () => {
    try {
        // Hash password
        const password = await bcrypt.hash('admin123', 12);

        // Create admin user
        const adminUser = await User.create({
            name: 'Admin',
            email: 'admin@example.com',
            password: password,
            role: 'admin',
            phoneNumber: '0123456789',
            address: 'Admin Address'
        });

        console.log('Admin user created successfully:', adminUser);
    } catch (err) {
        console.error('Error creating admin:', err);
    }
};

// Chạy script tạo admin
createAdmin().then(() => {
    console.log('Admin seeding completed!');
    process.exit();
}).catch(err => {
    console.error('Admin seeding failed:', err);
    process.exit(1);
});
