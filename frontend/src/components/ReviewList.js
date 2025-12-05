import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import '../styles/review.css';

const ReviewList = ({ tourId, refreshTrigger, onReviewsUpdated }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editReviewId, setEditReviewId] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editText, setEditText] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editImageFiles, setEditImageFiles] = useState([]);
  const [editImageWarning, setEditImageWarning] = useState('');
  const [editRemoveImageUrls, setEditRemoveImageUrls] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [viewerReloadToken, setViewerReloadToken] = useState(0);
  const [pannellumViewer, setPannellumViewer] = useState(null);

  useEffect(() => {
    fetchReviews();
  }, [tourId, refreshTrigger]);

  // Khởi tạo viewer 360° khi mở modal
  useEffect(() => {
    if (
      !isModalOpen ||
      !selectedImages ||
      selectedImages.length === 0 ||
      selectedImageIndex < 0 ||
      selectedImageIndex >= selectedImages.length ||
      !window.pannellum
    ) {
      return undefined;
    }

    let viewerInstance = null;

    try {
      const container = document.getElementById('review-panorama-360-viewer');
      if (container) {
        container.innerHTML = '';
      }

      viewerInstance = window.pannellum.viewer('review-panorama-360-viewer', {
        type: 'equirectangular',
        panorama: selectedImages[selectedImageIndex],
        autoLoad: true,
        autoRotate: 0,
        showControls: true,
        showFullscreenCtrl: true,
        showZoomCtrl: true,
        hfov: 100,
        minHfov: 50,
        maxHfov: 120,
        compass: false
      });

      setPannellumViewer(viewerInstance);
    } catch (err) {
      console.error('Error initializing review 360 viewer:', err);
    }

    return () => {
      if (viewerInstance && window.pannellum) {
        try {
          viewerInstance.destroy();
        } catch (e) {
          // ignore cleanup errors
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, selectedImages, selectedImageIndex, viewerReloadToken]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/reviews/tour/${tourId}`);
      const reviewsList = response.data.data.reviews || [];
      setReviews(reviewsList);
      setAverageRating(response.data.averageRating || 0);
      setError('');

      // Debug: Log để kiểm tra
      console.log('Current user:', user);
      console.log('Reviews:', reviewsList);

      // Gọi callback để cập nhật tour data
      if (onReviewsUpdated) {
        onReviewsUpdated(response.data.averageRating || 0, reviewsList.length);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Không thể tải đánh giá');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đánh giá này?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Tải lại danh sách đánh giá để cập nhật rating trung bình
      await fetchReviews();
      alert('Đánh giá đã được xóa');
    } catch (err) {
      console.error('Error deleting review:', err);
      const errorMessage = err.response?.data?.message || 'Có lỗi xảy ra khi xóa đánh giá';
      alert(errorMessage);
    }
  };

  const startEditReview = (review) => {
    setEditReviewId(review._id);
    setEditRating(review.rating);
    setEditText(review.review || '');
    setEditError('');
    setEditImageFiles([]);
    setEditImageWarning('');
    setEditRemoveImageUrls([]);
  };

  const cancelEditReview = () => {
    setEditReviewId(null);
    setEditRating(5);
    setEditText('');
    setEditError('');
    setEditImageFiles([]);
    setEditImageWarning('');
    setEditRemoveImageUrls([]);
  };

  const handleUpdateReview = async (reviewId) => {
    if (!editText.trim()) {
      setEditError('Vui lòng nhập nội dung đánh giá');
      return;
    }

    setEditLoading(true);
    setEditError('');

    try {
      const token = localStorage.getItem('token');

      // Sử dụng FormData để có thể gửi kèm ảnh mới (nếu có)
      const formData = new FormData();
      formData.append('review', editText.trim());
      formData.append('rating', parseInt(editRating, 10));

      if (editImageFiles && editImageFiles.length > 0) {
        editImageFiles.forEach((file) => {
          formData.append('image360', file);
        });
      }

      if (editRemoveImageUrls && editRemoveImageUrls.length > 0) {
        formData.append('removeImageUrls', JSON.stringify(editRemoveImageUrls));
      }

      await axios.patch(`${API_URL}/reviews/${reviewId}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          // Để axios tự set multipart boundary
        }
      });

      await fetchReviews();
      cancelEditReview();
    } catch (err) {
      console.error('Error updating review:', err);
      const errorMessage = err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật đánh giá';
      setEditError(errorMessage);
    } finally {
      setEditLoading(false);
    }
  };

  const renderStars = (rating) => (
    <div className="star-rating">
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} className={index < Math.round(rating) ? 'filled-star' : ''}>
          ★
        </span>
      ))}
    </div>
  );

  const open360Modal = (images, index = 0) => {
    setSelectedImages(images || []);
    setSelectedImageIndex(index || 0);
    setIsModalOpen(true);
    setViewerReloadToken((prev) => prev + 1);
  };

  const close360Modal = () => {
    setIsModalOpen(false);
    setSelectedImages([]);
    setSelectedImageIndex(0);
    if (pannellumViewer && window.pannellum) {
      try {
        pannellumViewer.destroy();
      } catch (e) {
        // ignore
      }
      setPannellumViewer(null);
    }
  };

  const handlePrevImage = () => {
    setSelectedImageIndex((prev) => {
      if (!selectedImages || selectedImages.length === 0) return prev;
      return (prev - 1 + selectedImages.length) % selectedImages.length;
    });
    setViewerReloadToken((prev) => prev + 1);
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => {
      if (!selectedImages || selectedImages.length === 0) return prev;
      return (prev + 1) % selectedImages.length;
    });
    setViewerReloadToken((prev) => prev + 1);
  };

  if (loading) {
    return <div className="reviews-loading">Đang tải đánh giá...</div>;
  }

  return (
    <div className="reviews-list-container">
      <div className="reviews-header">
        <h3>Đánh giá từ khách hàng</h3>
        <div className="average-rating">
          <span className="rating-score">{averageRating}</span>
          {renderStars(averageRating)}
          <span className="review-count">({reviews.length} đánh giá)</span>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {reviews.length === 0 ? (
        <div className="no-reviews">
          <p>Chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ trải nghiệm của bạn!</p>
        </div>
      ) : (
        <div className="reviews-list">
          {reviews.map((review) => (
            <div key={review._id} className="review-item">
              <div className="review-header">
                <div className="reviewer-info">
                  <span className="reviewer-name">{review.user?.name || 'Ẩn danh'}</span>
                  <span className="review-date">
                    {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div className="review-rating">
                  {renderStars(review.rating)}
                  <span className="rating-number">{review.rating}/5</span>
                </div>
              </div>

              {editReviewId === review._id ? (
                <div className="review-edit-form">
                  <div className="review-edit-rating">
                    <span>Chỉnh sửa đánh giá:</span>
                    <div className="rating-input">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className={`star-btn ${editRating >= star ? 'active' : ''}`}
                          onClick={() => setEditRating(star)}
                        >
                          ★
                        </button>
                      ))}
                      <span className="rating-value">{editRating}/5</span>
                    </div>
                  </div>
                  <textarea
                    className="review-edit-textarea"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows="3"
                    maxLength="500"
                  />
                  <div className="review-edit-images">
                    {(() => {
                      // Tính số ảnh hiện có (trừ các ảnh đã tích xóa)
                      const existingImages =
                        review.image360Urls && review.image360Urls.length > 0
                          ? review.image360Urls
                          : review.image360Url
                          ? [review.image360Url]
                          : [];

                      const remainingExistingCount = existingImages.filter(
                        (url) => !editRemoveImageUrls.includes(url)
                      ).length;

                      const totalSelected = remainingExistingCount + editImageFiles.length;

                      return (
                        <>
                          <label htmlFor={`edit-image360-${review._id}`}>
                            Ảnh 360 (có thể chọn lại):
                          </label>
                          <input
                            id={`edit-image360-${review._id}`}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png"
                            multiple
                            onChange={(e) => {
                              const newFiles = Array.from(e.target.files || []);
                              if (newFiles.length === 0) return;

                              const combinedNew = [...editImageFiles, ...newFiles];
                              const maxNewAllowed = Math.max(0, 10 - remainingExistingCount);

                              if (combinedNew.length > maxNewAllowed) {
                                setEditImageWarning(
                                  'Tổng số ảnh tối đa là 10. Một số ảnh mới đã được bỏ qua.'
                                );
                                setEditImageFiles(combinedNew.slice(0, maxNewAllowed));
                              } else {
                                setEditImageWarning('');
                                setEditImageFiles(combinedNew);
                              }

                              e.target.value = '';
                            }}
                          />
                          <small>
                            Tổng ảnh sẽ được lưu cho đánh giá này tối đa là 10 (bao gồm ảnh cũ còn
                            giữ và ảnh mới thêm).
                          </small>
                          <small>
                            Đã chọn {totalSelected}/10 ảnh ({remainingExistingCount} ảnh hiện có,{' '}
                            {editImageFiles.length} ảnh mới).
                          </small>
                          {editImageWarning && (
                            <small style={{ color: '#d39e00' }}>{editImageWarning}</small>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <div className="review-edit-actions">
                    <button
                      type="button"
                      className="btn btn-secondary review-edit-cancel"
                      onClick={cancelEditReview}
                      disabled={editLoading}
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary review-edit-save"
                      onClick={() => handleUpdateReview(review._id)}
                      disabled={editLoading}
                    >
                      {editLoading ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  </div>
                  {editError && <div className="error-message">{editError}</div>}
                </div>
              ) : (
                <p className="review-text">{review.review}</p>
              )}

              {(() => {
                const images =
                  (review.image360Urls && review.image360Urls.length > 0
                    ? review.image360Urls
                    : review.image360Url
                    ? [review.image360Url]
                    : []);

                if (!images || images.length === 0) {
                  return null;
                }

                const maxThumbnails = 5; // khi không chỉnh sửa chỉ hiển thị trước 5 ảnh
                const visibleImages =
                  editReviewId === review._id ? images : images.slice(0, maxThumbnails);
                const remainingCount =
                  editReviewId === review._id ? 0 : images.length - visibleImages.length;

                return (
                  <div className="review-image360">
                    <p>Ảnh 360 từ khách ({images.length}):</p>
                    <div className="review-image360-list">
                      {visibleImages.map((imgUrl, index) => {
                        const isEditing = editReviewId === review._id;
                        const isMarkedForRemoval =
                          isEditing && editRemoveImageUrls.includes(imgUrl);

                        return (
                          <div
                            key={imgUrl + index}
                            className="review-image360-item"
                          >
                            <button
                              type="button"
                              className="review-image360-thumbnail"
                              onClick={
                                isEditing || isMarkedForRemoval
                                  ? undefined
                                  : () => open360Modal(images, index)
                              }
                            >
                              <img
                                src={imgUrl}
                                alt={`Ảnh 360 đánh giá tour ${index + 1}`}
                                className={`review-image360-img${
                                  isMarkedForRemoval ? ' review-image360-img-removed' : ''
                                }`}
                              />
                              <div className="review-360-overlay">
                                <div className="review-360-icon">360°</div>
                                <div className="review-360-subtext">
                                  {isMarkedForRemoval
                                    ? 'Ảnh này sẽ bị xóa'
                                    : `Nhấn để xem ảnh ${index + 1}/${images.length}`}
                                </div>
                              </div>
                            </button>

                            {isEditing && (
                              <label className="review-image360-remove">
                                <input
                                  type="checkbox"
                                  checked={isMarkedForRemoval}
                                  onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    setEditRemoveImageUrls((prev) =>
                                      isChecked
                                        ? [...prev, imgUrl]
                                        : prev.filter((url) => url !== imgUrl)
                                    );
                                  }}
                                />
                                {isMarkedForRemoval ? 'Bỏ xóa ảnh này' : 'Xóa ảnh này'}
                              </label>
                            )}
                          </div>
                        );
                      })}
                      {remainingCount > 0 && (
                        <button
                          type="button"
                          className="review-image360-more-btn"
                          onClick={() => open360Modal(images, 0)}
                        >
                          +{remainingCount} ảnh nữa
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {user && (user.id === review.user?._id || user._id === review.user?._id) && (
                <div className="review-actions">
                  {editReviewId === review._id ? (
                    // Khi đang chỉnh sửa, nút Hủy/Lưu đã có trong form
                    null
                  ) : (
                    <>
                      <button
                        className="edit-btn"
                        onClick={() => startEditReview(review)}
                      >
                        Sửa
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteReview(review._id)}
                      >
                        Xóa
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {isModalOpen && selectedImages && selectedImages.length > 0 && (
        <div className="review-360-modal-backdrop" onClick={close360Modal}>
          <div
            className="review-360-modal"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <button type="button" className="review-360-close-btn" onClick={close360Modal}>
              ✕
            </button>
            <h4 className="review-360-modal-title">
              Trải nghiệm ảnh 360° từ khách ({selectedImageIndex + 1}/{selectedImages.length})
            </h4>
            {selectedImages.length > 1 && (
              <div className="review-360-modal-controls">
                <button
                  type="button"
                  className="review-360-nav-btn"
                  onClick={handlePrevImage}
                >
                  ‹ Trước
                </button>
                <button
                  type="button"
                  className="review-360-nav-btn"
                  onClick={handleNextImage}
                >
                  Sau ›
                </button>
              </div>
            )}
            <div
              id="review-panorama-360-viewer"
              key={viewerReloadToken}
              className="review-360-viewer"
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewList;

