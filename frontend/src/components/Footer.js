import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <span className="footer-logo">Travel Booking</span>
          <p>
            Đồng hành cùng bạn trên mọi hành trình. Khám phá điểm đến mới, trải nghiệm dịch vụ tận tâm
            và tận hưởng kỳ nghỉ trọn vẹn.
          </p>
        </div>

        <div className="footer-contact">
          <h4>Liên hệ</h4>
          <ul>
            <li>Hotline: 1900 1234</li>
            <li>Email: khuu1802@gmail.com</li>
            <li>Địa chỉ: 475A Điện Biên Phủ, phường Thạnh Mỹ Tây, TP.HCM</li>
          </ul>
        </div>

        <div className="footer-newsletter">
          <h4>Nhận ưu đãi</h4>
          <p>Đăng ký để nhận tin mới nhất về tour và khuyến mãi.</p>
          <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Email của bạn" aria-label="Email newsletter" />
            <button type="submit">Đăng ký</button>
          </form>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-social">
          <a href="https://www.facebook.com/huu.khang.270573/" target="_blank" rel="noreferrer">Facebook</a>
          <a href="https://www.instagram.com/khang9965/" target="_blank" rel="noreferrer">Instagram</a>
          <a href="https://www.youtube.com/@Tr%E1%BA%A7nH%E1%BB%AFuKhang11" target="_blank" rel="noreferrer">YouTube</a>
        </div>
        <span>© {currentYear} Travel Booking. All rights reserved.</span>
      </div>
    </footer>
  );
};

export default Footer;

