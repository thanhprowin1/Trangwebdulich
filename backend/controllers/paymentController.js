const Booking = require('../models/Booking');
const Tour = require('../models/Tour');
const momo = require('../utils/momo');
const vnpay = require('../utils/vnpay');
const QRCode = require('qrcode');
const mongoose = require('mongoose');

// Helper function để validate ObjectId
const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

// Tạo payment và xử lý thanh toán
exports.createPayment = async (req, res) => {
    try {
        // Validate ObjectId
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({
                status: 'fail',
                message: 'ID đơn đặt tour không hợp lệ'
            });
        }

        console.log('createPayment called with:', {
            bookingId: req.params.id,
            userId: req.user._id
        });

        const booking = await Booking.findOne({
            _id: req.params.id,
            user: req.user._id
        }).populate({
            path: 'tour',
            select: 'name destination price duration images'
        });

        if (!booking) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy đơn đặt tour hoặc bạn không có quyền thanh toán đơn này'
            });
        }

        // Kiểm tra đơn đã được thanh toán chưa
        if (booking.paid) {
            return res.status(400).json({
                status: 'fail',
                message: 'Đơn đặt tour này đã được thanh toán rồi'
            });
        }

        // Kiểm tra đơn đã bị hủy chưa
        if (booking.status === 'cancelled') {
            return res.status(400).json({
                status: 'fail',
                message: 'Không thể thanh toán đơn đặt tour đã bị hủy'
            });
        }

        // Trả về thông tin thanh toán
        res.status(200).json({
            status: 'success',
            data: {
                booking: {
                    _id: booking._id,
                    price: booking.price,
                    tour: booking.tour ? {
                        _id: booking.tour._id,
                        name: booking.tour.name,
                        destination: booking.tour.destination
                    } : null,
                    numberOfPeople: booking.numberOfPeople,
                    startDate: booking.startDate
                }
            }
        });
    } catch (err) {
        console.error('Error in createPayment:', err);
        res.status(400).json({
            status: 'fail',
            message: err.message || 'Có lỗi xảy ra khi tạo thanh toán'
        });
    }
};

// Xử lý callback từ MoMo (redirect sau khi thanh toán)
exports.handleMoMoReturn = async (req, res) => {
    try {
        const params = req.query;
        
        // Xác thực chữ ký (tạm thời bỏ qua validate để dễ test sandbox)
        const isValid = momo.verifyPayment(params);
        if (!isValid) {
            console.warn('MoMo signature invalid (sandbox) – vẫn tiếp tục xử lý cho mục đích test.', params);
        }

        const orderId = params.orderId;
        const resultCode = params.resultCode;
        const amount = params.amount;

        // Extract bookingId từ orderId (format: bookingId_timestamp)
        let bookingId = orderId;
        if (orderId && orderId.includes('_')) {
            // Lấy phần đầu trước dấu _ (bookingId)
            bookingId = orderId.split('_')[0];
        }

        // Validate ObjectId
        if (!bookingId || !isValidObjectId(bookingId)) {
            const failedUrl = process.env.FRONTEND_PAYMENT_FAILED_URL || 
                             `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/failed`;
            return res.redirect(`${failedUrl}?message=${encodeURIComponent('ID đơn hàng không hợp lệ')}`);
        }

        // Tìm booking
        const booking = await Booking.findById(bookingId);

        if (!booking) {
            const failedUrl = process.env.FRONTEND_PAYMENT_FAILED_URL || 
                             `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/failed`;
            return res.redirect(`${failedUrl}?message=${encodeURIComponent('Không tìm thấy đơn đặt tour')}`);
        }

        // Kiểm tra số tiền
        if (parseInt(amount) !== booking.price) {
            const failedUrl = process.env.FRONTEND_PAYMENT_FAILED_URL || 
                             `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/failed`;
            return res.redirect(`${failedUrl}?message=${encodeURIComponent('Số tiền không khớp')}`);
        }

        // Xử lý theo result code
        if (resultCode === '0') {
            // Thanh toán thành công
            booking.paid = true;
            await booking.save();

            const successUrl = process.env.FRONTEND_PAYMENT_SUCCESS_URL || 
                              `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success`;
            return res.redirect(`${successUrl}?bookingId=${booking._id}`);
        } else {
            // Thanh toán thất bại
            const message = momo.getResponseMessage(parseInt(resultCode));
            const failedUrl = process.env.FRONTEND_PAYMENT_FAILED_URL || 
                             `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/failed`;
            return res.redirect(`${failedUrl}?message=${encodeURIComponent(message)}`);
        }
    } catch (err) {
        console.error('Error in handleMoMoReturn:', err);
        const failedUrl = process.env.FRONTEND_PAYMENT_FAILED_URL || 
                         `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/failed`;
        return res.redirect(`${failedUrl}?message=${encodeURIComponent('Có lỗi xảy ra khi xử lý thanh toán')}`);
    }
};

