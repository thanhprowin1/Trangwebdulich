const crypto = require('crypto');
const querystring = require('querystring');

/**
 * Tạo URL thanh toán VNPay
 * @param {Object} params - Thông tin thanh toán
 * @param {String} params.orderId - Mã đơn hàng (booking ID)
 * @param {Number} params.amount - Số tiền (VND)
 * @param {String} params.orderInfo - Mô tả đơn hàng
 * @param {String} params.ipAddr - IP address của client
 * @param {String} params.returnUrl - URL để VNPay redirect về sau khi thanh toán
 * @returns {String} - URL thanh toán VNPay
 */
exports.createPaymentUrl = (params) => {
    const vnp_TmnCode = process.env.VNPAY_TMN_CODE;
    const vnp_HashSecret = process.env.VNPAY_HASH_SECRET;
    const vnp_Url = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    
    const date = new Date();
    const createDate = date.toISOString().replace(/[-:]/g, '').split('.')[0] + '00';
    
    const vnp_Params = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = vnp_TmnCode;
    vnp_Params['vnp_Amount'] = String(params.amount * 100); // VNPay yêu cầu số tiền nhân 100, phải là string
    vnp_Params['vnp_CurrCode'] = 'VND';
    vnp_Params['vnp_TxnRef'] = String(params.orderId);
    vnp_Params['vnp_OrderInfo'] = params.orderInfo;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Locale'] = 'vn';
    vnp_Params['vnp_ReturnUrl'] = params.returnUrl;
    vnp_Params['vnp_IpAddr'] = params.ipAddr;
    vnp_Params['vnp_CreateDate'] = createDate;
    
    // Sắp xếp params theo thứ tự alphabet
    const sortedParams = sortObject(vnp_Params);
    
    // Tạo query string theo format VNPay yêu cầu
    const signData = createQueryString(sortedParams);
    
    // Tạo chữ ký
    const hmac = crypto.createHmac('sha512', vnp_HashSecret);
    const signed = hmac.update(signData, 'utf-8').digest('hex');
    
    // Thêm chữ ký vào params
    sortedParams['vnp_SecureHash'] = signed;
    
    // Tạo URL thanh toán
    const paymentUrl = vnp_Url + '?' + createQueryString(sortedParams);
    
    console.log('VNPay Payment URL created:', paymentUrl.substring(0, 200) + '...');
    
    return paymentUrl;
};

/**
 * Xác thực chữ ký từ VNPay callback
 * @param {Object} vnp_Params - Params từ VNPay callback
 * @returns {Boolean} - true nếu chữ ký hợp lệ
 */
exports.verifyPayment = (vnp_Params) => {
    const vnp_HashSecret = process.env.VNPAY_HASH_SECRET;
    const secureHash = vnp_Params['vnp_SecureHash'];
    
    // Tạo bản copy và xóa các field không cần thiết
    const orderId = vnp_Params['vnp_TxnRef'];
    const rspCode = vnp_Params['vnp_ResponseCode'];
    
    // Tạo object mới không có SecureHash
    const paramsForSign = {};
    Object.keys(vnp_Params).forEach(key => {
        if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
            paramsForSign[key] = vnp_Params[key];
        }
    });
    
    // Sắp xếp params
    const sortedParams = sortObject(paramsForSign);
    
    // Tạo query string theo format VNPay
    const signData = createQueryString(sortedParams);
    
    // Tạo chữ ký
    const hmac = crypto.createHmac('sha512', vnp_HashSecret);
    const calculatedHash = hmac.update(signData, 'utf-8').digest('hex');
    
    // So sánh chữ ký
    return secureHash === calculatedHash;
};

/**
 * Sắp xếp object theo thứ tự alphabet
 * @param {Object} obj - Object cần sắp xếp
 * @returns {Object} - Object đã sắp xếp
 */
function sortObject(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    
    keys.forEach(key => {
        sorted[key] = obj[key];
    });
    
    return sorted;
}

/**
 * Tạo query string theo format VNPay yêu cầu
 * VNPay yêu cầu: encode URL đúng cách, khoảng trắng thành +
 * @param {Object} obj - Object cần chuyển thành query string
 * @returns {String} - Query string
 */
function createQueryString(obj) {
    const keys = Object.keys(obj).sort();
    const pairs = keys.map(key => {
        let value = String(obj[key]);
        // Encode URL nhưng thay %20 thành + (theo yêu cầu VNPay)
        value = encodeURIComponent(value).replace(/%20/g, '+');
        return `${key}=${value}`;
    });
    return pairs.join('&');
}

/**
 * Lấy response code message
 * @param {String} responseCode - Mã response từ VNPay
 * @returns {String} - Thông báo tương ứng
 */
exports.getResponseMessage = (responseCode) => {
    const responseMessages = {
        '00': 'Giao dịch thành công',
        '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
        '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking',
        '10': 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
        '11': 'Đã hết hạn chờ thanh toán. Xin vui lòng thực hiện lại giao dịch.',
        '12': 'Thẻ/Tài khoản bị khóa.',
        '13': 'Nhập sai mật khẩu xác thực giao dịch (OTP).',
        '51': 'Tài khoản không đủ số dư để thực hiện giao dịch.',
        '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày.',
        '75': 'Ngân hàng thanh toán đang bảo trì.',
        '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định.',
        '99': 'Lỗi không xác định được'
    };
    
    return responseMessages[responseCode] || `Mã lỗi: ${responseCode}`;
};

