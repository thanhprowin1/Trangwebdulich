import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import ReviewForm from '../components/ReviewForm';
import ReviewList from '../components/ReviewList';
import BookingCalendar from '../components/BookingCalendar';
import { getImageUrl } from '../utils/imageHelper';

const TourDetail = () => {
  const { id } = useParams();
  const [tour, setTour] = useState(null);
  const [booking, setBooking] = useState({
    numberOfPeople: 1,
    startDate: '',
  });
  const [refreshReviews, setRefreshReviews] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0); // State cho ảnh đang hiển thị
  const [showAllImagesModal, setShowAllImagesModal] = useState(false); // State cho modal xem tất cả ảnh
  const [modalImageIndex, setModalImageIndex] = useState(0); // State cho ảnh đang xem trong modal

  const formatDateForInput = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = formatDateForInput(new Date());

  useEffect(() => {
    fetchTourDetail();
  }, [id]);

  // Lấy danh sách ngày khởi hành có sẵn (chỉ lấy ngày trong tương lai)
  const getAvailableStartDates = () => {
    if (!tour || !tour.startDates || !Array.isArray(tour.startDates)) {
      return [];
    }
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return tour.startDates
      .map(date => new Date(date))
      .filter(date => date >= startOfToday)
      .sort((a, b) => a - b)
      .map(date => ({
        value: formatDateForInput(date),
        dateObj: date,
        label: date.toLocaleDateString('vi-VN', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      }));
  };

  const availableDates = getAvailableStartDates();

  // Hàm xử lý khi chọn ngày từ calendar
  const handleDateChange = (dateStr) => {
    setBooking(prev => ({
      ...prev,
      startDate: dateStr
    }));
  };

  const fetchTourDetail = async () => {
    try {
      const response = await axios.get(`${API_URL}/tours/${id}`);
      setTour(response.data.data.tour);
    } catch (error) {
      console.error('Error fetching tour details:', error);
    }
  };

  const handleBookingChange = (e) => {
    const { name, value } = e.target;

    if (name === 'numberOfPeople') {
      const parsed = Number(value);
      if (Number.isNaN(parsed)) {
        setBooking(prev => ({ ...prev, numberOfPeople: 1 }));
        return;
      }

      const sanitized = Math.max(
        1,
        Math.min(
          tour?.maxGroupSize ?? parsed,
          Math.floor(parsed)
        )
      );

      setBooking(prev => ({ ...prev, numberOfPeople: sanitized }));
      return;
    }

    setBooking(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBooking = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      // Client-side validate: startDate must be selected and valid
      if (!booking.startDate) {
        alert('Vui lòng chọn ngày khởi hành');
        return;
      }
      
      // Kiểm tra ngày được chọn có nằm trong danh sách startDates của tour không
      const selectedDateStr = booking.startDate;
      const isValidDate = availableDates.some(dateOption => dateOption.value === selectedDateStr);
      
      if (!isValidDate) {
        alert('Ngày khởi hành không hợp lệ. Vui lòng chọn từ danh sách ngày có sẵn.');
        return;
      }
      
      const selected = new Date(booking.startDate);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (selected < startOfToday) {
        alert('Ngày khởi hành không được ở trong quá khứ');
        return;
      }

      const peopleCount = Number(booking.numberOfPeople);
      if (!Number.isInteger(peopleCount) || peopleCount < 1) {
        alert('Số lượng người phải lớn hơn 0');
        return;
      }

      if (peopleCount > tour.maxGroupSize) {
        alert(`Tour chỉ nhận tối đa ${tour.maxGroupSize} người`);
        return;
      }

      await axios.post(`${API_URL}/bookings`, {
        tour: id,
        numberOfPeople: peopleCount,
        startDate: booking.startDate
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Đặt tour thành công!');
      // Refresh tour data để cập nhật bookingsCount
      fetchTourDetail();
      window.location.href = '/my-bookings';
    } catch (error) {
      console.error('Error booking tour:', error);
      alert('Có lỗi xảy ra khi đặt tour. Vui lòng thử lại!');
    }
  };

  const handleReviewAdded = () => {
    setRefreshReviews(prev => prev + 1);
    // Refresh tour data để cập nhật averageRating
    fetchTourDetail();
  };

  const handleReviewsUpdated = (newAverageRating, reviewCount) => {
    // Cập nhật tour data với averageRating và reviewCount mới
    if (tour) {
      setTour({
        ...tour,
        averageRating: newAverageRating,
        ratings: Array(reviewCount).fill(null)  // Cập nhật ratings array length
      });
    }
  };

  // Lấy danh sách ảnh hoặc dùng ảnh mặc định
  const allTourImages = tour && Array.isArray(tour.images) && tour.images.length > 0
    ? tour.images
    : tour ? [null] : [];

  // Chỉ hiển thị tối đa 7 ảnh trong ảnh chính lớn
  const maxMainImages = 7;
  const mainImages = allTourImages.slice(0, maxMainImages);

  // Đảm bảo selectedImageIndex không vượt quá số ảnh chính
  useEffect(() => {
    if (tour && mainImages.length > 0 && selectedImageIndex >= mainImages.length) {
      setSelectedImageIndex(0);
    }
  }, [tour, mainImages.length, selectedImageIndex]);

  if (!tour) return <div>Loading...</div>;

  const reviewCount = Array.isArray(tour.ratings) ? tour.ratings.length : 0;
  const ratingValue = tour.averageRating ? Number(tour.averageRating) : 4.5;
  const formattedRating = ratingValue.toFixed(1);
  const roundedStars = Math.round(ratingValue);
  const bookingsCount = tour.bookingsCount || 0;
  const reviewSnippet = tour.description
    ? `"${tour.description.split('.').filter(Boolean).slice(0, 2).join('. ').trim()}."`
    : '"Trải nghiệm tuyệt vời đang chờ đón bạn."';
  const upcomingDate = Array.isArray(tour.startDates) && tour.startDates.length > 0
    ? new Date([...tour.startDates].sort((a, b) => new Date(a) - new Date(b))[0]).toLocaleDateString('vi-VN')
    : 'Liên hệ';

  const renderStars = () => (
    <div className="star-rating">
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} className={index < roundedStars ? 'filled-star' : ''}>★</span>
      ))}
    </div>
  );

  // Hàm xử lý khi click vào thumbnail
  const handleThumbnailClick = (index) => {
    // Chỉ cho phép chọn ảnh trong 7 ảnh đầu tiên
    if (index < maxMainImages) {
      setSelectedImageIndex(index);
    }
  };

  // Mở modal xem tất cả ảnh
  const openAllImagesModal = (startIndex = 0) => {
    setModalImageIndex(startIndex);
    setShowAllImagesModal(true);
  };

  // Đóng modal
  const closeAllImagesModal = () => {
    setShowAllImagesModal(false);
  };

  // Chuyển ảnh trong modal
  const handleModalPrev = () => {
    setModalImageIndex((prev) => (prev - 1 + allTourImages.length) % allTourImages.length);
  };

  const handleModalNext = () => {
    setModalImageIndex((prev) => (prev + 1) % allTourImages.length);
  };

  return (
    <div className="container tour-detail">
      {/* Image Gallery */}
      <div className="tour-image-gallery">
        {/* Ảnh chính - chỉ hiển thị 7 ảnh đầu */}
        <div className="main-image-container">
          <img
            src={getImageUrl(mainImages[selectedImageIndex])}
            alt={`${tour.name} - Ảnh ${selectedImageIndex + 1}`}
            className="main-image"
          />
          {mainImages.length > 1 && (
            <div className="image-counter">
              {selectedImageIndex + 1} / {mainImages.length}
            </div>
          )}
        </div>

        {/* Thư viện ảnh thu nhỏ - chỉ hiển thị 7 ảnh đầu + nút xem thêm */}
        {allTourImages.length > 1 && (
          <div className="thumbnail-gallery">
            {allTourImages.slice(0, maxMainImages).map((image, index) => {
              const isSelected = index === selectedImageIndex;
              return (
                <div
                  key={index}
                  className={`thumbnail-item ${isSelected ? 'active' : ''}`}
                  onClick={() => handleThumbnailClick(index)}
                >
                  <img
                    src={getImageUrl(image)}
                    alt={`${tour.name} - Thumbnail ${index + 1}`}
                  />
                </div>
              );
            })}
            {/* Nút hiển thị số ảnh còn lại nếu có nhiều hơn 7 ảnh */}
            {allTourImages.length > maxMainImages && (
              <button
                type="button"
                className="thumbnail-more-btn"
                onClick={() => openAllImagesModal(maxMainImages)}
              >
                +{allTourImages.length - maxMainImages} ảnh nữa
              </button>
            )}
          </div>
        )}

        {/* Modal xem tất cả ảnh */}
        {showAllImagesModal && (
          <div className="all-images-modal-backdrop" onClick={closeAllImagesModal}>
            <div
              className="all-images-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="all-images-close-btn"
                onClick={closeAllImagesModal}
              >
                ✕
              </button>
              <h3 className="all-images-modal-title">
                Tất cả ảnh tour ({modalImageIndex + 1}/{allTourImages.length})
              </h3>
              <div className="all-images-modal-content">
                <img
                  src={getImageUrl(allTourImages[modalImageIndex])}
                  alt={`${tour.name} - Ảnh ${modalImageIndex + 1}`}
                  className="all-images-modal-img"
                />
                {allTourImages.length > 1 && (
                  <div className="all-images-modal-controls">
                    <button
                      type="button"
                      className="all-images-nav-btn"
                      onClick={handleModalPrev}
                    >
                      ‹ Trước
                    </button>
                    <button
                      type="button"
                      className="all-images-nav-btn"
                      onClick={handleModalNext}
                    >
                      Sau ›
                    </button>
                  </div>
                )}
              </div>
              {/* Thumbnail navigation trong modal */}
              <div className="all-images-modal-thumbnails">
                {allTourImages.map((image, index) => (
                  <div
                    key={index}
                    className={`all-images-thumbnail-item ${index === modalImageIndex ? 'active' : ''}`}
                    onClick={() => setModalImageIndex(index)}
                  >
                    <img
                      src={getImageUrl(image)}
                      alt={`Thumbnail ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="tour-main">
        <div className="tour-info">
          <h1>{tour.name}</h1>

          <div className="tour-highlights">
            <div className="highlight-card">
              <span className="highlight-title">Đánh giá trung bình</span>
              <div className="highlight-value">
                <span className="highlight-score">{formattedRating}</span>
                {renderStars()}
              </div>
              <span className="highlight-subtext">
                {reviewCount > 0 ? `${reviewCount} lượt đánh giá` : 'Chưa có đánh giá'}
              </span>
            </div>
            <div className="highlight-card">
              <span className="highlight-title">Số lượt đặt</span>
              <div className="highlight-value">
                {bookingsCount !== undefined && bookingsCount !== null ? bookingsCount : 0}
              </div>
              <span className="highlight-subtext">Khách đã chọn tour này</span>
            </div>
            <div className="highlight-card">
              <span className="highlight-title">Khởi hành gần nhất</span>
              <div className="highlight-value">{upcomingDate}</div>
              <span className="highlight-subtext">Tối đa {tour.maxGroupSize} khách</span>
            </div>
          </div>

          <p className="description">{tour.description}</p>

          <div className="tour-specs">
            <div className="spec"><span>Giá:</span> <strong>{tour.price.toLocaleString()} VND</strong></div>
            <div className="spec"><span>Thời gian:</span> <strong>{tour.duration} ngày</strong></div>
            <div className="spec"><span>Điểm đến:</span> <strong>{tour.destination}</strong></div>
            <div className="spec"><span>Số người tối đa:</span> <strong>{tour.maxGroupSize} người</strong></div>
          </div>

          <div className="reviews-section">
            <ReviewForm tourId={id} onReviewAdded={handleReviewAdded} />
            <ReviewList tourId={id} refreshTrigger={refreshReviews} onReviewsUpdated={handleReviewsUpdated} />
          </div>
        </div>

        <div className="booking-section">
          <h2>Đặt Tour</h2>
          <div className="booking-form">
            <div className="form-group">
              <label>Số người:</label>
              <input
                type="number"
                name="numberOfPeople"
                min="1"
                max={tour.maxGroupSize}
                step="1"
                value={booking.numberOfPeople}
                onChange={handleBookingChange}
              />
            </div>
            <div className="form-group">
              <label>Ngày khởi hành:</label>
              {availableDates.length === 0 ? (
                <div style={{ 
                  padding: '1rem', 
                  background: '#fff3cd', 
                  border: '1px solid #ffc107', 
                  borderRadius: '4px',
                  color: '#856404'
                }}>
                  <strong>⚠️ Tour này chưa có ngày khởi hành khả dụng.</strong>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                    Vui lòng liên hệ admin để được hỗ trợ.
                  </p>
                </div>
              ) : (
                <div className="calendar-container">
                  <BookingCalendar
                    availableDates={availableDates}
                    selectedDate={booking.startDate}
                    onDateChange={handleDateChange}
                  />
                  {booking.startDate && (
                    <div className="selected-date-info">
                      <p>
                        <strong>Ngày đã chọn:</strong>{' '}
                        {new Date(booking.startDate).toLocaleDateString('vi-VN', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                  <div className="calendar-legend">
                    <div className="legend-item">
                      <span className="legend-available"></span>
                      <span>Có tour (có thể chọn)</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-unavailable"></span>
                      <span>Không có tour</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="total-price">
              Tổng tiền: {(tour.price * booking.numberOfPeople).toLocaleString()} VND
            </div>
            <button 
              onClick={handleBooking} 
              className="btn btn-primary book-button"
              disabled={availableDates.length === 0}
            >
              {availableDates.length === 0 ? 'Không thể đặt tour' : 'Đặt ngay'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TourDetail;
