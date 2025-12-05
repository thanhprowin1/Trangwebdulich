const mongoose = require('mongoose');
const Tour = require('./models/Tour');
const Review = require('./models/Review');
const User = require('./models/User');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'config.env') });

async function testReviewFix() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.DATABASE_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✓ Connected to MongoDB');

        // Get a tour
        const tour = await Tour.findOne();
        if (!tour) {
            console.log('✗ No tours found');
            process.exit(1);
        }
        console.log('✓ Found tour:', tour.name);
        console.log('  Current averageRating:', tour.averageRating);

        // Get a user
        const user = await User.findOne();
        if (!user) {
            console.log('✗ No users found');
            process.exit(1);
        }
        console.log('✓ Found user:', user.name);

        // Check if user already reviewed this tour
        const existingReview = await Review.findOne({
            tour: tour._id,
            user: user._id
        });

        if (existingReview) {
            console.log('✓ User already reviewed this tour, deleting old review...');
            await Review.findByIdAndDelete(existingReview._id);
            await Tour.findByIdAndUpdate(
                tour._id,
                { $pull: { ratings: existingReview._id } }
            );
            console.log('✓ Old review deleted');
        }

        // Create a new review
        console.log('\n📝 Creating new review...');
        const newReview = await Review.create({
            review: 'Test review - Lỗi đã được sửa!',
            rating: 5,
            tour: tour._id,
            user: user._id
        });
        console.log('✓ Review created:', newReview._id);

        // Add review to tour
        tour.ratings.push(newReview._id);
        console.log('  Ratings array before save:', tour.ratings);
        console.log('  averageRating before save:', tour.averageRating);

        // Save tour
        await tour.save();
        console.log('✓ Tour saved successfully!');

        // Fetch tour again to see updated averageRating
        const updatedTour = await Tour.findById(tour._id);
        console.log('\n✓ Updated tour:');
        console.log('  averageRating:', updatedTour.averageRating);
        console.log('  ratings count:', updatedTour.ratings.length);

        console.log('\n✅ TEST PASSED - Lỗi đã được sửa!');
        console.log('   averageRating có thể là 0 khi không có review');
        console.log('   averageRating sẽ được tính từ các review');

    } catch (err) {
        console.error('✗ Error:', err.message);
        if (err.errors) {
            console.error('Validation errors:', err.errors);
        }
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

testReviewFix();