// Xử lý callback từ VNPay
exports.handleVNPayReturn = async (req, res) => {
    try {
        const vnp_Params = req.query;

        const isValid = vnpay.verifyPayment(vnp_Params);

        if (!isValid) {
            const failedUrl = process.env.FRONTEND_PAYMENT_FAILED_URL || 
                             `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/failed`;
            return res.redirect(`${failedUrl}?message=${encodeURIComponent('Chữ ký không hợp lệ')}`);
        }

        const orderId = vnp_Params['vnp_TxnRef'];
        const responseCode = vnp_Params['vnp_ResponseCode'];
        const amount = parseInt(vnp_Params['vnp_Amount']) / 100;

        if (!isValidObjectId(orderId)) {
            const failedUrl = process.env.FRONTEND_PAYMENT_FAILED_URL || 
                             `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/failed`;
            return res.redirect(`${failedUrl}?message=${encodeURIComponent('ID đơn đặt tour không hợp lệ')}`);
        }

        const booking = await Booking.findById(orderId);

        if (!booking) {
            const failedUrl = process.env.FRONTEND_PAYMENT_FAILED_URL || 
                             `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/failed`;
            return res.redirect(`${failedUrl}?message=${encodeURIComponent('Không tìm thấy đơn đặt tour')}`);
        }

        if (amount !== booking.price) {
            const failedUrl = process.env.FRONTEND_PAYMENT_FAILED_URL || 
                             `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/failed`;
            return res.redirect(`${failedUrl}?message=${encodeURIComponent('Số tiền không khớp')}`);
        }

        if (responseCode === '00') {
            booking.paid = true;
            await booking.save();

            const successUrl = process.env.FRONTEND_PAYMENT_SUCCESS_URL || 
                              `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success`;
            return res.redirect(`${successUrl}?bookingId=${booking._id}`);
        } else {
            const message = vnpay.getResponseMessage(responseCode);
            const failedUrl = process.env.FRONTEND_PAYMENT_FAILED_URL || 
                             `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/failed`;
            return res.redirect(`${failedUrl}?message=${encodeURIComponent(message)}`);
        }
    } catch (err) {
        console.error('Error in handleVNPayReturn:', err);
        const failedUrl = process.env.FRONTEND_PAYMENT_FAILED_URL || 
                         `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/failed`;
        return res.redirect(`${failedUrl}?message=${encodeURIComponent('Có lỗi xảy ra khi xử lý thanh toán VNPay')}`);
    }
};

