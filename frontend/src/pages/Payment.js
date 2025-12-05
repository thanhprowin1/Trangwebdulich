import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

const Payment = () => {
  const { bookingId } = useParams();
  const history = useHistory();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('momo'); // 'momo' | 'vnpay'
  const [currentGateway, setCurrentGateway] = useState(null); // 'momo' | 'vnpay'
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    // Validate bookingId trước khi fetch
    if (!bookingId || bookingId === 'failed' || bookingId === 'success') {
      setError('ID đơn đặt tour không hợp lệ');
      setLoading(false);
      setTimeout(() => history.push('/my-bookings'), 2000);
      return;
    }
    fetchBookingInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  // Kiểm tra trạng thái thanh toán định kỳ
  useEffect(() => {
    if (qrCodeUrl && !checkingStatus) {
      const interval = setInterval(() => {
        checkPaymentStatus();
      }, 5000); // Kiểm tra mỗi 5 giây

      return () => clearInterval(interval);
    }
  }, [qrCodeUrl, checkingStatus]);

  const fetchBookingInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Bạn cần đăng nhập để thanh toán');
        setLoading(false);
        return;
      }

      // Validate bookingId format (MongoDB ObjectId có 24 ký tự hex)
      if (!bookingId || bookingId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(bookingId)) {
        setError('ID đơn đặt tour không hợp lệ');
        setLoading(false);
        history.push('/my-bookings');
        return;
      }

      console.log('Fetching booking info for:', bookingId);
      const response = await axios.get(`${API_URL}/bookings/payment/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Booking info received:', response.data);
      
      if (response.data.status === 'success' && response.data.data.booking) {
        setBooking(response.data.data.booking);
        setLoading(false);
      } else {
        setError('Không tìm thấy thông tin đơn đặt tour');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching booking info:', error);
      console.error('Error response:', error.response);
      
      if (error.response?.status === 404) {
        setError('Không tìm thấy đơn đặt tour hoặc bạn không có quyền thanh toán đơn này');
      } else if (error.response?.status === 401) {
        setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại');
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Có lỗi xảy ra khi tải thông tin thanh toán. Vui lòng thử lại sau.');
      }
      setLoading(false);
    }
  };

  const initiatePayment = async () => {
    try {
      setProcessing(true);
      setError('');
      setQrCodeUrl(null);
      setPaymentUrl(null);
      setCurrentGateway(null);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${API_URL}/bookings/payment/${bookingId}/process`,
        { paymentMethod },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.status === 'success' && response.data.data) {
        setProcessing(false);
        setLoading(false);

        if (paymentMethod === 'momo') {
          setCurrentGateway('momo');
          setQrCodeUrl(response.data.data.qrCodeDataUrl || response.data.data.qrCodeUrl);
          setPaymentUrl(response.data.data.paymentUrl);
        } else if (paymentMethod === 'vnpay') {
          setCurrentGateway('vnpay');
          setPaymentUrl(response.data.data.paymentUrl);
          if (response.data.data.paymentUrl) {
            window.location.href = response.data.data.paymentUrl;
          }
        }
      } else {
        setError(response.data.message || 'Có lỗi xảy ra khi tạo thanh toán');
        setProcessing(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error initiating payment:', error);
      setError(error.response?.data?.message || 'Có lỗi xảy ra khi tạo thanh toán');
      setProcessing(false);
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (checkingStatus) return;
    
    try {
      setCheckingStatus(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `${API_URL}/bookings/payment/${bookingId}/status`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.status === 'success' && response.data.data.paid) {
        // Thanh toán thành công
        history.push('/payment/success?bookingId=' + bookingId);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleOpenMoMoApp = () => {
    if (paymentUrl) {
      window.open(paymentUrl, '_blank');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Đang tải thông tin thanh toán...</p>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'red' }}>{error}</p>
          <button onClick={() => history.push('/my-bookings')} className="btn btn-primary">
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  return (
    <div className="container payment-page">
      <h2>Thanh toán đơn đặt tour</h2>
      
      <div className="payment-container" style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '2rem',
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        <div className="booking-summary" style={{
          background: '#f8f9fa',
          padding: '2rem',
          borderRadius: '8px'
        }}>
          <h3>Thông tin đơn đặt</h3>
          <div className="summary-item" style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            padding: '0.75rem 0',
            borderBottom: '1px solid #dee2e6'
          }}>
            <span>Tour:</span>
            <strong>{booking.tour?.name || booking.tour || 'N/A'}</strong>
          </div>
          <div className="summary-item" style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            padding: '0.75rem 0',
            borderBottom: '1px solid #dee2e6'
          }}>
            <span>Số người:</span>
            <strong>{booking.numberOfPeople}</strong>
          </div>
          <div className="summary-item" style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            padding: '0.75rem 0',
            borderBottom: '1px solid #dee2e6'
          }}>
            <span>Ngày khởi hành:</span>
            <strong>{formatDate(booking.startDate)}</strong>
          </div>
          <div className="summary-item total" style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            padding: '1rem 0',
            marginTop: '1rem',
            borderTop: '2px solid #007bff'
          }}>
            <span style={{ fontSize: '1.2rem' }}>Tổng tiền:</span>
            <strong style={{ fontSize: '1.5rem', color: '#e74c3c' }}>
              {booking.price.toLocaleString()} VND
            </strong>
          </div>
        </div>

        <div className="payment-form-section" style={{
          background: '#fff',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            💳 Thanh toán trực tuyến
          </h3>
          
          {error && (
            <div className="error-message" style={{ 
              background: '#fee', 
              color: '#c33', 
              padding: '1rem', 
              borderRadius: '4px',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}

          {!currentGateway && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Chọn phương thức thanh toán:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '1rem',
                  border: `2px solid ${paymentMethod === 'momo' ? '#A50064' : '#ddd'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: paymentMethod === 'momo' ? '#fff5f9' : '#fff'
                }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="momo"
                    checked={paymentMethod === 'momo'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{ marginRight: '0.75rem', width: '18px', height: '18px' }}
                  />
                  <div>
                    <strong style={{ fontSize: '1rem' }}>📱 Ví MoMo</strong>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#666' }}>
                      Quét QR code bằng ứng dụng MoMo
                    </p>
                  </div>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '1rem',
                  border: `2px solid ${paymentMethod === 'vnpay' ? '#A50064' : '#ddd'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: paymentMethod === 'vnpay' ? '#fff5f9' : '#fff'
                }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="vnpay"
                    checked={paymentMethod === 'vnpay'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{ marginRight: '0.75rem', width: '18px', height: '18px' }}
                  />
                  <div>
                    <strong style={{ fontSize: '1rem' }}>💳 VNPay</strong>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#666' }}>
                      Thanh toán qua cổng VNPay (Internet Banking/Thẻ)
                    </p>
                  </div>
                </label>
              </div>

              <button
                onClick={initiatePayment}
                className="btn btn-primary"
                disabled={processing}
                style={{ 
                  width: '100%', 
                  marginTop: '1.5rem',
                  background: '#A50064',
                  border: 'none',
                  padding: '0.75rem'
                }}
              >
                {processing ? 'Đang tạo thanh toán...' : 'Tiếp tục thanh toán'}
              </button>
            </div>
          )}

          {currentGateway === 'momo' && qrCodeUrl && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                background: '#fff',
                padding: '1rem',
                borderRadius: '8px',
                display: 'inline-block',
                marginBottom: '1rem',
                border: '2px solid #007bff'
              }}>
                <img 
                  src={qrCodeUrl} 
                  alt="MoMo QR Code" 
                  style={{ 
                    width: '250px', 
                    height: '250px',
                    display: 'block'
                  }}
                />
              </div>
              <p style={{ 
                marginBottom: '1rem',
                color: '#666',
                fontSize: '0.9rem'
              }}>
                Quét mã QR bằng ứng dụng MoMo để thanh toán
              </p>
              <button
                onClick={handleOpenMoMoApp}
                className="btn btn-primary"
                style={{ 
                  width: '100%', 
                  marginBottom: '0.5rem',
                  background: '#A50064',
                  border: 'none'
                }}
              >
                Mở ứng dụng MoMo
              </button>
              <p style={{ 
                marginTop: '1rem',
                color: '#999',
                fontSize: '0.85rem'
              }}>
                Hệ thống đang tự động kiểm tra trạng thái thanh toán...
              </p>
            </div>
          )}

          {currentGateway === 'vnpay' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '4rem',
                marginBottom: '1rem'
              }}>
                💳
              </div>
              <h4 style={{ marginBottom: '1rem' }}>Đang chuyển đến VNPay...</h4>
              <p style={{ marginBottom: '1rem', color: '#666' }}>
                Nếu trình duyệt không tự mở, bấm nút bên dưới để tới trang thanh toán VNPay.
              </p>
              <button
                onClick={() => paymentUrl && window.open(paymentUrl, '_blank')}
                className="btn btn-primary"
                style={{ 
                  width: '100%', 
                  background: '#A50064',
                  border: 'none',
                  padding: '0.75rem'
                }}
              >
                Mở trang thanh toán VNPay
              </button>
              <p style={{ marginTop: '1rem', color: '#999', fontSize: '0.85rem' }}>
                Lưu ý: Không đóng trình duyệt cho đến khi hoàn tất thanh toán
              </p>
            </div>
          )}

          {!currentGateway && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#666' }}>Sau khi chọn phương thức, hệ thống sẽ tạo thanh toán tương ứng.</p>
            </div>
          )}

          {currentGateway && (
            <button
              onClick={() => {
                setCurrentGateway(null);
                setQrCodeUrl(null);
                setPaymentUrl(null);
              }}
              className="btn btn-outline"
              style={{ width: '100%', marginBottom: '1rem' }}
            >
              Chọn phương thức khác
            </button>
          )}

          <div className="payment-actions" style={{ marginTop: currentGateway ? '0.5rem' : '1.5rem' }}>
            <button
              type="button"
              onClick={() => history.push('/my-bookings')}
              className="btn btn-outline"
              style={{ width: '100%' }}
              disabled={processing}
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
