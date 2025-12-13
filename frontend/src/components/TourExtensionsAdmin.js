import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import '../styles/TourExtensionsAdmin.css';

const TourExtensionsAdmin = () => {
  const [extensions, setExtensions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending'); // Mặc định lọc các yêu cầu đang chờ

  useEffect(() => {
    fetchExtensions();
  }, [filterStatus]);

  const fetchExtensions = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/extensions?status=${filterStatus}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setExtensions(response.data.data.extensions);
    } catch (err) {
      setError('Không thể tải danh sách yêu cầu mở rộng.');
      console.error('Error fetching extensions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (extensionId) => {
    if (!window.confirm('Bạn có chắc muốn phê duyệt yêu cầu mở rộng này?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/extensions/${extensionId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Đã phê duyệt yêu cầu mở rộng thành công! ✓');
      setTimeout(() => setSuccess(''), 3000);
      fetchExtensions(); // Tải lại danh sách
    } catch (err) {
      setError('Có lỗi xảy ra khi phê duyệt.');
      setTimeout(() => setError(''), 3000);
      console.error('Error approving extension:', err);
    }
  };

  const handleReject = async (extensionId) => {
    if (!window.confirm('Bạn có chắc muốn từ chối yêu cầu mở rộng này?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/extensions/${extensionId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Đã từ chối yêu cầu mở rộng! ✓');
      setTimeout(() => setSuccess(''), 3000);
      fetchExtensions(); // Tải lại danh sách
    } catch (err) {
      setError('Có lỗi xảy ra khi từ chối.');
      setTimeout(() => setError(''), 3000);
      console.error('Error rejecting extension:', err);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { icon: '⏳', label: 'Đang chờ', className: 'status-pending' },
      approved: { icon: '✅', label: 'Đã phê duyệt', className: 'status-approved' },
      rejected: { icon: '❌', label: 'Bị từ chối', className: 'status-rejected' },
      cancelled: { icon: '🚫', label: 'Đã hủy', className: 'status-cancelled' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <span className={`status-badge ${config.className}`}>{config.icon} {config.label}</span>;
  };

  return (
    <div className="tour-extensions-admin">
      <div className="extensions-header">
        <h2>Quản lý Yêu cầu Mở rộng Tour</h2>
        <p className="extensions-subtitle">Xử lý các yêu cầu mở rộng tour từ khách hàng</p>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="status-filters">
        <button
          onClick={() => setFilterStatus('pending')}
          className={`filter-btn ${filterStatus === 'pending' ? 'active' : ''}`}
        >
          <span className="filter-icon">⏳</span>
          <span className="filter-text">Đang chờ</span>
        </button>
        <button
          onClick={() => setFilterStatus('approved')}
          className={`filter-btn ${filterStatus === 'approved' ? 'active' : ''}`}
        >
          <span className="filter-icon">✅</span>
          <span className="filter-text">Đã phê duyệt</span>
        </button>
        <button
          onClick={() => setFilterStatus('rejected')}
          className={`filter-btn ${filterStatus === 'rejected' ? 'active' : ''}`}
        >
          <span className="filter-icon">❌</span>
          <span className="filter-text">Bị từ chối</span>
        </button>
      </div>

      {loading && <div className="loading-state">Đang tải dữ liệu...</div>}

      <div className="extensions-list">
        {extensions.length === 0 && !loading ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>Không có yêu cầu nào</p>
          </div>
        ) : (
          <div className="extensions-table-wrapper">
            <table className="extensions-table">
              <thead>
                <tr>
                  <th>Tour</th>
                  <th>Người dùng</th>
                  <th>Yêu cầu</th>
                  <th>Phụ thu</th>
                  <th>Ngày yêu cầu</th>
                  <th>Trạng thái</th>
                  {filterStatus === 'pending' && <th>Hành động</th>}
                </tr>
              </thead>
              <tbody>
                {extensions.map(ext => (
                  <tr key={ext._id} className="extension-row">
                    <td className="tour-name">
                      <strong>{ext.tour?.name || '⚠️ Tour đã bị xóa'}</strong>
                    </td>
                    <td className="user-name">{ext.user?.name || 'N/A'}</td>
                    <td className="request-info">
                      <span className="request-detail">+{ext.additionalDays} ngày</span>
                      <span className="request-detail">+{ext.additionalPeople} người</span>
                    </td>
                    <td className="extension-price">
                      <strong>{ext.extensionPrice.toLocaleString()} VND</strong>
                    </td>
                    <td className="request-date">
                      {new Date(ext.requestedAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="status-cell">
                      {getStatusBadge(ext.status)}
                    </td>
                    {filterStatus === 'pending' && (
                      <td className="action-cell">
                        <button
                          onClick={() => handleApprove(ext._id)}
                          className="btn-action btn-approve"
                          title="Phê duyệt yêu cầu"
                        >
                          <span className="btn-icon">✓</span>
                          <span className="btn-label">Phê duyệt</span>
                        </button>
                        <button
                          onClick={() => handleReject(ext._id)}
                          className="btn-action btn-reject"
                          title="Từ chối yêu cầu"
                        >
                          <span className="btn-icon">✕</span>
                          <span className="btn-label">Từ chối</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TourExtensionsAdmin;

