import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import heroBackground from '../assets/hero-bg.jpg';
import SearchBar from '../components/SearchBar';
import { API_URL } from '../config';
import { getImageUrl } from '../utils/imageHelper';

const POPULAR_TOURS_LIMIT = 6;
const NEW_TOURS_LIMIT = 6;
const TOP_RATED_TOURS_LIMIT = 6;

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

const TourCarouselSection = ({
  title,
  subtitle,
  tours,
  showBookings = false,
  showRatingBadge = true,
  ctaLink,
  ctaLabel,
  headingAlign = 'left',
}) => {
  const carouselRef = useRef(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    const container = carouselRef.current;
    if (!container) {
      return undefined;
    }

    const updateNavState = () => {
      if (!container) {
        return;
      }

      const { scrollLeft, scrollWidth, clientWidth } = container;
      const maxScrollLeft = scrollWidth - clientWidth;
      setCanScrollPrev(scrollLeft > 4);
      setCanScrollNext(maxScrollLeft - scrollLeft > 4);
    };

    requestAnimationFrame(updateNavState);
    container.addEventListener('scroll', updateNavState);
    window.addEventListener('resize', updateNavState);

    return () => {
      container.removeEventListener('scroll', updateNavState);
      window.removeEventListener('resize', updateNavState);
    };
  }, [tours]);

  const handleScroll = (direction) => {
    const container = carouselRef.current;
    if (!container) {
      return;
    }

    const firstCard = container.querySelector('.tour-card');
    const styles = window.getComputedStyle(container);
    const gapValue = parseInt(styles.gap || styles.columnGap || '0', 10) || 0;
    const scrollAmount = firstCard
      ? firstCard.offsetWidth + gapValue
      : container.clientWidth * 0.8;

    container.scrollBy({
      left: direction === 'next' ? scrollAmount : -scrollAmount,
      behavior: 'smooth',
    });
  };

  if (!tours || tours.length === 0) {
    return null;
  }

  return (
    <section className="home-section">
      <div className={`section-header ${headingAlign === 'center' ? 'is-centered' : ''}`}>
        <div className="section-heading">
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
        {ctaLink && ctaLabel && (
          <Link to={ctaLink} className="section-link">
            {ctaLabel}
          </Link>
        )}
      </div>

      <div className="tours-carousel-wrapper">
        <button
          type="button"
          className={`carousel-nav-button prev ${
            canScrollPrev ? '' : 'is-disabled'
          }`}
          onClick={() => handleScroll('prev')}
          aria-label="Xem tour phía trước"
        >
          <span className="carousel-nav-icon">&lsaquo;</span>
        </button>

        <div className="tours-carousel" ref={carouselRef}>
          {tours.map((tour) => (
            <Link key={tour._id} to={`/tours/${tour._id}`} className="tour-card">
              <div className="tour-image-wrapper">
                <img
                  src={getImageUrl(
                    tour.images && tour.images.length > 0 ? tour.images[0] : null
                  )}
                  alt={tour.name}
                  className="tour-image"
                />
                {showRatingBadge && tour.averageRating > 0 && (
                  <div className="tour-rating-badge">⭐ {tour.averageRating}</div>
                )}
              </div>
              <div className="tour-info">
                <h3 className="tour-name">{tour.name}</h3>
                <div className="tour-meta">
                  <span className="tour-meta-item">⏱️ {tour.duration} ngày</span>
                  <span className="tour-meta-item">📍 {tour.destination}</span>
                </div>
                {showBookings && tour.bookingsCount > 0 && (
                  <div className="tour-bookings">👥 {tour.bookingsCount} lượt đặt</div>
                )}
                <div className="tour-price">
                  {currencyFormatter.format(tour.price)}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <button
          type="button"
          className={`carousel-nav-button next ${
            canScrollNext ? '' : 'is-disabled'
          }`}
          onClick={() => handleScroll('next')}
          aria-label="Xem tour tiếp theo"
        >
          <span className="carousel-nav-icon">&rsaquo;</span>
        </button>
      </div>
    </section>
  );
};

const Home = () => {
  const [popularTours, setPopularTours] = useState([]);
  const [newTours, setNewTours] = useState([]);
  const [topRatedTours, setTopRatedTours] = useState([]);

  useEffect(() => {
    fetchPopularTours();
    fetchNewTours();
    fetchTopRatedTours();
  }, []);

  const fetchPopularTours = async () => {
    try {
      const response = await axios.get(`${API_URL}/bookings/popular-tours?limit=${POPULAR_TOURS_LIMIT}`);
      setPopularTours(response.data.data.tours || []);
    } catch (error) {
      console.error('Error fetching popular tours:', error);
    }
  };

  const fetchNewTours = async () => {
    try {
      const response = await axios.get(`${API_URL}/tours?sort=-createdAt&limit=${NEW_TOURS_LIMIT}`);
      setNewTours(response.data.data.tours || []);
    } catch (error) {
      console.error('Error fetching new tours:', error);
    }
  };

  const fetchTopRatedTours = async () => {
    try {
      const response = await axios.get(`${API_URL}/tours?sort=-averageRating&limit=${TOP_RATED_TOURS_LIMIT}`);
      const tours = (response.data.data.tours || []).filter(tour => tour.averageRating && tour.averageRating > 0);
      setTopRatedTours(tours);
    } catch (error) {
      console.error('Error fetching top rated tours:', error);
    }
  };

  return (
    <div className="home">
      <div className="hero-section" style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.35)), url(${heroBackground})`
      }}>
        <div className="container">
          <div className="hero-overlay">
            <span className="hero-eyebrow">Dream Vacation Destination</span>
            <h1>Khám phá những điểm đến tuyệt vời</h1>
            <p>Đặt tour du lịch dễ dàng và thuận tiện</p>
            <Link to="/tours" className="cta-button">
              Xem các tour
            </Link>

            {/* SearchBar component với variant hero */}
            <SearchBar variant="hero" />
          </div>
        </div>
      </div>

      <div className="container">
        <div className="features-section">
          <div className="feature">
            <h3>🌍 Tour đa dạng</h3>
            <p>Nhiều lựa chọn tour phù hợp với mọi nhu cầu</p>
          </div>
          <div className="feature">
            <h3>⚡ Đặt tour dễ dàng</h3>
            <p>Quy trình đặt tour đơn giản, nhanh chóng</p>
          </div>
          <div className="feature">
            <h3>💬 Hỗ trợ 24/7</h3>
            <p>Đội ngũ hỗ trợ luôn sẵn sàng giúp đỡ bạn</p>
          </div>
        </div>

        {/* Tours mới ra mắt Section */}
        <TourCarouselSection
          title="Tours mới ra mắt"
          subtitle="Khám phá những hành trình vừa được cập nhật"
          tours={newTours}
          showBookings={false}
          showRatingBadge={true}
          headingAlign="center"
        />

        {/* Tours được đánh giá cao Section */}
        <TourCarouselSection
          title="Tours được đánh giá cao"
          subtitle="Những chuyến đi được khách hàng yêu thích nhất"
          tours={topRatedTours}
          showBookings={false}
          showRatingBadge={true}
          headingAlign="center"
        />

        {/* Tour Nổi Bật Section */}
        <TourCarouselSection
          title="Tour Nổi Bật"
          subtitle="Những tour được đặt nhiều nhất"
          tours={popularTours}
          showBookings={true}
          showRatingBadge={true}
          ctaLink="/tours"
          ctaLabel="Xem tất cả tour"
          headingAlign="center"
        />
        
      </div>
    </div>
  );
};

export default Home;
