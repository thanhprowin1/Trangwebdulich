import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL, BASE_URL } from '../config';
import '../styles/Profile.css';

const Profile = () => {
  const [activeTab, setActiveTab] = useState('info');
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Form states
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    address: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userData = response.data.data.user;
      setUser(userData);
      setProfileForm({
        name: userData.name || '',
        email: userData.email || '',
        phoneNumber: userData.phoneNumber || '',
        address: userData.address || ''
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setMessage({ type: 'error', text: 'Không thể tải thông tin người dùng' });
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/users/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      // Gửi tất cả các field trong profileForm để đảm bảo cập nhật đầy đủ
      const updateData = {
        name: profileForm.name || '',
        email: profileForm.email || '',
        phoneNumber: profileForm.phoneNumber || '',
        address: profileForm.address || ''
      };
      
      const response = await axios.patch(`${API_URL}/users/profile`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUser(response.data.data.user);
      setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
      
      // Cập nhật localStorage
      const storedUser = JSON.parse(localStorage.getItem('user'));
      localStorage.setItem('user', JSON.stringify({ ...storedUser, ...response.data.data.user }));
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật thông tin' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu mới và xác nhận mật khẩu không khớp' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/users/update-password`, passwordForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Có lỗi xảy ra khi đổi mật khẩu' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Vui lòng chọn file ảnh!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Kích thước file không được vượt quá 5MB!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    setUploadingAvatar(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'Bạn cần đăng nhập để upload ảnh!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        setUploadingAvatar(false);
        return;
      }

      const formData = new FormData();
      formData.append('avatar', file);

      const response = await axios.post(`${API_URL}/users/avatar`, formData, {
        headers: {
          Authorization: `Bearer ${token}`
          // Không set Content-Type, để axios tự động set với boundary cho multipart/form-data
        }
      });

      if (response.data.status === 'success') {
        setUser(response.data.data.user);
        setMessage({ type: 'success', text: 'Cập nhật ảnh đại diện thành công!' });
        
        // Cập nhật localStorage
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) {
          localStorage.setItem('user', JSON.stringify({ ...storedUser, ...response.data.data.user }));
        }
        
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        throw new Error(response.data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      let errorMessage = 'Có lỗi xảy ra khi tải ảnh đại diện';
      
      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.message || errorMessage;
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Không thể kết nối đến server. Vui lòng thử lại sau.';
      } else {
        // Something else happened
        errorMessage = error.message || errorMessage;
      }
      
      setMessage({ 
        type: 'error', 
        text: errorMessage
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } finally {
      setUploadingAvatar(false);
      // Reset input
      e.target.value = '';
    }
  };


  const handleDeleteAccount = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài khoản? Hành động này không thể hoàn tác!')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/users/delete-account`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { password: deletePassword }
      });
      
      // Xóa thông tin đăng nhập và chuyển về trang chủ
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Có lỗi xảy ra khi xóa tài khoản' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  // Helper function to get avatar URL
  const getAvatarUrl = () => {
    if (user?.avatar) {
      // If avatar is a full URL, return it; otherwise prepend BASE_URL
      return user.avatar.startsWith('http') ? user.avatar : `${BASE_URL}${user.avatar}`;
    }
    return null;
  };

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h1>Quản lý tài khoản</h1>

        {/* User Info Card */}
        <div className="user-info-card">
          <div className="user-avatar">
            <div className="avatar-circle" style={getAvatarUrl() ? {
              backgroundImage: `url(${getAvatarUrl()})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            } : {}}>
              {!getAvatarUrl() && user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="avatar-upload-overlay">
              <label htmlFor="avatar-upload" className="avatar-upload-label">
                {uploadingAvatar ? 'Đang tải...' : '📷'}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
                disabled={uploadingAvatar}
              />
            </div>
          </div>
          <div className="user-details">
            <h2>{user?.name}</h2>
            <p>{user?.email}</p>
            <span className="user-role">{user?.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}</span>
          </div>
          {stats && (
            <div className="user-stats">
              <div className="stat-item">
                <span className="stat-number">{stats.totalBookings}</span>
                <span className="stat-label">Đơn đặt tour</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{stats.totalReviews}</span>
                <span className="stat-label">Đánh giá</span>
              </div>
            </div>
          )}
        </div>

        {/* Message */}
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="profile-tabs">
          <button 
            className={activeTab === 'info' ? 'active' : ''} 
            onClick={() => setActiveTab('info')}
          >
            Thông tin cá nhân
          </button>
          <button 
            className={activeTab === 'password' ? 'active' : ''} 
            onClick={() => setActiveTab('password')}
          >
            Đổi mật khẩu
          </button>
          <button 
            className={activeTab === 'settings' ? 'active' : ''} 
            onClick={() => setActiveTab('settings')}
          >
            Cài đặt
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* Thông tin cá nhân */}
          {activeTab === 'info' && (
            <div>
              <form onSubmit={handleProfileUpdate} className="profile-form">
                <h3>Cập nhật thông tin cá nhân</h3>
                
                <div className="form-group">
                  <label>Họ và tên</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Số điện thoại</label>
                  <input
                    type="tel"
                    value={profileForm.phoneNumber}
                    onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                    placeholder="Nhập số điện thoại"
                  />
                </div>

                <div className="form-group">
                  <label>Địa chỉ</label>
                  <textarea
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    placeholder="Nhập địa chỉ"
                    rows="3"
                  />
                </div>

                <button type="submit" className="btn-primary">
                  Cập nhật thông tin
                </button>
              </form>
            </div>
          )}

          {/* Đổi mật khẩu */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordUpdate} className="profile-form">
              <h3>Đổi mật khẩu</h3>
              
              <div className="form-group">
                <label>Mật khẩu hiện tại</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Mật khẩu mới</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  minLength="6"
                />
              </div>

              <div className="form-group">
                <label>Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                  minLength="6"
                />
              </div>

              <button type="submit" className="btn-primary">
                Đổi mật khẩu
              </button>
            </form>
          )}

          {/* Cài đặt */}
          {activeTab === 'settings' && (
            <div className="settings-section">
              <h3>Cài đặt tài khoản</h3>
              
              <div className="danger-zone">
                <h4>Vùng nguy hiểm</h4>
                <p>Xóa tài khoản sẽ xóa vĩnh viễn tất cả dữ liệu của bạn. Hành động này không thể hoàn tác!</p>
                
                <div className="form-group">
                  <label>Nhập mật khẩu để xác nhận xóa tài khoản</label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                  />
                </div>

                <button 
                  onClick={handleDeleteAccount} 
                  className="btn-danger"
                  disabled={!deletePassword}
                >
                  Xóa tài khoản
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;

