import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import '../styles/review.css';

const ReviewForm = ({ tourId, onReviewAdded }) => {
  const { isAuthenticated, user } = useAuth();
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [image360Files, setImage360Files] = useState([]);
  const [imageWarning, setImageWarning] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setImageWarning('');

    if (!isAuthenticated) {
      setError('Vui lòng đăng nhập để đánh giá tour');
      return;
    }

    if (!review.trim()) {
      setError('Vui lòng nhập nội dung đánh giá');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');

      // Sử dụng FormData để gửi cả text và file ảnh 360
      const formData = new FormData();
      formData.append('tour', tourId);
      formData.append('rating', parseInt(rating, 10));
      formData.append('review', review.trim());

      if (image360Files && image360Files.length > 0) {
        image360Files.forEach((file) => {
          formData.append('image360', file);
        });
      }

      const response = await axios.post(`${API_URL}/reviews`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          // Để axios tự set boundary cho multipart/form-data
        }
      });

      setSuccess('Đánh giá của bạn đã được gửi thành công!');
      setReview('');
      setRating(5);
      setImage360Files([]);
      setImageWarning('');

      // Gọi callback để cập nhật danh sách đánh giá
      if (onReviewAdded) {
        onReviewAdded();
      }

      // Xóa thông báo sau 3 giây
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Có lỗi xảy ra khi gửi đánh giá';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="review-form-container">
        <p className="login-prompt">
          <a href="/login">Đăng nhập</a> để chia sẻ đánh giá của bạn
        </p>
      </div>
    );
  }

  return (
    <div className="review-form-container">
      <h3>Chia sẻ đánh giá của bạn</h3>
      <form onSubmit={handleSubmit} className="review-form">
        <div className="form-group">
          <label>Đánh giá:</label>
          <div className="rating-input">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`star-btn ${rating >= star ? 'active' : ''}`}
                onClick={() => setRating(star)}
              >
                ★
              </button>
            ))}
            <span className="rating-value">{rating}/5</span>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="review">Nội dung đánh giá:</label>
          <textarea
            id="review"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Chia sẻ trải nghiệm của bạn về tour này..."
            rows="4"
            maxLength="500"
          />
          <small>{review.length}/500 ký tự</small>
        </div>

        <div className="form-group">
          <label htmlFor="image360">Ảnh 360 (tùy chọn):</label>
          <input
            id="image360"
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={(e) => {
              const newFiles = Array.from(e.target.files || []);
              if (newFiles.length === 0) return;

              // Cộng dồn file mới với danh sách hiện tại để có thể chọn từng file nhiều lần
              const combined = [...image360Files, ...newFiles];

              // Giới hạn tối đa 10 ảnh; nếu vượt quá thì bỏ qua phần vượt nhưng vẫn giữ các ảnh hợp lệ
              if (combined.length > 10) {
                setImageWarning(
                  'Bạn chỉ được upload tối đa 10 ảnh 360. Các ảnh vượt quá đã được bỏ qua.'
                );
                const limited = combined.slice(0, 10);
                setImage360Files(limited);
              } else {
                setImageWarning('');
                setImage360Files(combined);
              }

              // Reset input để có thể chọn lại cùng một file nếu cần
              e.target.value = '';
            }}
          />
          <small>
            Bạn có thể chọn từng ảnh một nhiều lần (tối đa 10 ảnh 360 định dạng JPG, JPEG, PNG, mỗi
            ảnh tối đa 10MB).
          </small>
          {image360Files.length > 0 && (
            <small>Đã chọn {image360Files.length}/10 ảnh.</small>
          )}
          {imageWarning && <small style={{ color: '#d39e00' }}>{imageWarning}</small>}
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary submit-btn"
        >
          {loading ? 'Đang gửi...' : 'Gửi đánh giá'}
        </button>
      </form>
    </div>
  );
};

export default ReviewForm;

