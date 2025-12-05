import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';

const PaymentFailed = () => {
  const history = useHistory();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const message = params.get('message') || 'Thanh toán thất bại. Vui lòng thử lại.';

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
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>❌</div>
        <h2 style={{ color: '#e74c3c', marginBottom: '1rem' }}>Thanh toán thất bại</h2>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          {decodeURIComponent(message)}
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button 
            onClick={() => history.push('/my-bookings')} 
            className="btn btn-outline"
          >
            Quay lại
          </button>
          <button 
            onClick={() => history.goBack()} 
            className="btn btn-primary"
          >
            Thử lại
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;

