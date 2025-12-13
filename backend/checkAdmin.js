const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Review = require('./models/Review');
const TourExtension = require('./models/TourExtension');

dotenv.config({ path: './config.env' });

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/travel-booking');
        console.log('✅ MongoDB connected successfully');
        return conn;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

const checkAdmin = async () => {
    try {
        await connectDB();

        const admins = await User.find({ role: 'admin' });
        console.log(`\n👑 Admin Users (${admins.length}):`);
        admins.forEach(admin => {
            console.log(`  - ${admin.name} (${admin.email})`);
        });

        if (admins.length === 0) {
            console.log('\n⚠️  No admin users found!');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

checkAdmin();

