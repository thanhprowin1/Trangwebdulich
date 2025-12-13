const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

// Test token (bạn cần thay bằng token thực)
const token = 'YOUR_ADMIN_TOKEN_HERE';

async function testStats() {
  try {
    console.log('Testing Popular Tours API...');
    const popularResponse = await axios.get(`${API_URL}/bookings/stats/popular`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Popular Tours Response:', JSON.stringify(popularResponse.data, null, 2));

    console.log('\nTesting Revenue Stats API...');
    const revenueResponse = await axios.get(`${API_URL}/bookings/stats/revenue`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Revenue Stats Response:', JSON.stringify(revenueResponse.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testStats();

