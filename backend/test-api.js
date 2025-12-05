const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api/v1';
let token = '';

const testAPIs = async () => {
    try {
        // 1. Test signup API
        console.log('\n1. Testing Signup API:');
        try {
            const signupResponse = await axios.post(`${BASE_URL}/auth/signup`, {
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
                phoneNumber: '0123456789',
                address: '123 Test St'
            });
            console.log('Signup successful:', signupResponse.data);
        } catch (error) {
            console.log('Signup failed (might be already registered):', error.response.data);
        }

        // 2. Test login API
        console.log('\n2. Testing Login API:');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'test@example.com',
            password: 'password123'
        });
        token = loginResponse.data.token;
        console.log('Login successful:', loginResponse.data);

        // 3. Test get all tours API
        console.log('\n3. Testing Get All Tours API:');
        const toursResponse = await axios.get(`${BASE_URL}/tours`);
        console.log('Tours retrieved:', toursResponse.data);

        // 4. Test create tour API (requires auth)
        console.log('\n4. Testing Create Tour API:');
        const createTourResponse = await axios.post(
            `${BASE_URL}/tours`,
            {
                name: 'Test Tour',
                price: 999,
                duration: 3,
                maxGroupSize: 10,
                description: 'A test tour',
                location: 'Test Location'
            },
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        const tourId = createTourResponse.data.data.tour._id;
        console.log('Tour created:', createTourResponse.data);

        // 5. Test get single tour API
        console.log('\n5. Testing Get Single Tour API:');
        const singleTourResponse = await axios.get(`${BASE_URL}/tours/${tourId}`);
        console.log('Single tour retrieved:', singleTourResponse.data);

        // 6. Test create booking API (requires auth)
        console.log('\n6. Testing Create Booking API:');
        const createBookingResponse = await axios.post(
            `${BASE_URL}/bookings`,
            {
                tourId: tourId,
                date: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
                numberOfPeople: 2
            },
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        console.log('Booking created:', createBookingResponse.data);

        // 7. Test get my bookings API (requires auth)
        console.log('\n7. Testing Get My Bookings API:');
        const myBookingsResponse = await axios.get(
            `${BASE_URL}/bookings/my-bookings`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        console.log('My bookings retrieved:', myBookingsResponse.data);

    } catch (error) {
        if (error.response) {
            // Nếu server trả về lỗi với status code
            console.error('API Error:', {
                status: error.response.status,
                data: error.response.data
            });
        } else if (error.request) {
            // Nếu request được gửi nhưng không nhận được response
            console.error('Network Error:', error.message);
        } else {
            // Lỗi khi setting up request
            console.error('Error:', error.message);
        }
    }
};

testAPIs();