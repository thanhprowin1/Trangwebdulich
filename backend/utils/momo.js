const crypto = require('crypto');
const axios = require('axios');

/**
 * Tạo chữ ký HMAC SHA256 cho MoMo
 * @param {String} data - Dữ liệu cần ký
 * @param {String} secretKey - Secret key từ MoMo
 * @returns {String} - Chữ ký
 */
function createSignature(data, secretKey) {
    return crypto.createHmac('sha256', secretKey).update(data).digest('hex');
}

/**
 * Tạo payment request cho MoMo
 * @param {Object} params - Thông tin thanh toán
 * @param {String} params.orderId - Mã đơn hàng (booking ID)
 * @param {Number} params.amount - Số tiền (VND)
 * @param {String} params.orderInfo - Mô tả đơn hàng
 * @param {String} params.returnUrl - URL để MoMo redirect về sau khi thanh toán
 * @param {String} params.notifyUrl - URL để MoMo gửi webhook
 * @returns {Promise<Object>} - Payment response từ MoMo
 */
exports.createPayment = async (params) => {
    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    const momoApiUrl = process.env.MOMO_API_URL || 'https://test-payment.momo.vn/v2/gateway/api/create';

    // Tạo requestId và orderId unique
    // orderId format: bookingId_timestamp_random để đảm bảo unique mỗi lần tạo payment
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0'); // Random 4 số
    const requestId = `${timestamp}_${params.orderId}_${random}`;
    // Tạo orderId unique bằng cách thêm timestamp và random vào bookingId
    // MoMo yêu cầu orderId tối đa 50 ký tự
    // Format: bookingId_timestamp_random (ví dụ: 507f1f77bcf86cd799439011_1703123456789_1234)
    const orderId = `${params.orderId}_${timestamp}_${random}`.substring(0, 50);
    const orderInfo = params.orderInfo || `Thanh toan don dat tour ${orderId}`;
    const amount = params.amount;
    const returnUrl = params.returnUrl;
    const notifyUrl = params.notifyUrl;
    const requestType = 'captureWallet'; // Chỉ sử dụng ví MoMo (QR)
    const extraData = ''; // Có thể thêm dữ liệu bổ sung nếu cần

    // Tạo raw signature string
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${notifyUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${returnUrl}&requestId=${requestId}&requestType=${requestType}`;

    // Tạo chữ ký
    const signature = createSignature(rawSignature, secretKey);

    // Tạo request body
    const requestBody = {
        partnerCode: partnerCode,
        partnerName: 'Travel Booking',
        storeId: 'MomoTestStore',
        requestId: requestId,
        amount: amount,
        orderId: orderId,
        orderInfo: orderInfo,
        redirectUrl: returnUrl,
        ipnUrl: notifyUrl,
        lang: 'vi',
        extraData: extraData,
        requestType: requestType,
        autoCapture: true,
        orderGroupId: '',
        signature: signature
    };

    try {
        console.log('Sending MoMo payment request:', {
            orderId,
            amount,
            requestId,
            originalOrderId: params.orderId,
            timestamp: timestamp,
            random: random
        });

        const response = await axios.post(momoApiUrl, requestBody, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('MoMo payment response:', response.data);

        if (response.data.resultCode === 0) {
            // Thành công - trả về paymentUrl và qrCodeUrl
            return {
                success: true,
                paymentUrl: response.data.payUrl,
                qrCodeUrl: response.data.qrCodeUrl || response.data.payUrl, // QR code URL hoặc payment URL
                deeplink: response.data.deeplink,
                orderId: orderId,
                requestId: requestId
            };
        } else {
            // Lỗi từ MoMo
            return {
                success: false,
                message: response.data.message || 'Có lỗi xảy ra khi tạo thanh toán MoMo',
                resultCode: response.data.resultCode
            };
        }
    } catch (error) {
        console.error('Error creating MoMo payment:', error.response?.data || error.message);
        return {
            success: false,
            message: error.response?.data?.message || 'Có lỗi xảy ra khi kết nối với MoMo',
            error: error.message
        };
    }
};

/**
 * Xác thực chữ ký từ MoMo callback/webhook
 * @param {Object} params - Params từ MoMo callback
 * @returns {Boolean} - true nếu chữ ký hợp lệ
 */
exports.verifyPayment = (params) => {
    const secretKey = process.env.MOMO_SECRET_KEY;
    
    // Tạo raw signature string từ params
    const rawSignature = `accessKey=${params.accessKey}&amount=${params.amount}&extraData=${params.extraData}&message=${params.message}&orderId=${params.orderId}&orderInfo=${params.orderInfo}&orderType=${params.orderType}&partnerCode=${params.partnerCode}&payType=${params.payType}&requestId=${params.requestId}&responseTime=${params.responseTime}&resultCode=${params.resultCode}&transId=${params.transId}`;

    // Tạo chữ ký
    const calculatedSignature = createSignature(rawSignature, secretKey);

    // So sánh chữ ký
    return calculatedSignature === params.signature;
};

/**
 * Kiểm tra trạng thái thanh toán từ MoMo
 * @param {String} orderId - Mã đơn hàng
 * @param {String} requestId - Request ID ban đầu
 * @returns {Promise<Object>} - Trạng thái thanh toán
 */
exports.queryPaymentStatus = async (orderId, requestId) => {
    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    const momoQueryUrl = process.env.MOMO_QUERY_URL || 'https://test-payment.momo.vn/v2/gateway/api/query';

    // Tạo raw signature string
    const rawSignature = `accessKey=${accessKey}&orderId=${orderId}&partnerCode=${partnerCode}&requestId=${requestId}`;

    // Tạo chữ ký
    const signature = createSignature(rawSignature, secretKey);

    // Tạo request body
    const requestBody = {
        partnerCode: partnerCode,
        requestId: requestId,
        orderId: orderId,
        lang: 'vi',
        signature: signature
    };

    try {
        const response = await axios.post(momoQueryUrl, requestBody, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        return {
            success: response.data.resultCode === 0,
            resultCode: response.data.resultCode,
            message: response.data.message,
            amount: response.data.amount,
            transId: response.data.transId,
            orderId: response.data.orderId
        };
    } catch (error) {
        console.error('Error querying MoMo payment status:', error.response?.data || error.message);
        return {
            success: false,
            message: error.response?.data?.message || 'Có lỗi xảy ra khi kiểm tra trạng thái thanh toán'
        };
    }
};

/**
 * Lấy response message từ result code
 * @param {Number} resultCode - Mã kết quả từ MoMo
 * @returns {String} - Thông báo tương ứng
 */
exports.getResponseMessage = (resultCode) => {
    const responseMessages = {
        0: 'Giao dịch thành công',
        9000: 'Giao dịch được xác thực thành công',
        9001: 'Giao dịch chưa được xác thực',
        1001: 'Giao dịch bị từ chối',
        1002: 'Giao dịch bị từ chối do số tiền không hợp lệ',
        1003: 'Giao dịch bị từ chối do đối tác không hợp lệ',
        1004: 'Giao dịch bị từ chối do access token không hợp lệ',
        1005: 'Giao dịch bị từ chối do số tiền vượt quá hạn mức',
        1006: 'Giao dịch bị từ chối do thiếu thông tin bắt buộc',
        1007: 'Giao dịch bị từ chối do signature không hợp lệ',
        1008: 'Giao dịch bị từ chối do đơn hàng đã được xử lý',
        1009: 'Giao dịch bị từ chối do đơn hàng không tồn tại',
        1010: 'Giao dịch bị từ chối do số tiền không khớp',
        1011: 'Giao dịch bị từ chối do đơn hàng đã hết hạn',
        2001: 'Giao dịch bị từ chối do người dùng hủy',
        2002: 'Giao dịch bị từ chối do người dùng không xác nhận',
        2003: 'Giao dịch bị từ chối do người dùng không có đủ số dư',
        3001: 'Giao dịch bị từ chối do hệ thống lỗi',
        3002: 'Giao dịch bị từ chối do hệ thống bảo trì',
        3003: 'Giao dịch bị từ chối do hệ thống quá tải',
        3004: 'Giao dịch bị từ chối do hệ thống không khả dụng'
    };

    return responseMessages[resultCode] || `Mã lỗi: ${resultCode}`;
};