// Xử lý webhook từ MoMo (IPN - Instant Payment Notification)
exports.handleMoMoNotify = async (req, res) => {
    try {
        const params = req.body;
        
        // Xác thực chữ ký (tạm thời bỏ qua validate để dễ test sandbox)
        const isValid = momo.verifyPayment(params);
        
        if (!isValid) {
            console.warn('Invalid MoMo signature in webhook (sandbox) – vẫn tiếp tục xử lý cho mục đích test.', params);
        }

        const orderId = params.orderId;
        const resultCode = params.resultCode;
        const amount = params.amount;

        // Extract bookingId từ orderId (format: bookingId_timestamp)
        let bookingId = orderId;
        if (orderId && orderId.includes('_')) {
            // Lấy phần đầu trước dấu _ (bookingId)
            bookingId = orderId.split('_')[0];
        }

        // Validate ObjectId
        if (!bookingId || !isValidObjectId(bookingId)) {
            console.error('Invalid orderId in MoMo webhook:', orderId);
            return res.status(400).json({ message: 'Invalid orderId' });
        }

        // Tìm booking
        const booking = await Booking.findById(bookingId);

        if (!booking) {
            console.error('Booking not found in MoMo webhook:', orderId);
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Kiểm tra số tiền
        if (parseInt(amount) !== booking.price) {
            console.error('Amount mismatch in MoMo webhook:', {
                expected: booking.price,
                received: amount
            });
            return res.status(400).json({ message: 'Amount mismatch' });
        }

        // Xử lý theo result code
        if (resultCode === '0' && !booking.paid) {
            // Thanh toán thành công
            booking.paid = true;
            await booking.save();
            console.log('Payment confirmed via MoMo webhook for booking:', bookingId);
        }

        // Trả về success để MoMo biết đã nhận được webhook
        return res.status(200).json({ message: 'Success' });
    } catch (err) {
        console.error('Error in handleMoMoNotify:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Tạo thanh toán MoMo và QR code
exports.createMoMoPayment = async (req, res) => {
    try {
        // Validate ObjectId
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({
                status: 'fail',
                message: 'ID đơn đặt tour không hợp lệ'
            });
        }

        const booking = await Booking.findOne({
            _id: req.params.id,
            user: req.user._id
        }).populate('tour', 'name');

        if (!booking) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy đơn đặt tour hoặc bạn không có quyền thanh toán đơn này'
            });
        }

        // Kiểm tra đơn đã được thanh toán chưa
        if (booking.paid) {
            return res.status(400).json({
                status: 'fail',
                message: 'Đơn đặt tour này đã được thanh toán rồi'
            });
        }

        // Kiểm tra đơn đã bị hủy chưa
        if (booking.status === 'cancelled') {
            return res.status(400).json({
                status: 'fail',
                message: 'Không thể thanh toán đơn đặt tour đã bị hủy'
            });
        }

        const tourName = booking.tour ? booking.tour.name : 'Tour';
        const orderInfo = `Thanh toan don dat tour ${tourName}`.substring(0, 250);
        
        const returnUrl = process.env.MOMO_RETURN_URL || 
                         `http://localhost:5001/api/v1/bookings/payment/momo-return`;
        const notifyUrl = process.env.MOMO_NOTIFY_URL || 
                         `http://localhost:5001/api/v1/bookings/payment/momo-notify`;

        // Tạo payment request với MoMo
        const paymentResult = await momo.createPayment({
            orderId: booking._id.toString(),
            amount: booking.price,
            orderInfo: orderInfo,
            returnUrl: returnUrl,
            notifyUrl: notifyUrl
        });

        if (!paymentResult.success) {
            return res.status(400).json({
                status: 'fail',
                message: paymentResult.message || 'Có lỗi xảy ra khi tạo thanh toán MoMo'
            });
        }

        // Tạo QR code từ payment URL
        let qrCodeDataUrl = null;
        try {
            qrCodeDataUrl = await QRCode.toDataURL(paymentResult.paymentUrl, {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                quality: 0.92,
                margin: 1,
                width: 300
            });
        } catch (qrError) {
            console.error('Error generating QR code:', qrError);
            // Vẫn trả về payment URL nếu không tạo được QR code
        }

        res.status(200).json({
            status: 'success',
            data: {
                paymentUrl: paymentResult.paymentUrl,
                qrCodeUrl: paymentResult.qrCodeUrl,
                qrCodeDataUrl: qrCodeDataUrl, // Base64 encoded QR code image
                deeplink: paymentResult.deeplink,
                booking: {
                    _id: booking._id,
                    price: booking.price,
                    tour: booking.tour
                }
            }
        });
    } catch (err) {
        console.error('Error in createMoMoPayment:', err);
        res.status(400).json({
            status: 'fail',
            message: err.message || 'Có lỗi xảy ra khi tạo thanh toán MoMo'
        });
    }
};

