import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { getImageUrl } from '../utils/imageHelper';

const Tours360 = () => {
  const location = useLocation();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalResults: 0
  });

  // Helper function để kiểm tra mapCenter hợp lệ
  const hasValidMapCenter = (mapCenter) => {
    return mapCenter && 
           mapCenter.lat !== null && 
           mapCenter.lat !== undefined &&
           mapCenter.lng !== null && 
           mapCenter.lng !== undefined &&
           !isNaN(mapCenter.lat) &&
           !isNaN(mapCenter.lng);
  };

  useEffect(() => {
    fetchTours360();
  }, [location.search]);

  const fetchTours360 = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(location.search);
      
      // Lấy page từ URL hoặc mặc định là 1
      const currentPage = parseInt(params.get('page'), 10) || 1;
      
      // Lấy tất cả tours (không phân trang ở backend, sẽ phân trang ở frontend sau khi filter)
      // Tăng limit lên cao để lấy nhiều tours, sau đó filter và phân trang ở frontend
      params.delete('page'); // Xóa page để lấy tất cả
      params.set('limit', '100'); // Lấy nhiều tours để đảm bảo có đủ tour 360
      
      const response = await axios.get(`${API_URL}/tours?${params.toString()}`);
      const allTours = response.data.data.tours || [];
      
      // Filter chỉ lấy tours đã tích hợp bản đồ (có mapCenter hợp lệ và ít nhất 1 hotspot)
      const toursWithMap = allTours.filter(tour => {
        const hasValidCenter = hasValidMapCenter(tour.mapCenter);
        const hasHotspots = tour.hotspots && Array.isArray(tour.hotspots) && tour.hotspots.length > 0;
        return hasValidCenter && hasHotspots;
      });
      
      // Phân trang ở frontend với limit = 7
      const limit = 7;
      const totalResults = toursWithMap.length;
      const totalPages = Math.ceil(totalResults / limit);
      const skip = (currentPage - 1) * limit;
      const paginatedTours = toursWithMap.slice(skip, skip + limit);
      
      setTours(paginatedTours);
      setPagination({
        currentPage,
        totalPages,
        totalResults
      });
    } catch (error) {
      console.error('Error fetching tours 360:', error);
      setTours([]);
      setPagination({
        currentPage: 1,
        totalPages: 1,
        totalResults: 0
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tours-page tours-360-page">
      <div className="container">
        {/* Header Section */}
        <div className="tours-360-header">
          <h1>Tour 360°</h1>
          <p className="tours-360-subtitle">
            Khám phá các điểm đến tuyệt đẹp với bản đồ tương tác và trải nghiệm 360°
          </p>
        </div>

        {/* Search Bar */}
        <div className="tours-search-section">
          <SearchBar variant="compact" />
        </div>

        {/* Tours Grid */}
        <main className="tours-main">
          <div className="tours-header">
            <h2>Danh sách tour 360°</h2>
            <p className="tours-count">
              {loading ? 'Đang tải...' : `Tìm thấy ${pagination.totalResults} tour 360°`}
            </p>
          </div>

          {loading ? (
            <div className="loading-state">
              <p>⏳ Đang tải tour 360°...</p>
            </div>
          ) : tours.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🗺️</div>
              <p>😔 Chưa có tour 360° nào</p>
              <p className="empty-hint">
                Các tour 360° sẽ được hiển thị ở đây khi admin tích hợp bản đồ và hotspot cho tour.
                <br />
                <strong>Lưu ý:</strong> Tour phải có tọa độ trung tâm bản đồ và ít nhất 1 hotspot mới hiển thị ở đây.
              </p>
              <Link to="/tours" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Xem tất cả tours
              </Link>
            </div>
          ) : (
            <div className="tours-grid">
              {tours.map(tour => (
                <div key={tour._id} className="tour-card tour-card-360">
                  <div className="tour-image-wrapper">
                    <img
                      src={getImageUrl(tour.images && tour.images.length > 0 ? tour.images[0] : null)}
                      alt={tour.name}
                      className="tour-image"
                    />
                    {/* Badge 360° */}
                    <div className="tour-360-badge">
                      🥽 360°
                    </div>
                    {tour.averageRating > 0 && (
                      <div className="tour-rating-badge">
                        ⭐ {tour.averageRating}
                      </div>
                    )}
                  </div>

                  <div className="tour-info">
                    <h3 className="tour-name">{tour.name}</h3>

                    <div className="tour-meta">
                      <span className="tour-meta-item">
                        ⏱️ {tour.duration} ngày
                      </span>
                      <span className="tour-meta-item">
                        📍 {tour.destination}
                      </span>
                    </div>

                    {tour.bookingsCount > 0 && (
                      <div className="tour-bookings">
                        👥 {tour.bookingsCount} lượt đặt
                      </div>
                    )}

                    <div className="tour-footer">
                      <div className="tour-price">
                        <span className="price-label">Từ</span>
                        <span className="price-value">
                          {tour.price.toLocaleString()} ₫
                        </span>
                      </div>
                      <Link
                        to={`/tours-360/${tour._id}`}
                        className="btn btn-primary btn-view-detail"
                      >
                        Xem tour 360°
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && tours.length > 0 && (
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalResults={pagination.totalResults}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default Tours360;








