import React, { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const history = useHistory();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    history.push('/');
  };

  return (
    <header className="site-header">
      <div className="nav-topbar">
        <div className="container nav-topbar-inner">
          <div className="nav-contact">
            <span>Hotline: 1900 1234</span>
            <span>Email: khuu1802@gmail.com</span>
          </div>
          <div className="nav-social">
            <a href="https://www.facebook.com/huu.khang.270573/" target="_blank" rel="noreferrer">
              Facebook
            </a>
            <a href="https://www.instagram.com/khang9965/" target="_blank" rel="noreferrer">
              Instagram
            </a>
            <a href="https://www.youtube.com/@Tr%E1%BA%A7nH%E1%BB%AFuKhang11" target="_blank" rel="noreferrer">
              YouTube
            </a>
          </div>
        </div>
      </div>

      <nav className="navbar">
        <div className="container navbar-inner">
          <div className="navbar-brand">
            <Link to="/">Travel Booking</Link>
          </div>
          <button className="navbar-toggle" onClick={() => setMenuOpen(!menuOpen)}>Menu</button>
          <div className={`navbar-menu ${menuOpen ? 'open' : ''}`}>
            <Link to="/tours" onClick={() => setMenuOpen(false)}>Tours</Link>
            <Link to="/tours-360" onClick={() => setMenuOpen(false)}>Tour 360°</Link>
            {isAuthenticated && (
              <>
                <Link to="/my-bookings" onClick={() => setMenuOpen(false)}>
                  Đơn đặt của tôi
                </Link>
                <Link to="/profile" onClick={() => setMenuOpen(false)}>
                  Tài khoản
                </Link>
              </>
            )}
            {isAuthenticated && user?.role === 'admin' && (
              <Link to="/admin" onClick={() => setMenuOpen(false)}>
                Admin Dashboard
              </Link>
            )}
            <div className="navbar-auth-mobile">
              {isAuthenticated ? (
                <button className="btn btn-primary" onClick={handleLogout}>Đăng xuất</button>
              ) : (
                <>
                  <Link className="btn btn-primary" to="/login" onClick={() => setMenuOpen(false)}>Đăng nhập</Link>
                  <Link className="btn btn-primary" to="/register" onClick={() => setMenuOpen(false)}>Đăng ký</Link>
                </>
              )}
            </div>
          </div>
          <div className="navbar-auth">
            {isAuthenticated ? (
              <button className="btn btn-primary" onClick={handleLogout}>Đăng xuất</button>
            ) : (
              <>
                <Link className="btn btn-primary" to="/login">Đăng nhập</Link>
                <Link className="btn btn-primary" to="/register">Đăng ký</Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
