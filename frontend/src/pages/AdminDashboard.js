import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import '../styles/AdminDashboard.css';
import { getImageUrl } from '../utils/imageHelper';

const AdminDashboard = () => {
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('tours');
  const [tours, setTours] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [popularTours, setPopularTours] = useState([]);
  const [revenueStats, setRevenueStats] = useState([]);
  const [newTour, setNewTour] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    maxGroupSize: '',
    destination: '',
    startDates: [],
    images: [],
    image360Url: null,
    video360Url: ''
  });

  const [newStartDate, setNewStartDate] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

  // State cho chỉnh sửa tour
  const [editingTour, setEditingTour] = useState(null);
  const [originalImage360Url, setOriginalImage360Url] = useState(null); // Lưu image360Url ban đầu từ database
  const [editStartDate, setEditStartDate] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');

  // State cho upload ảnh
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploading360Image, setUploading360Image] = useState(false);

  // State cho quản lý users
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [pendingDeleteImage360, setPendingDeleteImage360] = useState(false);
  const [image360UrlToDelete, setImage360UrlToDelete] = useState(null);

  useEffect(() => {
    if (activeTab === 'tours') {
      fetchTours();
    } else if (activeTab === 'bookings') {
      fetchBookings();
    } else if (activeTab === 'stats') {
      fetchPopularTours();
      fetchRevenueStats();
    } else if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchTours = async () => {
    try {
      const response = await axios.get(`${API_URL}/tours`);
      setTours(response.data.data.tours);
    } catch (error) {
      console.error('Error fetching tours:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookings(response.data.data.bookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const fetchPopularTours = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/bookings/stats/popular`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const popularData = response.data?.data;
      const popular =
        Array.isArray(popularData?.tours)
          ? popularData.tours
          : Array.isArray(popularData?.popular)
            ? popularData.popular
            : [];
      setPopularTours(popular);
    } catch (error) {
      console.error('Error fetching popular tours:', error);
      setPopularTours([]);
    }
  };

  const fetchRevenueStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/bookings/stats/revenue`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const stats =
        response.data?.data?.stats && Array.isArray(response.data.data.stats)
          ? response.data.data.stats
          : [];
      setRevenueStats(stats);
    } catch (error) {
      console.error('Error fetching revenue stats:', error);
      setRevenueStats([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/users/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      setErrorMessage(error.response?.data?.message || 'Có lỗi khi tải danh sách người dùng!');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleNewTourChange = (e) => {
    setNewTour({
      ...newTour,
      [e.target.name]: e.target.value
    });
  };

  const handleAddStartDate = () => {
    if (newStartDate) {
      // Kiểm tra ngày không được trong quá khứ
      const selectedDate = new Date(newStartDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset giờ để so sánh chỉ ngày
      
      if (selectedDate < today) {
        setErrorMessage('Không thể chọn ngày khởi hành trong quá khứ!');
        setTimeout(() => setErrorMessage(''), 3000);
        return;
      }
      
      setNewTour({
        ...newTour,
        startDates: [...newTour.startDates, newStartDate]
      });
      setNewStartDate('');
    }
  };

  const handleRemoveStartDate = (index) => {
    setNewTour({
      ...newTour,
      startDates: newTour.startDates.filter((_, i) => i !== index)
    });
  };

  const handleAddImage = () => {
    if (newImageUrl) {
      setNewTour({
        ...newTour,
        images: [...newTour.images, newImageUrl]
      });
      setNewImageUrl('');
    }
  };

  const handleRemoveImage = (index) => {
    setNewTour({
      ...newTour,
      images: newTour.images.filter((_, i) => i !== index)
    });
  };

  // Hàm xóa ảnh 360 chỉ từ Cloudinary (cho tour chưa lưu)
  const handleDelete360ImageOnly = async (image360Url) => {
    if (!image360Url) return;
    
    if (!window.confirm('Bạn có chắc chắn muốn xóa ảnh 360° này? Ảnh sẽ bị xóa vĩnh viễn từ Cloudinary.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/upload/image360?image360Url=${encodeURIComponent(image360Url)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Cập nhật state
      if (editingTour) {
        setEditingTour({ ...editingTour, image360Url: null });
      } else {
        setNewTour({ ...newTour, image360Url: null });
      }

      setSuccessMessage('Đã xóa ảnh 360° từ Cloudinary thành công!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Có lỗi xảy ra khi xóa ảnh 360°!');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  // Hàm xóa ảnh 360 từ Cloudinary và database
  const handleDelete360Image = async (tourId, image360Url, isEdit = false) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa ảnh 360° này?')) {
      return;
    }

    // Nếu đang chỉnh sửa tour, chỉ đánh dấu sẽ xóa sau khi cập nhật
    if (isEdit && editingTour) {
      setEditingTour({
        ...editingTour,
        image360Url: null
      });
      setPendingDeleteImage360(true);
      setImage360UrlToDelete(image360Url || originalImage360Url);
      setSuccessMessage('Ảnh 360° sẽ bị xóa khi bạn nhấn "Cập Nhật Tour".');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    // Với tour mới chưa lưu, tiếp tục xóa ngay trên Cloudinary
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/upload/image360/${tourId}?image360Url=${encodeURIComponent(image360Url)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setNewTour({
        ...newTour,
        image360Url: null
      });

      setSuccessMessage('Đã xóa ảnh 360° thành công!');
      setTimeout(() => setSuccessMessage(''), 3000);

      if (activeTab === 'tours') {
        fetchTours();
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Có lỗi xảy ra khi xóa ảnh 360°!');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  // Hàm upload ảnh 360 lên Cloudinary
  const handle360ImageUpload = async (e, isEdit = false) => {
    const file = e.target.files[0];
    if (!file) return;

    // Kiểm tra file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Chỉ chấp nhận file ảnh 360 (jpeg, jpg, png)!');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    // Kiểm tra file size (10MB cho ảnh 360 - phù hợp với Cloudinary free plan)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Kích thước file không được vượt quá 10MB!');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    try {
      setUploading360Image(true);
      const formData = new FormData();
      formData.append('image360', file);

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/upload/image360`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const image360Url = response.data.data.image360Url;

      // Cập nhật image360Url cho tour
      if (isEdit) {
        setEditingTour({
          ...editingTour,
          image360Url: image360Url
        });
      } else {
        setNewTour({
          ...newTour,
          image360Url: image360Url
        });
      }

      setSuccessMessage('Upload ảnh 360° lên Cloudinary thành công!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Có lỗi xảy ra khi upload ảnh 360°!');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setUploading360Image(false);
      // Reset input file
      e.target.value = '';
    }
  };

  // Hàm upload ảnh từ file
  const handleImageFileUpload = async (e, isEdit = false) => {
    const file = e.target.files[0];
    if (!file) return;

    // Kiểm tra file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif, webp)!');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    // Kiểm tra file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Kích thước file không được vượt quá 5MB!');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/upload/image`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const imageUrl = response.data.data.imageUrl;

      // Thêm URL vào danh sách images
      if (isEdit) {
        setEditingTour({
          ...editingTour,
          images: [...editingTour.images, imageUrl]
        });
      } else {
        setNewTour({
          ...newTour,
          images: [...newTour.images, imageUrl]
        });
      }

      setSuccessMessage('Upload ảnh thành công!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Có lỗi xảy ra khi upload ảnh!');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setUploadingImage(false);
      // Reset input file
      e.target.value = '';
    }
  };

  // Hàm xóa link video 360°
  const handleClearVideo360Link = (isEdit = false) => {
    if (isEdit && editingTour) {
      setEditingTour({
        ...editingTour,
        video360Url: ''
      });
    } else {
      setNewTour({
        ...newTour,
        video360Url: ''
      });
    }
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleCreateTour = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/tours`, newTour, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMessage('Tour đã được tạo thành công!');
      setErrorMessage('');
      fetchTours();
      setNewTour({
        name: '',
        description: '',
        price: '',
        duration: '',
        maxGroupSize: '',
        destination: '',
        startDates: [],
        images: [],
        image360Url: null,
        video360Url: ''
      });
      setNewStartDate('');
      setNewImageUrl('');
      // Tự động ẩn thông báo thành công sau 3 giây
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Có lỗi xảy ra khi tạo tour!');
      setSuccessMessage('');
      // Tự động ẩn thông báo lỗi sau 3 giây
      setTimeout(() => {
        setErrorMessage('');
      }, 3000);
    }
  };

  const handleUpdateBookingStatus = async (bookingId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/bookings/${bookingId}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchBookings();
    } catch (error) {
      const message = error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái!';
      alert(message);
    }
  };

  // Hàm xóa tour
  const handleDeleteTour = async (tourId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tour này?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/tours/${tourId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMessage('Tour đã được xóa thành công!');
      setErrorMessage('');
      fetchTours();
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Có lỗi xảy ra khi xóa tour!');
      setSuccessMessage('');
      setTimeout(() => {
        setErrorMessage('');
      }, 3000);
    }
  };

  // Hàm bắt đầu chỉnh sửa tour
  const handleEditTour = (tour) => {
    setEditingTour({
      ...tour,
      startDates: tour.startDates || [],
      images: tour.images || [],
      image360Url: tour.image360Url || null,
      video360Url: tour.video360Url || ''
    });
    // Lưu image360Url ban đầu từ database để so sánh sau này
    setOriginalImage360Url(tour.image360Url || null);
    setPendingDeleteImage360(false);
    setImage360UrlToDelete(null);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Hàm hủy chỉnh sửa
  const handleCancelEdit = () => {
    setEditingTour(null);
    setOriginalImage360Url(null);
    setEditStartDate('');
    setEditImageUrl('');
    setPendingDeleteImage360(false);
    setImage360UrlToDelete(null);
  };

  // Hàm thay đổi thông tin tour đang chỉnh sửa
  const handleEditTourChange = (e) => {
    setEditingTour({
      ...editingTour,
      [e.target.name]: e.target.value
    });
  };

  // Hàm thêm ngày khởi hành cho tour đang chỉnh sửa
  const handleAddEditStartDate = () => {
    if (editStartDate) {
      // Kiểm tra ngày không được trong quá khứ
      const selectedDate = new Date(editStartDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset giờ để so sánh chỉ ngày
      
      if (selectedDate < today) {
        setErrorMessage('Không thể chọn ngày khởi hành trong quá khứ!');
        setTimeout(() => setErrorMessage(''), 3000);
        return;
      }
      
      setEditingTour({
        ...editingTour,
        startDates: [...editingTour.startDates, editStartDate]
      });
      setEditStartDate('');
    }
  };

  // Hàm xóa ngày khởi hành cho tour đang chỉnh sửa
  const handleRemoveEditStartDate = (index) => {
    setEditingTour({
      ...editingTour,
      startDates: editingTour.startDates.filter((_, i) => i !== index)
    });
  };

  // Hàm thêm hình ảnh cho tour đang chỉnh sửa
  const handleAddEditImage = () => {
    if (editImageUrl) {
      setEditingTour({
        ...editingTour,
        images: [...editingTour.images, editImageUrl]
      });
      setEditImageUrl('');
    }
  };

  // Hàm xóa hình ảnh cho tour đang chỉnh sửa
  const handleRemoveEditImage = (index) => {
    setEditingTour({
      ...editingTour,
      images: editingTour.images.filter((_, i) => i !== index)
    });
  };

  // Hàm cập nhật tour
  const handleUpdateTour = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const tourId = editingTour._id;
      await axios.patch(`${API_URL}/tours/${tourId}`, editingTour, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (pendingDeleteImage360 && image360UrlToDelete) {
        try {
          await axios.delete(`${API_URL}/upload/image360/${tourId}?image360Url=${encodeURIComponent(image360UrlToDelete)}&force=true`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (deleteError) {
          console.error('Error deleting 360 image after update:', deleteError);
        }
      }

      setSuccessMessage('Tour đã được cập nhật thành công!');
      setErrorMessage('');
      fetchTours();
      // Cập nhật originalImage360Url sau khi lưu thành công
      setOriginalImage360Url(editingTour.image360Url || null);
      setEditingTour(null);
      setEditStartDate('');
      setEditImageUrl('');
      setPendingDeleteImage360(false);
      setImage360UrlToDelete(null);
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật tour!');
      setSuccessMessage('');
      setTimeout(() => {
        setErrorMessage('');
      }, 3000);
    }
  };

  // ============ USER MANAGEMENT FUNCTIONS ============

  // Hàm bắt đầu chỉnh sửa user
  const handleEditUser = (user) => {
    setEditingUser({ ...user });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Hàm hủy chỉnh sửa user
  const handleCancelEditUser = () => {
    setEditingUser(null);
  };

  // Hàm thay đổi thông tin user đang chỉnh sửa
  const handleEditUserChange = (e) => {
    setEditingUser({
      ...editingUser,
      [e.target.name]: e.target.value
    });
  };

  // Hàm cập nhật user
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/users/${editingUser._id}`, editingUser, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMessage('Thông tin người dùng đã được cập nhật thành công!');
      setErrorMessage('');
      fetchUsers();
      setEditingUser(null);
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật người dùng!');
      setSuccessMessage('');
      setTimeout(() => {
        setErrorMessage('');
      }, 3000);
    }
  };

  // Hàm xóa user
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa người dùng này? Tất cả dữ liệu liên quan sẽ bị ảnh hưởng!')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMessage('Người dùng đã được xóa thành công!');
      setErrorMessage('');
      fetchUsers();
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Có lỗi xảy ra khi xóa người dùng!');
      setSuccessMessage('');
      setTimeout(() => {
        setErrorMessage('');
      }, 3000);
    }
  };

  return (
    <div className="container admin-dashboard">
      <div className="admin-tabs">
        <button
          className={activeTab === 'tours' ? 'active' : ''}
          onClick={() => setActiveTab('tours')}
        >
          Quản lý Tours
        </button>
        <button
          className={activeTab === 'bookings' ? 'active' : ''}
          onClick={() => setActiveTab('bookings')}
        >
          Quản lý Đơn đặt
        </button>
        <button
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          Quản lý Users
        </button>
        <button
          className={activeTab === 'stats' ? 'active' : ''}
          onClick={() => setActiveTab('stats')}
        >
          Thống kê
        </button>
      </div>

      {activeTab === 'tours' ? (
        <div className="tours-management">
          <div className="create-tour-section">
            <h2>{editingTour ? 'Chỉnh Sửa Tour' : 'Tạo Tour Mới'}</h2>
            {successMessage && (
              <div className="success-message">
                <span>{successMessage}</span>
              </div>
            )}
            {errorMessage && (
              <div className="error-message">
                <span>{errorMessage}</span>
              </div>
            )}
            {editingTour && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="cancel-edit-btn"
              >
                ← Hủy chỉnh sửa
              </button>
            )}
            <form onSubmit={editingTour ? handleUpdateTour : handleCreateTour} className="create-tour-form">
              <div className="form-group">
                <label>Tên tour</label>
                <input
                  type="text"
                  name="name"
                  value={editingTour ? editingTour.name : newTour.name}
                  onChange={editingTour ? handleEditTourChange : handleNewTourChange}
                  placeholder="Nhập tên tour"
                  required
                />
              </div>
              <div className="form-group">
                <label>Điểm đến</label>
                <input
                  type="text"
                  name="destination"
                  value={editingTour ? editingTour.destination : newTour.destination}
                  onChange={editingTour ? handleEditTourChange : handleNewTourChange}
                  placeholder="Nhập điểm đến"
                  required
                />
              </div>
              <div className="form-group">
                <label>Giá (VNĐ)</label>
                <input
                  type="number"
                  name="price"
                  value={editingTour ? editingTour.price : newTour.price}
                  onChange={editingTour ? handleEditTourChange : handleNewTourChange}
                  placeholder="Nhập giá tour"
                  min="0"
                  required
                />
              </div>
              <div className="form-group">
                <label>Thời gian (ngày)</label>
                <input
                  type="number"
                  name="duration"
                  value={editingTour ? editingTour.duration : newTour.duration}
                  onChange={editingTour ? handleEditTourChange : handleNewTourChange}
                  placeholder="Số ngày"
                  min="1"
                  required
                />
              </div>
              <div className="form-group">
                <label>Số người tối đa</label>
                <input
                  type="number"
                  name="maxGroupSize"
                  value={editingTour ? editingTour.maxGroupSize : newTour.maxGroupSize}
                  onChange={editingTour ? handleEditTourChange : handleNewTourChange}
                  placeholder="Số người tối đa"
                  min="1"
                  required
                />
              </div>
              <div className="form-group full-width">
                <label>Mô tả chi tiết</label>
                <textarea
                  name="description"
                  value={editingTour ? editingTour.description : newTour.description}
                  onChange={editingTour ? handleEditTourChange : handleNewTourChange}
                  placeholder="Nhập mô tả chi tiết về tour"
                  required
                />
              </div>

              {/* Ngày khởi hành */}
              <div className="form-group full-width">
                <label>Ngày khởi hành</label>
                <div className="add-item-container">
                  <input
                    type="date"
                    value={editingTour ? editStartDate : newStartDate}
                    onChange={(e) => editingTour ? setEditStartDate(e.target.value) : setNewStartDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    placeholder="Chọn ngày khởi hành"
                  />
                  <button type="button" onClick={editingTour ? handleAddEditStartDate : handleAddStartDate} className="btn-add">
                    ➕ Thêm ngày
                  </button>
                </div>
                {(editingTour ? editingTour.startDates : newTour.startDates).length > 0 && (
                  <div className="items-list">
                    {(editingTour ? editingTour.startDates : newTour.startDates).map((date, index) => (
                      <div key={index} className="item-tag">
                        <span>📅 {new Date(date).toLocaleDateString('vi-VN')}</span>
                        <button type="button" onClick={() => editingTour ? handleRemoveEditStartDate(index) : handleRemoveStartDate(index)} className="btn-remove">
                          ✖
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ảnh 360° */}
              <div className="form-group full-width">
                <label>Ảnh 360° (Tour 360°)</label>
                <div className="upload-360-section">
                  <label className="upload-label">
                    📷 Chọn ảnh 360° từ máy (sẽ upload lên Cloudinary)
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={(e) => handle360ImageUpload(e, !!editingTour)}
                      style={{ display: 'none' }}
                      disabled={uploading360Image}
                    />
                  </label>
                  {uploading360Image && <span className="uploading-text">Đang upload ảnh 360° lên Cloudinary...</span>}
                  {(editingTour ? editingTour.image360Url : newTour.image360Url) && (
                    <div className="image360-preview">
                      <p className="success-text">✓ Đã upload ảnh 360°</p>
                      <p className="url-text">URL: {(editingTour ? editingTour.image360Url : newTour.image360Url).substring(0, 60)}...</p>
                      {editingTour && editingTour._id ? (
                        // Nếu image360Url hiện tại khác với ban đầu (mới upload chưa lưu), dùng endpoint không cần tourId
                        editingTour.image360Url !== originalImage360Url ? (
                      <button
                        type="button"
                            onClick={() => handleDelete360ImageOnly(editingTour.image360Url)}
                        className="btn-remove-image"
                      >
                            🗑️ Xóa ảnh 360° (xóa từ Cloudinary)
                      </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDelete360Image(editingTour._id, editingTour.image360Url, true)}
                            className="btn-remove-image"
                          >
                            🗑️ Xóa ảnh 360° (xóa vĩnh viễn)
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDelete360ImageOnly((editingTour ? editingTour.image360Url : newTour.image360Url))}
                          className="btn-remove-image"
                        >
                          🗑️ Xóa ảnh 360° (xóa từ Cloudinary)
                        </button>
                      )}
                    </div>
                  )}
                  <p className="upload-hint">💡 Ảnh 360° sẽ được lưu trên Cloudinary. Kích thước tối đa: 10MB (phù hợp với Cloudinary free plan). Sau khi upload xong có thể xem lại ở trang Tour 360°.</p>
                </div>
              </div>

              {/* Video 360° (YouTube) */}
              <div className="form-group full-width">
                <label>Video 360° (YouTube Link)</label>
                <input
                  type="url"
                  name="video360Url"
                  value={editingTour ? editingTour.video360Url : newTour.video360Url}
                  onChange={editingTour ? handleEditTourChange : handleNewTourChange}
                  placeholder="Nhập link YouTube video 360° (ví dụ: https://www.youtube.com/watch?v=VIDEO_ID)"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ddd' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-clear-video"
                    onClick={() => handleClearVideo360Link(!!editingTour)}
                    disabled={!(editingTour ? editingTour.video360Url : newTour.video360Url)}
                  >
                    🗑️ Xóa link video 360°
                  </button>
                </div>
                <p className="upload-hint" style={{ marginTop: '0.5rem' }}>
                  💡 Nhập link YouTube video 360°. Video sẽ được nhúng (embed) trực tiếp vào trang Tour 360°. 
                  <br />Ví dụ: https://www.youtube.com/watch?v=dQw4w9WgXcQ hoặc https://youtu.be/dQw4w9WgXcQ
                </p>
                {(editingTour ? editingTour.video360Url : newTour.video360Url) && (
                  <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#e3f2fd', borderRadius: '6px', border: '1px solid #2196F3' }}>
                    <p style={{ margin: 0, color: '#1976D2', fontWeight: 600 }}>✓ Đã nhập link YouTube</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#555', wordBreak: 'break-all' }}>
                      {(editingTour ? editingTour.video360Url : newTour.video360Url)}
                    </p>
                  </div>
                )}
              </div>

              {/* Hình ảnh */}
              <div className="form-group full-width">
                <label>Hình ảnh</label>

                {/* Upload từ máy */}
                <div className="upload-section">
                  <label className="upload-label">
                    📁 Chọn ảnh từ máy
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFileUpload(e, !!editingTour)}
                      style={{ display: 'none' }}
                      disabled={uploadingImage}
                    />
                  </label>
                  {uploadingImage && <span className="uploading-text">Đang upload...</span>}
                </div>

                {/* Hoặc nhập URL */}
                <div className="url-section">
                  <p className="section-divider">Hoặc nhập URL</p>
                  <div className="add-item-container">
                    <input
                      type="url"
                      value={editingTour ? editImageUrl : newImageUrl}
                      onChange={(e) => editingTour ? setEditImageUrl(e.target.value) : setNewImageUrl(e.target.value)}
                      placeholder="Nhập URL hình ảnh"
                    />
                    <button type="button" onClick={editingTour ? handleAddEditImage : handleAddImage} className="btn-add">
                      ➕ Thêm URL
                    </button>
                  </div>
                </div>

                {/* Preview ảnh */}
                {(editingTour ? editingTour.images : newTour.images).length > 0 && (
                  <div className="images-preview">
                    {(editingTour ? editingTour.images : newTour.images).map((url, index) => (
                      <div key={index} className="image-preview-item">
                        <img src={getImageUrl(url)} alt={`Preview ${index + 1}`} />
                        <button type="button" onClick={() => editingTour ? handleRemoveEditImage(index) : handleRemoveImage(index)} className="btn-remove-image">
                          ✖
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" className="submit-button">
                {editingTour ? 'Cập Nhật Tour' : 'Tạo Tour Mới'}
              </button>
            </form>
          </div>

          <h2>Danh Sách Tours</h2>
          <div className="tours-list">
            {tours.map(tour => (
              <div key={tour._id} className="tour-item">
                <h3>{tour.name}</h3>
                <div className="tour-content">
                  <p className="tour-description">{tour.description}</p>
                  <div className="tour-details">
                    <span>💰 {tour.price.toLocaleString()} VNĐ</span>
                    <span>🕒 {tour.duration} ngày</span>
                    <span>👥 {tour.maxGroupSize} người</span>
                    <span>📍 {tour.destination}</span>
                  </div>
                  <div className="tour-actions">
                    <button
                      className="btn-edit"
                      onClick={() => handleEditTour(tour)}
                    >
                      ✏️ Sửa
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteTour(tour._id)}
                    >
                      🗑️ Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'bookings' ? (
        <div className="bookings-management">
          <h2>Quản lý Đơn đặt</h2>
          <table className="bookings-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Tour</th>
                <th>Khách hàng</th>
                <th>Số người</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Thanh toán</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                    Chưa có đơn đặt nào
                  </td>
                </tr>
              ) : (
                bookings.map(booking => (
                  <tr key={booking._id}>
                    <td>{booking._id.slice(-6)}</td>
                    <td>{booking.tour ? booking.tour.name : '⚠️ Tour đã xóa'}</td>
                    <td>{booking.user ? booking.user.name : '⚠️ User đã xóa'}</td>
                    <td>{booking.numberOfPeople}</td>
                    <td>{booking.price.toLocaleString()} VND</td>
                    <td>
                      {booking.status === 'pending' && '🟡 Chờ xác nhận'}
                      {booking.status === 'confirmed' && '🟢 Đã xác nhận'}
                      {booking.status === 'completed' && '🏁 Hoàn thành'}
                      {booking.status === 'cancelled' && '❌ Đã hủy'}
                    </td>
                    <td>
                      {booking.paid ? '✅ Đã thanh toán' : '❌ Chưa thanh toán'}
                    </td>
                    <td>
                      <button onClick={() => alert(
                        `Đơn ${booking._id}\nTour: ${booking.tour ? booking.tour.name : 'Tour đã xóa'}\nKhách: ${booking.user ? booking.user.name : 'User đã xóa'}\nNgười: ${booking.numberOfPeople}\nTiền: ${booking.price.toLocaleString()} VND\nThanh toán: ${booking.paid ? 'Đã thanh toán' : 'Chưa thanh toán'}`
                      )}>Xem</button>
                      <button
                        onClick={() => handleUpdateBookingStatus(booking._id, 'confirmed')}
                        disabled={booking.status !== 'pending'}
                      >
                        ✔ Xác nhận
                      </button>
                      <button
                        onClick={() => handleUpdateBookingStatus(booking._id, 'completed')}
                        disabled={booking.status !== 'confirmed' || !booking.paid}
                        title={!booking.paid ? 'Cần thanh toán trước khi hoàn thành' : ''}
                      >
                        🏁 Hoàn thành
                      </button>
                      <button onClick={() => handleUpdateBookingStatus(booking._id, 'cancelled')} disabled={booking.status === 'cancelled' || booking.status === 'completed'}>❌ Hủy</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'users' ? (
        <div className="users-management">
          <h2>Quản lý Người Dùng</h2>

          {successMessage && (
            <div className="success-message">
              <span>{successMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="error-message">
              <span>{errorMessage}</span>
            </div>
          )}

          {editingUser && (
            <div className="edit-user-section">
              <h3>Chỉnh Sửa Thông Tin Người Dùng</h3>
              <button
                type="button"
                onClick={handleCancelEditUser}
                className="cancel-edit-btn"
              >
                ← Hủy chỉnh sửa
              </button>
              <form onSubmit={handleUpdateUser} className="edit-user-form">
                <div className="form-group">
                  <label>Tên</label>
                  <input
                    type="text"
                    name="name"
                    value={editingUser.name}
                    onChange={handleEditUserChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={editingUser.email}
                    onChange={handleEditUserChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Số điện thoại</label>
                  <input
                    type="text"
                    name="phoneNumber"
                    value={editingUser.phoneNumber || ''}
                    onChange={handleEditUserChange}
                  />
                </div>
                <div className="form-group">
                  <label>Địa chỉ</label>
                  <input
                    type="text"
                    name="address"
                    value={editingUser.address || ''}
                    onChange={handleEditUserChange}
                  />
                </div>
                <div className="form-group">
                  <label>Vai trò</label>
                  <select
                    name="role"
                    value={editingUser.role}
                    onChange={handleEditUserChange}
                    required
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button type="submit" className="submit-button">
                  Cập Nhật Thông Tin
                </button>
              </form>
            </div>
          )}

          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Địa chỉ</th>
                <th>Vai trò</th>
                <th>Ngày tạo</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                    Chưa có người dùng nào
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user._id}>
                    <td>{user._id.slice(-6)}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.phoneNumber || 'Chưa có'}</td>
                    <td>{user.address || 'Chưa có'}</td>
                    <td>
                      {user.role === 'admin' ? (
                        <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>👑 Admin</span>
                      ) : (
                        <span style={{ color: '#3498db' }}>👤 User</span>
                      )}
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td>
                      <button
                        className="btn-edit"
                        onClick={() => handleEditUser(user)}
                      >
                        ✏️ Sửa
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteUser(user._id)}
                      >
                        🗑️ Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="stats-tab">
          <h2>Tour phổ biến</h2>
          <table>
            <thead>
              <tr>
                <th>Tên tour</th>
                <th>Điểm đến</th>
                <th>Số lượt đặt</th>
                <th>Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {popularTours.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '1.5rem' }}>
                    Chưa có dữ liệu tour phổ biến
                  </td>
                </tr>
              ) : (
                popularTours.map((tour) => (
                  <tr key={tour._id}>
                    <td>{tour.name}</td>
                    <td>{tour.destination}</td>
                    <td>{tour.bookingsCount ?? tour.bookings ?? 0}</td>
                    <td>{(tour.revenue || 0).toLocaleString()} VND</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <h2>Doanh thu theo tháng</h2>
          <table>
            <thead>
              <tr>
                <th>Năm</th>
                <th>Tháng</th>
                <th>Đơn đặt</th>
                <th>Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {revenueStats.map((s, idx) => (
                <tr key={idx}>
                  <td>{s.year}</td>
                  <td>{s.month}</td>
                  <td>{s.totalBookings}</td>
                  <td>{s.totalRevenue.toLocaleString()} VND</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
