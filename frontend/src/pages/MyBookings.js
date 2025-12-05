import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const history = useHistory();

  useEffect(() => {
    fetchMyBookings();
  }, []);

  const fetchMyBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/bookings/my-bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookings(response.data.data.bookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handlePayment = (bookingId) => {
    history.push(`/payment/${bookingId}`);
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Bạn có chắc muốn hủy đơn đặt tour này?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/bookings/cancel/${bookingId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Đơn đặt tour đã được hủy thành công!');
      // Refresh danh sách đơn đặt
      fetchMyBookings();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra khi hủy đơn đặt tour';
      alert(errorMessage);
      console.error('Error canceling booking:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'green';
      case 'completed': return 'blue';
      case 'pending': return 'orange';
      case 'cancelled': return 'red';
      default: return 'grey';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('vi-VN');
  };

  return (
    <div className="container my-bookings">
      <h2>Đơn đặt tour của tôi</h2>
      <div className="bookings-list">
        {bookings.length === 0 ? (
          <div className="no-bookings">
            <p>Bạn chưa có đơn đặt tour nào.</p>
          </div>
        ) : (
          bookings.map(booking => {
            // Kiểm tra nếu tour bị null (đã bị xóa)
            if (!booking.tour) {
              return (
                <div key={booking._id} className="booking-card deleted-tour">
                  <div className="booking-header">
                    <h3>⚠️ Tour đã bị xóa</h3>
                    <span className="status-badge" style={{ background: `${getStatusColor(booking.status)}20`, color: getStatusColor(booking.status), border: `1px solid ${getStatusColor(booking.status)}33` }}>
                      {booking.status === 'confirmed' && 'Đã xác nhận'}
                      {booking.status === 'completed' && 'Đã hoàn thành'}
                      {booking.status === 'pending' && 'Đang chờ xác nhận'}
                      {booking.status === 'cancelled' && 'Đã hủy'}
                    </span>
                  </div>
                  <div className="booking-details">
                    <div className="detail">
                      <span>Ngày khởi hành:</span>
                      <strong>{formatDate(booking.startDate)}</strong>
                    </div>
                    <div className="detail">
                      <span>Số người:</span>
                      <strong>{booking.numberOfPeople}</strong>
                    </div>
                    <div className="detail">
                      <span>Tổng tiền:</span>
                      <strong>{booking.price.toLocaleString()} VND</strong>
                    </div>
                    <div className="detail">
                      <span>Trạng thái thanh toán:</span>
                      <strong style={{ color: booking.paid ? '#27ae60' : '#e74c3c' }}>
                        {booking.paid ? '✓ Đã thanh toán' : '✗ Chưa thanh toán'}
                      </strong>
                    </div>
                    <div className="detail">
                      <span>Ngày đặt:</span>
                      <strong>{formatDate(booking.createdAt)}</strong>
                    </div>
                  </div>
                  <p className="warning-text">Tour này đã bị xóa khỏi hệ thống. Vui lòng liên hệ admin để được hỗ trợ.</p>
                </div>
              );
            }

            return (
              <div key={booking._id} className="booking-card">
                <div className="booking-header">
                  <h3>{booking.tour.name}</h3>
                  <span className="status-badge" style={{ background: `${getStatusColor(booking.status)}20`, color: getStatusColor(booking.status), border: `1px solid ${getStatusColor(booking.status)}33` }}>
                    {booking.status === 'confirmed' && 'Đã xác nhận'}
                    {booking.status === 'completed' && 'Đã hoàn thành'}
                    {booking.status === 'pending' && 'Đang chờ xác nhận'}
                    {booking.status === 'cancelled' && 'Đã hủy'}
                  </span>
                </div>
                <div className="booking-details">
                  <div className="detail">
                    <span>Ngày khởi hành:</span>
                    <strong>{formatDate(booking.startDate)}</strong>
                  </div>
                  <div className="detail">
                    <span>Số người:</span>
                    <strong>{booking.numberOfPeople}</strong>
                  </div>
                  <div className="detail">
                    <span>Tổng tiền:</span>
                    <strong>{booking.price.toLocaleString()} VND</strong>
                  </div>
                  <div className="detail">
                    <span>Trạng thái thanh toán:</span>
                    <strong style={{ color: booking.paid ? '#27ae60' : '#e74c3c' }}>
                      {booking.paid ? '✓ Đã thanh toán' : '✗ Chưa thanh toán'}
                    </strong>
                  </div>
                  <div className="detail">
                    <span>Ngày đặt:</span>
                    <strong>{formatDate(booking.createdAt)}</strong>
                  </div>
                </div>
                <div className="booking-actions">
                  {!booking.paid && booking.status !== 'cancelled' && (
                    <button
                      className="btn btn-primary"
                      onClick={() => handlePayment(booking._id)}
                      style={{ marginRight: '0.5rem' }}
                    >
                      💳 Thanh toán
                    </button>
                  )}
                  {(booking.status === 'pending' || booking.status === 'confirmed') && (
                    <button
                      className="btn btn-outline"
                      onClick={() => handleCancelBooking(booking._id)}
                    >
                      Hủy đơn
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MyBookings;
