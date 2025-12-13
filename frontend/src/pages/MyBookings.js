import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import BookingDetailModal from '../components/BookingDetailModal';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const history = useHistory();
  const [selectedBooking, setSelectedBooking] = useState(null);

  // State cho form mở rộng tour
  const [extendForm, setExtendForm] = useState({
    openFor: null, // bookingId đang mở form
    additionalDays: 0,
    additionalPeople: 0,
    loading: false
  });

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

  const calculateEndDate = (booking) => {
    const startDate = new Date(booking.startDate);

    // Parse số ngày của tour an toàn (có thể là number hoặc string như "3 ngày")
    const parseDuration = (val) => {
      if (typeof val === 'number' && !Number.isNaN(val)) return val;
      if (typeof val === 'string') {
        const m = val.match(/[0-9]+/);
        if (m) return parseInt(m[0], 10);
      }
      return 0;
    };

    // Tính tổng số ngày: thời gian tour + thời gian thêm (nếu có)
    let totalDays = parseDuration(booking?.tour?.duration);
    if (booking.extension?.additionalDays > 0 && booking.extension?.extensionStatus === 'approved') {
      totalDays += booking.extension.additionalDays;
    }

    if (!totalDays) return startDate; // fallback

    // Cộng thêm (totalDays - 1) vì ngày khởi hành là ngày 1
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + totalDays - 1);
    return endDate;
  };

  return (
    <div className="my-bookings-wrapper">
    <div className="container my-bookings">
      <div className="my-bookings-header">
        <h2>Đơn đặt tour của tôi</h2>
        <button onClick={fetchMyBookings} className="btn btn-secondary">
          🔄 Làm mới
        </button>
      </div>
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
                      {(() => {
                        const ext = booking.extension || {};
                        const finalPrice = typeof booking.finalPrice === 'number'
                          ? booking.finalPrice
                          : (ext.extensionStatus === 'approved'
                              ? (ext.totalPrice || (booking.price + (ext.extensionPrice || 0)))
                              : booking.price);
                        return <strong>{finalPrice.toLocaleString()} VND</strong>;
                      })()}
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
                    <span>Ngày kết thúc:</span>
                    <strong>{formatDate(calculateEndDate(booking))}</strong>
                  </div>
                  <div className="detail">
                    <span>Số người:</span>
                    <strong>
                      {booking.numberOfPeople}
                      {booking.extension?.extensionStatus === 'pending' && booking.extension?.additionalPeople > 0 && (
                        <span style={{ color: 'orange', marginLeft: '5px' }}>(+{booking.extension.additionalPeople})</span>
                      )}
                    </strong>
                  </div>
                  <div className="detail">
                    <span>Tổng tiền:</span>
                    {(() => {
                      const ext = booking.extension || {};
                      const finalPrice = typeof booking.finalPrice === 'number'
                        ? booking.finalPrice
                        : (ext.extensionStatus === 'approved'
                            ? (ext.totalPrice || (booking.price + (ext.extensionPrice || 0)))
                            : booking.price);
                      return <strong>{finalPrice.toLocaleString()} VND</strong>;
                    })()}
                  </div>

                  <div className="detail">
                    <span>Thời gian:</span>
                    <strong>
                      {(() => {
                        const d = booking?.tour?.duration;
                        if (typeof d === 'number') return `${d} ngày`;
                        if (typeof d === 'string' && d.trim()) return d; // ví dụ: "3 ngày"
                        return '—';
                      })()}
                      {booking.extension?.additionalDays > 0 && (
                        <span
                          style={{
                            color:
                              booking.extension.extensionStatus === 'approved'
                                ? 'green'
                                : booking.extension.extensionStatus === 'pending'
                                ? 'orange'
                                : '#999',
                            marginLeft: '5px'
                          }}
                        >
                          (+{booking.extension.additionalDays})
                        </span>
                      )}
                    </strong>
                  </div>
                  {booking.extension && booking.extension.extensionStatus !== 'none' && (
                    <div className="extension-info" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #eee' }}>
                      <div className="detail">
                        <span>Trạng thái mở rộng:</span>
                        <strong>
                          {booking.extension.extensionStatus === 'pending' && <span style={{ color: 'orange' }}>Đang chờ duyệt</span>}
                          {booking.extension.extensionStatus === 'approved' && <span style={{ color: 'green' }}>Đã phê duyệt</span>}
                          {booking.extension.extensionStatus === 'rejected' && <span style={{ color: 'red' }}>Bị từ chối</span>}
                        </strong>
                      </div>

                      {booking.extension.extensionPrice > 0 && (
                        <div className="detail price-breakdown">
                          {booking.extension.extensionStatus === 'pending' ? (
                            <>
                              <p><span>Phụ thu (chờ duyệt):</span> <span>{booking.extension.extensionPrice.toLocaleString()} VND</span></p>
                              <p><strong><span>Tổng dự kiến:</span> <span>{booking.extension.totalPrice.toLocaleString()} VND</span></strong></p>
                            </>
                          ) : (
                            <>
                              <p><span>Phụ thu đã duyệt:</span> <span>{booking.extension.extensionPrice.toLocaleString()} VND</span></p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
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
                <div className="booking-actions" style={{ marginTop: '8px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setSelectedBooking(booking)}
                    style={{ marginRight: '0.5rem' }}
                  >
                    👁️ Xem chi tiết
                  </button>
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

      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}



    </div>
    </div>
  );
};

export default MyBookings;

