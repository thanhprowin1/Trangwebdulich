const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load models to register schemas
const Booking = require('./models/Booking');
const Tour = require('./models/Tour');
const User = require('./models/User');
const Review = require('./models/Review');
const TourExtension = require('./models/TourExtension');

dotenv.config({ path: './config.env' });

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/travel-booking');
        console.log('MongoDB connected successfully');
        return conn;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

const createSampleStats = async () => {
    try {
        await connectDB();

        // Get first tour
        const tour = await Tour.findOne();
        if (!tour) {
            console.log('No tours found. Please create a tour first.');
            process.exit(1);
        }

        // Get first user
        const user = await User.findOne({ role: 'user' });
        if (!user) {
            console.log('No users found. Please create a user first.');
            process.exit(1);
        }

        // Create sample completed bookings for the last 3 months
        const now = new Date();
        const bookingsToCreate = [];

        // Last 3 months
        for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
            const bookingDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 15);
            
            // Create 2-3 bookings per month
            const bookingsPerMonth = 2 + Math.floor(Math.random() * 2);
            for (let i = 0; i < bookingsPerMonth; i++) {
                bookingsToCreate.push({
                    tour: tour._id,
                    user: user._id,
                    price: tour.price * (2 + Math.floor(Math.random() * 3)), // 2-4 people
                    numberOfPeople: 2 + Math.floor(Math.random() * 3),
                    startDate: new Date(bookingDate.getFullYear(), bookingDate.getMonth(), 1 + Math.floor(Math.random() * 20)),
                    status: 'completed',
                    paid: true,
                    createdAt: bookingDate
                });
            }
        }

        // Insert bookings
        const result = await Booking.insertMany(bookingsToCreate);
        console.log(`✅ Created ${result.length} sample completed bookings`);
        console.log('Sample bookings created for statistics display');
        
        process.exit(0);
    } catch (error) {
        console.error('Error creating sample stats:', error);
        process.exit(1);
    }
};

createSampleStats();

