import React, { useState, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import '../styles/filtersidebar.css';

const FilterSidebar = () => {
  const history = useHistory();
  const location = useLocation();

  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    duration: '',
    sortBy: ''
  });

  // Đọc filters từ URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setFilters({
      minPrice: params.get('price[gte]') || '',
      maxPrice: params.get('price[lte]') || '',
      duration: params.get('duration') || '',
      sortBy: params.get('sort') || ''
    });
  }, [location.search]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    const params = new URLSearchParams(location.search);
    
    // Giữ lại search params hiện tại
    const currentSearch = params.get('search');
    const currentDestination = params.get('destination');
    const currentStartDate = params.get('startDate');
    const currentGuests = params.get('guests');

    const newParams = new URLSearchParams();
    
    if (currentSearch) newParams.set('search', currentSearch);
    if (currentDestination) newParams.set('destination', currentDestination);
    if (currentStartDate) newParams.set('startDate', currentStartDate);
    if (currentGuests) newParams.set('guests', currentGuests);

    // Thêm filters mới
    if (filters.minPrice) newParams.set('price[gte]', filters.minPrice);
    if (filters.maxPrice) newParams.set('price[lte]', filters.maxPrice);
    if (filters.duration) newParams.set('duration', filters.duration);
    if (filters.sortBy) newParams.set('sort', filters.sortBy);

    history.push({ pathname: '/tours', search: newParams.toString() });
  };

  const resetFilters = () => {
    setFilters({
      minPrice: '',
      maxPrice: '',
      duration: '',
      sortBy: ''
    });
    
    // Giữ lại search params
    const params = new URLSearchParams(location.search);
    const currentSearch = params.get('search');
    const currentDestination = params.get('destination');
    
    const newParams = new URLSearchParams();
    if (currentSearch) newParams.set('search', currentSearch);
    if (currentDestination) newParams.set('destination', currentDestination);
    
    history.push({ pathname: '/tours', search: newParams.toString() });
  };

  // Quick price filters
  const quickPriceFilters = [
    { label: 'Dưới 2 triệu', min: '', max: '2000000' },
    { label: '2-5 triệu', min: '2000000', max: '5000000' },
    { label: '5-10 triệu', min: '5000000', max: '10000000' },
    { label: 'Trên 10 triệu', min: '10000000', max: '' }
  ];

  const applyQuickPrice = (min, max) => {
    setFilters(prev => ({ ...prev, minPrice: min, maxPrice: max }));
    
    const params = new URLSearchParams(location.search);
    const currentSearch = params.get('search');
    const currentDestination = params.get('destination');
    
    const newParams = new URLSearchParams();
    if (currentSearch) newParams.set('search', currentSearch);
    if (currentDestination) newParams.set('destination', currentDestination);
    if (min) newParams.set('price[gte]', min);
    if (max) newParams.set('price[lte]', max);
    if (filters.duration) newParams.set('duration', filters.duration);
    if (filters.sortBy) newParams.set('sort', filters.sortBy);

    history.push({ pathname: '/tours', search: newParams.toString() });
  };

  return (
    <div className="filter-sidebar">
      <div className="filter-header">
        <h3>Bộ lọc</h3>
        <button onClick={resetFilters} className="btn-reset-filters">
          Xóa tất cả
        </button>
      </div>

      {/* Sắp xếp */}
      <div className="filter-section">
        <h4>Sắp xếp theo</h4>
        <select
          name="sortBy"
          value={filters.sortBy}
          onChange={(e) => {
            handleFilterChange(e);
            setTimeout(applyFilters, 100);
          }}
          className="filter-select"
        >
          <option value="">Mặc định</option>
          <option value="price">Giá thấp đến cao</option>
          <option value="-price">Giá cao đến thấp</option>
          <option value="duration">Thời gian ngắn đến dài</option>
          <option value="-duration">Thời gian dài đến ngắn</option>
          <option value="-createdAt">Mới nhất</option>
        </select>
      </div>

      {/* Khoảng giá nhanh */}
      <div className="filter-section">
        <h4>Khoảng giá</h4>
        <div className="quick-price-filters">
          {quickPriceFilters.map((item, index) => (
            <button
              key={index}
              onClick={() => applyQuickPrice(item.min, item.max)}
              className={`quick-price-btn ${
                filters.minPrice === item.min && filters.maxPrice === item.max
                  ? 'active'
                  : ''
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Giá tùy chỉnh */}
      <div className="filter-section">
        <h4>Giá tùy chỉnh (VND)</h4>
        <div className="price-inputs">
          <div className="price-input-group">
            <label className="price-label">Từ</label>
            <input
              type="number"
              name="minPrice"
              placeholder="0"
              value={filters.minPrice}
              onChange={handleFilterChange}
              className="filter-input"
            />
          </div>
          <div className="price-input-group">
            <label className="price-label">Đến</label>
            <input
              type="number"
              name="maxPrice"
              placeholder="50,000,000"
              value={filters.maxPrice}
              onChange={handleFilterChange}
              className="filter-input"
            />
          </div>
        </div>
      </div>

      {/* Thời lượng */}
      <div className="filter-section">
        <h4>Thời lượng</h4>
        <div className="duration-options">
          {[
            { value: '', label: 'Tất cả' },
            { value: '1', label: '1 ngày' },
            { value: '2', label: '2 ngày' },
            { value: '3', label: '3 ngày' },
            { value: '4', label: '4 ngày' },
            { value: '5', label: '5 ngày' },
            { value: '7', label: '7 ngày' },
            { value: '10', label: '10+ ngày' }
          ].map((option) => (
            <label key={option.value} className="duration-option">
              <input
                type="radio"
                name="duration"
                value={option.value}
                checked={filters.duration === option.value}
                onChange={(e) => {
                  handleFilterChange(e);
                  setTimeout(applyFilters, 100);
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Apply button */}
      <div className="filter-actions">
        <button onClick={applyFilters} className="btn-apply-filters">
          Áp dụng bộ lọc
        </button>
      </div>
    </div>
  );
};

export default FilterSidebar;

