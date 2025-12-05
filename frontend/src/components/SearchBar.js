import React, { useState, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import '../styles/searchbar.css';

const SearchBar = ({ variant = 'hero' }) => {
  const history = useHistory();
  const location = useLocation();
  
  const formatDateForInput = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const todayStr = formatDateForInput(new Date());

  const [searchParams, setSearchParams] = useState({
    destination: '',
    startDate: '',
    guests: '2',
    minPrice: '',
    maxPrice: '',
    duration: ''
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Đọc params từ URL khi component mount (cho Tours page)
  useEffect(() => {
    if (variant === 'compact') {
      const params = new URLSearchParams(location.search);
      setSearchParams({
        destination: params.get('destination') || '',
        startDate: params.get('startDate') || '',
        guests: params.get('guests') || '2',
        minPrice: params.get('price[gte]') || '',
        maxPrice: params.get('price[lte]') || '',
        duration: params.get('duration') || ''
      });
    }
  }, [location.search, variant]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    
    // Validate startDate not in the past (if provided)
    if (searchParams.startDate) {
      const selected = new Date(searchParams.startDate);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (selected < startOfToday) {
        alert('Ngày đi không được ở trong quá khứ');
        return;
      }
    }

    const params = new URLSearchParams();
    
    // Tìm kiếm text (destination)
    if (searchParams.destination) {
      params.set('search', searchParams.destination);
      params.set('destination', searchParams.destination);
    }
    
    // Ngày khởi hành
    if (searchParams.startDate) {
      params.set('startDate', searchParams.startDate);
    }

    // Số khách
    if (searchParams.guests) {
      params.set('guests', searchParams.guests);
    }
    
    // Giá
    if (searchParams.minPrice) {
      params.set('price[gte]', searchParams.minPrice);
    }
    if (searchParams.maxPrice) {
      params.set('price[lte]', searchParams.maxPrice);
    }
    
    // Thời lượng
    if (searchParams.duration) {
      params.set('duration', searchParams.duration);
    }

    history.push({ pathname: '/tours', search: params.toString() });
  };

  const handleReset = () => {
    setSearchParams({
      destination: '',
      startDate: '',
      guests: '2',
      minPrice: '',
      maxPrice: '',
      duration: ''
    });
    history.push('/tours');
  };

  // Hero variant (trang Home)
  if (variant === 'hero') {
    return (
      <div className="search-bar-hero">
        <form onSubmit={handleSearch} className="search-form-hero">
          <div className="search-row">
            <div className="search-field">
              <label htmlFor="destination">
                <span className="icon">📍</span>
                Điểm đến
              </label>
              <input
                id="destination"
                name="destination"
                type="text"
                placeholder="Bạn muốn đi đâu?"
                value={searchParams.destination}
                onChange={handleChange}
              />
            </div>

            <div className="search-field">
              <label htmlFor="startDate">
                <span className="icon">📅</span>
                Ngày đi
              </label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                min={todayStr}
                value={searchParams.startDate}
                onChange={handleChange}
              />
            </div>

            <div className="search-field search-field-small">
              <label htmlFor="guests">
                <span className="icon">👥</span>
                Số khách
              </label>
              <input
                id="guests"
                name="guests"
                type="number"
                min="1"
                max="50"
                value={searchParams.guests}
                onChange={handleChange}
              />
            </div>

            <button type="submit" className="btn-search-hero">
              🔍 Tìm
            </button>
          </div>

          {/* Advanced filters toggle */}
          <div className="advanced-toggle">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="btn-toggle-advanced"
            >
              {showAdvanced ? '▲ Ẩn bộ lọc nâng cao' : '▼ Hiển thị bộ lọc nâng cao'}
            </button>
          </div>

          {showAdvanced && (
            <div className="advanced-filters">
              <div className="search-field">
                <label htmlFor="minPrice">Giá thấp nhất (VND)</label>
                <input
                  id="minPrice"
                  name="minPrice"
                  type="number"
                  placeholder="0"
                  value={searchParams.minPrice}
                  onChange={handleChange}
                />
              </div>

              <div className="search-field">
                <label htmlFor="maxPrice">Giá cao nhất (VND)</label>
                <input
                  id="maxPrice"
                  name="maxPrice"
                  type="number"
                  placeholder="50,000,000"
                  value={searchParams.maxPrice}
                  onChange={handleChange}
                />
              </div>

              <div className="search-field">
                <label htmlFor="duration">Số ngày</label>
                <select
                  id="duration"
                  name="duration"
                  value={searchParams.duration}
                  onChange={handleChange}
                >
                  <option value="">Tất cả</option>
                  <option value="1">1 ngày</option>
                  <option value="2">2 ngày</option>
                  <option value="3">3 ngày</option>
                  <option value="4">4 ngày</option>
                  <option value="5">5 ngày</option>
                  <option value="7">7 ngày</option>
                  <option value="10">10 ngày</option>
                </select>
              </div>
            </div>
          )}
        </form>
      </div>
    );
  }

  // Compact variant (trang Tours)
  return (
    <div className="search-bar-compact">
      <form onSubmit={handleSearch} className="search-form-compact">
        <div className="search-row-compact">
          <div className="search-field-compact">
            <input
              name="destination"
              type="text"
              placeholder="🔍 Tìm điểm đến..."
              value={searchParams.destination}
              onChange={handleChange}
            />
          </div>

          <div className="search-field-compact">
            <input
              name="startDate"
              type="date"
              placeholder="Ngày đi"
              min={todayStr}
              value={searchParams.startDate}
              onChange={handleChange}
            />
          </div>

          <div className="search-field-compact search-field-small">
            <input
              name="guests"
              type="number"
              min="1"
              placeholder="Số khách"
              value={searchParams.guests}
              onChange={handleChange}
            />
          </div>

          <button type="submit" className="btn-search-compact">
            Tìm
          </button>

          <button type="button" onClick={handleReset} className="btn-reset">
            Xóa
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchBar;