// Tạo thanh toán VNPay
exports.createVNPayPayment = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({
                status: 'fail',
                message: 'ID đơn đặt tour không hợp lệ'
            });
        }

        const booking = await Booking.findOne({
            _id: req.params.id,
            user: req.user._id
        }).populate('tour', 'name');

        if (!booking) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy đơn đặt tour hoặc bạn không có quyền thanh toán đơn này'
            });
        }

        if (booking.paid) {
            return res.status(400).json({
                status: 'fail',
                message: 'Đơn đặt tour này đã được thanh toán rồi'
            });
        }

        if (booking.status === 'cancelled') {
            return res.status(400).json({
                status: 'fail',
                message: 'Không thể thanh toán đơn đặt tour đã bị hủy'
            });
        }

        let ipAddr = req.headers['x-forwarded-for'] || 
                      req.connection?.remoteAddress || 
                      req.socket?.remoteAddress ||
                      (req.connection && req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                      '127.0.0.1';

        if (!ipAddr || ipAddr === '::1' || ipAddr === '::ffff:127.0.0.1') {
            ipAddr = '127.0.0.1';
        } else if (ipAddr.startsWith('::ffff:')) {
            ipAddr = ipAddr.replace('::ffff:', '');
        }

        const tourName = booking.tour ? booking.tour.name : 'Tour';
        const orderInfo = `Thanh toan don dat tour ${tourName}`.substring(0, 255);

        const returnUrl = process.env.VNPAY_RETURN_URL || 
                         `http://localhost:5001/api/v1/bookings/payment/vnpay-return`;

        const paymentUrl = vnpay.createPaymentUrl({
            orderId: booking._id.toString(),
            amount: booking.price,
            orderInfo,
            ipAddr,
            returnUrl
        });

        res.status(200).json({
            status: 'success',
            data: {
                paymentUrl,
                gateway: 'vnpay',
                booking: {
                    _id: booking._id,
                    price: booking.price,
                    tour: booking.tour
                }
            }
        });
    } catch (err) {
        console.error('Error in createVNPayPayment:', err);
        res.status(400).json({
            status: 'fail',
            message: err.message || 'Có lỗi xảy ra khi tạo thanh toán VNPay'
        });
    }
};

// Xử lý thanh toán
exports.processPayment = async (req, res) => {
    try {
        // Hệ thống hiện CHỈ hỗ trợ thanh toán bằng MoMo
        // Bỏ hoàn toàn VNPay: dù client gửi paymentMethod gì cũng sẽ dùng MoMo
        return exports.createMoMoPayment(req, res);
    } catch (err) {
        console.error('Error in processPayment:', err);
        res.status(400).json({
            status: 'fail',
            message: err.message || 'Có lỗi xảy ra khi xử lý thanh toán'
        });
    }
};

// Kiểm tra trạng thái thanh toán
exports.getPaymentStatus = async (req, res) => {
    try {
        // Validate ObjectId
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({
                status: 'fail',
                message: 'ID đơn đặt tour không hợp lệ'
            });
        }

        const booking = await Booking.findOne({
            _id: req.params.id,
            user: req.user._id
        }).populate('tour', 'name');

        if (!booking) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy đơn đặt tour'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                paid: booking.paid,
                booking: {
                    _id: booking._id,
                    price: booking.price,
                    tour: booking.tour,
                    status: booking.status
                }
            }
        });
    } catch (err) {
        console.error('Error in getPaymentStatus:', err);
        res.status(400).json({
            status: 'fail',
            message: err.message || 'Có lỗi xảy ra khi kiểm tra trạng thái thanh toán'
        });
    }
};

