import React, { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

const PaymentSuccess = () => {
  const history = useHistory();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const bookingId = params.get('bookingId');

  useEffect(() => {
    // Auto redirect sau 3 giây
    const timer = setTimeout(() => {
      history.push('/my-bookings');
    }, 3000);

    return () => clearTimeout(timer);
  }, [history]);

  return (
    <div className="container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <div style={{ 
        maxWidth: '500px', 
        margin: '0 auto',
        background: '#fff',
        padding: '3rem',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
        <h2 style={{ color: '#27ae60', marginBottom: '1rem' }}>Thanh toán thành công!</h2>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          Đơn đặt tour của bạn đã được thanh toán thành công.
          {bookingId && <><br />Mã đơn: {bookingId.slice(-8)}</>}
        </p>
        <button 
          onClick={() => history.push('/my-bookings')} 
          className="btn btn-primary"
          style={{ width: '100%' }}
        >
          Xem đơn đặt của tôi
        </button>
        <p style={{ marginTop: '1rem', color: '#999', fontSize: '0.9rem' }}>
          Tự động chuyển hướng sau 3 giây...
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;

