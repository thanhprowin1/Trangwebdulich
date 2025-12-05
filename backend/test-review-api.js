const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api/v1';
let token = '';
let userId = '';
let tourId = '';
let reviewId = '';

const testReviewAPIs = async () => {
    try {
        // 1. Signup
        console.log('\n1. Testing Signup API:');
        try {
            const signupResponse = await axios.post(`${BASE_URL}/auth/signup`, {
                name: 'Review Test User',
                email: `reviewtest${Date.now()}@example.com`,
                password: 'password123',
                phoneNumber: '0123456789',
                address: '123 Test St'
            });
            token = signupResponse.data.token;
            userId = signupResponse.data.data.user._id;
            console.log('✓ Signup successful');
        } catch (error) {
            console.log('✗ Signup failed:', error.response?.data?.message);
            return;
        }

        // 2. Get a tour (or create one)
        console.log('\n2. Getting tours:');
        try {
            const toursResponse = await axios.get(`${BASE_URL}/tours`);
            if (toursResponse.data.data.tours.length > 0) {
                tourId = toursResponse.data.data.tours[0]._id;
                console.log('✓ Tour found:', tourId);
            } else {
                console.log('✗ No tours available');
                return;
            }
        } catch (error) {
            console.log('✗ Failed to get tours:', error.response?.data?.message);
            return;
        }

        // 3. Create a review
        console.log('\n3. Testing Create Review API:');
        try {
            const createReviewResponse = await axios.post(
                `${BASE_URL}/reviews`,
                {
                    tour: tourId,
                    rating: 5,
                    review: 'Đây là một tour tuyệt vời! Tôi rất hài lòng với dịch vụ.'
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            reviewId = createReviewResponse.data.data.review._id;
            console.log('✓ Review created successfully');
            console.log('  Review ID:', reviewId);
        } catch (error) {
            console.log('✗ Create review failed:', error.response?.data?.message);
            return;
        }

        // 4. Get reviews for the tour
        console.log('\n4. Testing Get Reviews by Tour API:');
        try {
            const getReviewsResponse = await axios.get(`${BASE_URL}/reviews/tour/${tourId}`);
            console.log('✓ Reviews retrieved successfully');
            console.log('  Total reviews:', getReviewsResponse.data.results);
            console.log('  Average rating:', getReviewsResponse.data.averageRating);
            console.log('  Reviews:', getReviewsResponse.data.data.reviews);
        } catch (error) {
            console.log('✗ Get reviews failed:', error.response?.data?.message);
        }

        // 5. Try to create another review for the same tour (should fail)
        console.log('\n5. Testing duplicate review prevention:');
        try {
            await axios.post(
                `${BASE_URL}/reviews`,
                {
                    tour: tourId,
                    rating: 4,
                    review: 'Another review'
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            console.log('✗ Duplicate review was allowed (should have been prevented)');
        } catch (error) {
            console.log('✓ Duplicate review prevented:', error.response?.data?.message);
        }

        // 6. Update the review
        console.log('\n6. Testing Update Review API:');
        try {
            const updateReviewResponse = await axios.patch(
                `${BASE_URL}/reviews/${reviewId}`,
                {
                    rating: 4,
                    review: 'Cập nhật: Tour rất tốt nhưng có thể cải thiện thêm.'
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            console.log('✓ Review updated successfully');
            console.log('  Updated review:', updateReviewResponse.data.data.review);
        } catch (error) {
            console.log('✗ Update review failed:', error.response?.data?.message);
        }

        // 7. Get reviews again to verify update
        console.log('\n7. Verifying updated reviews:');
        try {
            const getReviewsResponse = await axios.get(`${BASE_URL}/reviews/tour/${tourId}`);
            console.log('✓ Reviews retrieved');
            console.log('  Average rating after update:', getReviewsResponse.data.averageRating);
        } catch (error) {
            console.log('✗ Get reviews failed:', error.response?.data?.message);
        }

        // 8. Delete the review
        console.log('\n8. Testing Delete Review API:');
        try {
            const deleteReviewResponse = await axios.delete(
                `${BASE_URL}/reviews/${reviewId}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            console.log('✓ Review deleted successfully');
        } catch (error) {
            console.log('✗ Delete review failed:', error.response?.data?.message);
        }

        // 9. Verify deletion
        console.log('\n9. Verifying deletion:');
        try {
            const getReviewsResponse = await axios.get(`${BASE_URL}/reviews/tour/${tourId}`);
            console.log('✓ Reviews retrieved after deletion');
            console.log('  Total reviews:', getReviewsResponse.data.results);
        } catch (error) {
            console.log('✗ Get reviews failed:', error.response?.data?.message);
        }

        console.log('\n✓ All review API tests completed!');
    } catch (error) {
        console.error('Unexpected error:', error.message);
    }
};

testReviewAPIs();

