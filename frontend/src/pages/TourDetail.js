import React, { useState, useEffect, useMemo } from 'react';
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
    // Thêm state cho mở rộng tour
    additionalDays: 0,
    additionalPeople: 0,
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
  // Tính tổng tiền (bao gồm mở rộng)
  const { totalPrice, extensionPrice } = useMemo(() => {
    if (!tour) return { totalPrice: 0, extensionPrice: 0 };

    const basePrice = tour.price * booking.numberOfPeople;

    const days = booking.additionalDays || 0;
    const people = booking.additionalPeople || 0;

    if (days === 0 && people === 0) {
      return { totalPrice: basePrice, extensionPrice: 0 };
    }

    // Tính toán giá mỗi ngày và mỗi người, tránh chia cho 0
    const pricePerDay = tour.duration > 0 ? tour.price / tour.duration : 0;
    const pricePerPerson = tour.maxGroupSize > 0 ? tour.price / tour.maxGroupSize : 0;

    const calculatedExtensionPrice = (pricePerDay * days) + (pricePerPerson * people);

    return {
      totalPrice: basePrice + calculatedExtensionPrice,
      extensionPrice: calculatedExtensionPrice
    };
  }, [tour, booking.numberOfPeople, booking.additionalDays, booking.additionalPeople]);

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

    // Xử lý tất cả các input số
    if (['numberOfPeople', 'additionalDays', 'additionalPeople'].includes(name)) {
      const parsed = parseInt(value, 10);

      // Nếu người dùng xóa số, đặt lại giá trị mặc định
      if (isNaN(parsed)) {
        const defaultValue = name === 'numberOfPeople' ? 1 : 0;
        setBooking(prev => ({ ...prev, [name]: defaultValue }));
        return;
      }

      let sanitized = parsed;
      if (name === 'numberOfPeople') {
        sanitized = Math.max(1, sanitized); // Phải có ít nhất 1 người
      } else {
        sanitized = Math.max(0, sanitized); // Ngày và người thêm có thể là 0
      }

      setBooking(prev => ({ ...prev, [name]: sanitized }));
    } else {
      setBooking(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleBooking = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      // 1. Validate inputs
      if (!booking.startDate) {
        alert('Vui lòng chọn ngày khởi hành');
        return;
      }

      const isValidDate = availableDates.some(d => d.value === booking.startDate);
      if (!isValidDate) {
        alert('Ngày khởi hành không hợp lệ. Vui lòng chọn từ lịch.');
        return;
      }

      const peopleCount = booking.numberOfPeople;
      const additionalPeopleCount = booking.additionalPeople || 0;
      const additionalDaysCount = booking.additionalDays || 0;

      // Chỉ kiểm tra giới hạn số người khi không có bất kỳ yêu cầu mở rộng nào
      if (additionalDaysCount === 0 && additionalPeopleCount === 0 && peopleCount > tour.maxGroupSize) {
        alert(`Số người không được vượt quá ${tour.maxGroupSize} người.`);
        return;
      }

      // 2. Prepare payload
      const payload = {
        tour: id,
        numberOfPeople: peopleCount,
        startDate: booking.startDate,
        additionalDays: booking.additionalDays || 0,
        additionalPeople: additionalPeopleCount,
      };

      // 3. Send request to backend
      await axios.post(`${API_URL}/bookings`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const successMessage = booking.additionalDays > 0 || booking.additionalPeople > 0
        ? 'Đặt tour thành công! Yêu cầu mở rộng của bạn đã được gửi và đang chờ admin phê duyệt.'
        : 'Đặt tour thành công!';

      alert(successMessage);

      // 4. Redirect to My Bookings page
      window.location.href = '/my-bookings';

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra khi đặt tour. Vui lòng thử lại!';
      console.error('Error booking tour:', error);
      alert(errorMessage);
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
            <div className="form-group extension-group">
              <label>Mở rộng tour (tùy chọn):</label>
              <div className="extension-inputs">
                <div className="extension-input">
                  <label htmlFor="additionalDays">Thêm ngày:</label>
                  <input
                    type="number"
                    id="additionalDays"
                    name="additionalDays"
                    min="0"
                    step="1"
                    value={booking.additionalDays}
                    onChange={handleBookingChange}
                  />
                </div>
                <div className="extension-input">
                  <label htmlFor="additionalPeople">Thêm người:</label>
                  <input
                    type="number"
                    id="additionalPeople"
                    name="additionalPeople"
                    min="0"
                    step="1"
                    value={booking.additionalPeople}
                    onChange={handleBookingChange}
                  />
                </div>
              </div>
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
              {extensionPrice > 0 && (
                <div className="price-breakdown">
                  <p><span>Giá gốc:</span> <span>{(totalPrice - extensionPrice).toLocaleString()} VND</span></p>
                  <p><span>Phụ thu mở rộng:</span> <span>{Math.round(extensionPrice).toLocaleString()} VND</span></p>
                </div>
              )}
              <div className="final-price">
                <span>Tổng tiền:</span>
                <strong>{Math.round(totalPrice).toLocaleString()} VND</strong>
              </div>
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
