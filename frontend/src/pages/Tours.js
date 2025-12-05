import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import SearchBar from '../components/SearchBar';
import FilterSidebar from '../components/FilterSidebar';
import Pagination from '../components/Pagination';
import { getImageUrl } from '../utils/imageHelper';

const Tours = () => {
  const location = useLocation();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalResults: 0
  });

  useEffect(() => {
    fetchTours();
  }, [location.search]);

  const fetchTours = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(location.search);
      
      // Nếu không có page trong URL, set mặc định là 1
      if (!params.has('page')) {
        params.set('page', '1');
      }
      
      const response = await axios.get(`${API_URL}/tours?${params.toString()}`);
      setTours(response.data.data.tours);
      setPagination({
        currentPage: response.data.currentPage || 1,
        totalPages: response.data.totalPages || 1,
        totalResults: response.data.totalResults || 0
      });
    } catch (error) {
      console.error('Error fetching tours:', error);
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
    <div className="tours-page">
      <div className="container">
        {/* Search Bar ở top */}
        <div className="tours-search-section">
          <SearchBar variant="compact" />
        </div>

        {/* Layout 2 cột: Sidebar + Tours Grid */}
        <div className="tours-layout">
          {/* Filter Sidebar */}
          <aside className="tours-sidebar">
            <FilterSidebar />
          </aside>

          {/* Tours Grid */}
          <main className="tours-main">
            <div className="tours-header">
              <h2>Danh sách tour</h2>
              <p className="tours-count">
                {loading ? 'Đang tải...' : `Tìm thấy ${pagination.totalResults} tour`}
              </p>
            </div>

            {loading ? (
              <div className="loading-state">
                <p>⏳ Đang tải tour...</p>
              </div>
            ) : tours.length === 0 ? (
              <div className="empty-state">
                <p>😔 Không tìm thấy tour phù hợp</p>
                <p className="empty-hint">Thử thay đổi bộ lọc hoặc tìm kiếm khác</p>
              </div>
            ) : (
              <div className="tours-grid">
                {tours.map(tour => (
                  <div key={tour._id} className={`tour-card ${tour.image360Url ? 'tour-card-360' : ''}`}>
                    <div className="tour-image-wrapper">
                      <img
                        src={getImageUrl(tour.images && tour.images.length > 0 ? tour.images[0] : null)}
                        alt={tour.name}
                        className="tour-image"
                      />
                      {tour.image360Url && (
                        <div className="tour-360-badge">
                          🥽 360°
                        </div>
                      )}
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
                        <button
                          className="btn btn-primary btn-view-detail"
                          onClick={() => window.location.href = `/tours/${tour._id}`}
                        >
                          Xem chi tiết
                        </button>
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
    </div>
  );
};

export default Tours;
