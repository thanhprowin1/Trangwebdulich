import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import '../styles/AdminDashboard.css';
import { getImageUrl } from '../utils/imageHelper';
import TourExtensionsAdmin from '../components/TourExtensionsAdmin';

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
    video360Url: '',
    mapCenter: { lat: null, lng: null },
    mapZoom: 13,
    hotspots: []
  });

  const [newStartDate, setNewStartDate] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

  // State cho chỉnh sửa tour
  const [editingTour, setEditingTour] = useState(null);
  const [originalImage360Url, setOriginalImage360Url] = useState(null); // Lưu image360Url ban đầu từ database
  const [editStartDate, setEditStartDate] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');

  // State cho quản lý hotspot
  const [newHotspot, setNewHotspot] = useState({
    name: '',
    lat: '',
    lng: '',
    image360Url: '',
    image360Urls: [],
    video360Url: '',
    description: '',
    links: []
  });
  const [editingHotspotIndex, setEditingHotspotIndex] = useState(null);
  const [uploadingHotspot360, setUploadingHotspot360] = useState(false);
  const [hotspot360Files, setHotspot360Files] = useState([]);
  const [hotspot360Previews, setHotspot360Previews] = useState([]);

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

  const handleHotspot360Upload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const validFiles = [];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        setErrorMessage('Chỉ chấp nhận file ảnh 360 (jpeg, jpg, png)!');
        setTimeout(() => setErrorMessage(''), 3000);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('Kích thước mỗi file không được vượt quá 10MB!');
        setTimeout(() => setErrorMessage(''), 3000);
        continue;
      }
      validFiles.push(file);
    }

    const newPreviews = validFiles.map((f) => URL.createObjectURL(f));
    setHotspot360Files((prev) => [...prev, ...validFiles]);
    setHotspot360Previews((prev) => [...prev, ...newPreviews]);
    e.target.value = '';
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
      const response = await axios.get(`${API_URL}/bookings/stats/popular?statuses=completed`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const popularData = response.data?.data;
      const popular = Array.isArray(popularData?.tours) ? popularData.tours : [];
      setPopularTours(popular);
      setErrorMessage('');
    } catch (error) {
      console.error('Error fetching popular tours:', error);
      setErrorMessage(error.response?.data?.message || 'Có lỗi khi tải dữ liệu tour đã hoàn thành!');
      setPopularTours([]);
      setTimeout(() => setErrorMessage(''), 5000);
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
      setErrorMessage('');
    } catch (error) {
      console.error('Error fetching revenue stats:', error);
      setErrorMessage(error.response?.data?.message || 'Có lỗi khi tải dữ liệu doanh thu!');
      setRevenueStats([]);
      setTimeout(() => setErrorMessage(''), 5000);
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
        video360Url: '',
        mapCenter: { lat: null, lng: null },
        mapZoom: 13,
        hotspots: []
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
    // Reset trạng thái hotspot tạm trước khi nạp tour mới
    setNewHotspot({
      name: '',
      lat: '',
      lng: '',
      image360Url: '',
      image360Urls: [],
      video360Url: '',
      description: '',
      links: []
    });
    setHotspot360Files([]);
    setHotspot360Previews([]);
    setEditingHotspotIndex(null);

    setEditingTour({
      ...tour,
      startDates: tour.startDates || [],
      images: tour.images || [],
      image360Url: tour.image360Url || null,
      video360Url: tour.video360Url || '',
      mapCenter: tour.mapCenter || { lat: null, lng: null },
      mapZoom: tour.mapZoom || 13,
      hotspots: (tour.hotspots || []).map((h) => ({
        ...h,
        links: h.links || []
      }))
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
    // Reset form hotspot và file pending
    setNewHotspot({
      name: '',
      lat: '',
      lng: '',
      image360Url: '',
      image360Urls: [],
      video360Url: '',
      description: '',
      links: []
    });
    setHotspot360Files([]);
    setHotspot360Previews([]);
    setEditingHotspotIndex(null);
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

  // ============ HOTSPOT MANAGEMENT FUNCTIONS ============

  const handleAddHotspot = async () => {
    if (!newHotspot.name || !newHotspot.lat || !newHotspot.lng) {
      setErrorMessage('Vui lòng nhập đầy đủ tên và tọa độ (lat, lng) cho hotspot!');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    const uploadHotspot360Files = async () => {
      if (hotspot360Files.length === 0) return [];
      try {
        setUploadingHotspot360(true);
        const token = localStorage.getItem('token');
        const uploadedUrls = [];
        for (const file of hotspot360Files) {
          const formData = new FormData();
          formData.append('image360', file);
          const response = await axios.post(`${API_URL}/upload/image360`, formData, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          });
          uploadedUrls.push(response.data.data.image360Url);
        }
        return uploadedUrls;
      } catch (error) {
        setErrorMessage(error.response?.data?.message || 'Có lỗi xảy ra khi upload ảnh 360° cho hotspot!');
        setTimeout(() => setErrorMessage(''), 3000);
        return null;
      } finally {
        setUploadingHotspot360(false);
      }
    };

    const uploadedUrls = await uploadHotspot360Files();
    if (uploadedUrls === null) return; // upload lỗi

    const combinedImages = [...(newHotspot.image360Urls || []), ...uploadedUrls];
    const hotspot = {
      name: newHotspot.name,
      lat: parseFloat(newHotspot.lat),
      lng: parseFloat(newHotspot.lng),
      image360Url: combinedImages[0] || newHotspot.image360Url || null,
      image360Urls: combinedImages,
      video360Url: newHotspot.video360Url || null,
      description: newHotspot.description || null,
      links: (newHotspot.links || []).map((link) => ({
        fromSceneIndex: link.fromSceneIndex === '' ? null : (Number.isFinite(parseInt(link.fromSceneIndex)) ? parseInt(link.fromSceneIndex) : null),
        toHotspotIndex: Number.isFinite(parseInt(link.toHotspotIndex)) ? parseInt(link.toHotspotIndex) : 0,
        toSceneIndex: Number.isFinite(parseInt(link.toSceneIndex)) ? parseInt(link.toSceneIndex) : 0,
        yaw: Number.isFinite(parseFloat(link.yaw)) ? parseFloat(link.yaw) : 0,
        pitch: (() => {
          const pitchValue = parseFloat(link.pitch);
          // Nếu pitch = 0 hoặc không hợp lệ, dùng -25 để nghiêng xuống mặt đất
          return Number.isFinite(pitchValue) && pitchValue !== 0 ? pitchValue : -25;
        })(),
        text: link.text || ''
      }))
    };

    if (editingTour) {
      setEditingTour({
        ...editingTour,
        hotspots: [...editingTour.hotspots, hotspot]
      });
    } else {
      setNewTour({
        ...newTour,
        hotspots: [...newTour.hotspots, hotspot]
      });
    }

    // Reset form hotspot sau khi thêm
    setNewHotspot({
      name: '',
      lat: '',
      lng: '',
      image360Url: '',
      image360Urls: [],
      video360Url: '',
      description: '',
      links: []
    });
    setHotspot360Files([]);
    setHotspot360Previews([]);
  };

  const handleEditHotspot = (index) => {
    const hotspots = editingTour ? editingTour.hotspots : newTour.hotspots;
    const hotspot = hotspots[index];
    // Reset pending files when editing a specific hotspot
    setHotspot360Files([]);
    setHotspot360Previews([]);
    setNewHotspot({
      name: hotspot.name || '',
      lat: hotspot.lat || '',
      lng: hotspot.lng || '',
      image360Url: hotspot.image360Url || '',
      image360Urls: hotspot.image360Urls || [],
      video360Url: hotspot.video360Url || '',
      description: hotspot.description || '',
      links: (hotspot.links || []).map(link => ({
        ...link,
        // Nếu pitch = 0 hoặc không có, đặt mặc định -25 để nghiêng xuống
        pitch: (link.pitch === 0 || link.pitch === undefined || link.pitch === null) ? -25 : link.pitch
      }))
    });
    setEditingHotspotIndex(index);
  };

  const handleUpdateHotspot = async () => {
    if (!newHotspot.name || !newHotspot.lat || !newHotspot.lng) {
      setErrorMessage('Vui lòng nhập đầy đủ tên và tọa độ (lat, lng) cho hotspot!');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    const uploadHotspot360Files = async () => {
      if (hotspot360Files.length === 0) return [];
      try {
        setUploadingHotspot360(true);
        const token = localStorage.getItem('token');
        const uploadedUrls = [];
        for (const file of hotspot360Files) {
          const formData = new FormData();
          formData.append('image360', file);
          const response = await axios.post(`${API_URL}/upload/image360`, formData, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          });
          uploadedUrls.push(response.data.data.image360Url);
        }
        return uploadedUrls;
      } catch (error) {
        setErrorMessage(error.response?.data?.message || 'Có lỗi xảy ra khi upload ảnh 360° cho hotspot!');
        setTimeout(() => setErrorMessage(''), 3000);
        return null;
      } finally {
        setUploadingHotspot360(false);
      }
    };

    const uploadedUrls = await uploadHotspot360Files();
    if (uploadedUrls === null) return; // upload lỗi

    const combinedImages = [...(newHotspot.image360Urls || []), ...uploadedUrls];
    const hotspot = {
      name: newHotspot.name,
      lat: parseFloat(newHotspot.lat),
      lng: parseFloat(newHotspot.lng),
      image360Url: combinedImages[0] || newHotspot.image360Url || null,
      image360Urls: combinedImages,
      video360Url: newHotspot.video360Url || null,
      description: newHotspot.description || null,
      links: (newHotspot.links || []).map((link) => ({
        fromSceneIndex: link.fromSceneIndex === '' ? null : (Number.isFinite(parseInt(link.fromSceneIndex)) ? parseInt(link.fromSceneIndex) : null),
        toHotspotIndex: Number.isFinite(parseInt(link.toHotspotIndex)) ? parseInt(link.toHotspotIndex) : 0,
        toSceneIndex: Number.isFinite(parseInt(link.toSceneIndex)) ? parseInt(link.toSceneIndex) : 0,
        yaw: Number.isFinite(parseFloat(link.yaw)) ? parseFloat(link.yaw) : 0,
        pitch: (() => {
          const pitchValue = parseFloat(link.pitch);
          // Nếu pitch = 0 hoặc không hợp lệ, dùng -25 để nghiêng xuống mặt đất
          return Number.isFinite(pitchValue) && pitchValue !== 0 ? pitchValue : -25;
        })(),
        targetYaw: Number.isFinite(parseFloat(link.targetYaw)) ? parseFloat(link.targetYaw) : 0,
        text: link.text || ''
      }))
    };

    if (editingTour) {
      const updatedHotspots = [...editingTour.hotspots];
      updatedHotspots[editingHotspotIndex] = hotspot;
      setEditingTour({
        ...editingTour,
        hotspots: updatedHotspots
      });
    } else {
      const updatedHotspots = [...newTour.hotspots];
      updatedHotspots[editingHotspotIndex] = hotspot;
      setNewTour({
        ...newTour,
        hotspots: updatedHotspots
      });
    }

    setNewHotspot({
      name: '',
      lat: '',
      lng: '',
      image360Url: '',
      image360Urls: [],
      video360Url: '',
      description: '',
      links: []
    });
    setEditingHotspotIndex(null);
    setHotspot360Files([]);
    setHotspot360Previews([]);
  };

  const handleRemoveHotspot = (index) => {
    if (editingTour) {
      setEditingTour({
        ...editingTour,
        hotspots: editingTour.hotspots.filter((_, i) => i !== index)
      });
    } else {
      setNewTour({
        ...newTour,
        hotspots: newTour.hotspots.filter((_, i) => i !== index)
      });
    }
  };

  const handleRemoveHotspot360Url = (index) => {
    setNewHotspot((prev) => {
      const updated = (prev.image360Urls || []).filter((_, i) => i !== index);
      return {
        ...prev,
        image360Urls: updated,
        // nếu url đang chọn là url đầu, và bị xóa, fallback về url đầu tiên còn lại hoặc rỗng
        image360Url: updated[0] || ''
      };
    });
  };

  const handleRemovePendingHotspot360File = (index) => {
    setHotspot360Files((prev) => prev.filter((_, i) => i !== index));
    setHotspot360Previews((prev) => {
      const newList = prev.filter((_, i) => i !== index);
      return newList;
    });
  };

  // Quản lý liên kết (mũi tên) giữa các ảnh 360°
  const handleAddHotspotLink = () => {
    setNewHotspot((prev) => ({
      ...prev,
      links: [
        ...(prev.links || []),
        { fromSceneIndex: '', toHotspotIndex: 0, toSceneIndex: 0, yaw: 0, pitch: -25, text: '' }
      ]
    }));
  };

  const handleUpdateHotspotLink = (index, field, value) => {
    setNewHotspot((prev) => {
      const links = [...(prev.links || [])];
      const current = links[index] || {};
      let parsedValue = value;
      if (['fromSceneIndex', 'toHotspotIndex', 'toSceneIndex', 'yaw', 'pitch'].includes(field)) {
        parsedValue = value === '' ? '' : Number(value);
      }
      links[index] = { ...current, [field]: parsedValue };
      return { ...prev, links };
    });
  };

  const handleRemoveHotspotLink = (index) => {
    setNewHotspot((prev) => ({
      ...prev,
      links: (prev.links || []).filter((_, i) => i !== index)
    }));
  };

  const handleCancelEditHotspot = () => {
    setNewHotspot({
      name: '',
      lat: '',
      lng: '',
      image360Url: '',
      image360Urls: [],
      video360Url: '',
      description: '',
      links: []
    });
    setEditingHotspotIndex(null);
    setHotspot360Files([]);
    setHotspot360Previews([]);
  };

  // Hàm cập nhật tour
  const handleUpdateTour = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const tourId = editingTour._id;

      // Debug: Log dữ liệu trước khi gửi
      console.log('Updating tour with data:', {
        mapCenter: editingTour.mapCenter,
        hotspots: editingTour.hotspots,
        hotspotsCount: editingTour.hotspots?.length || 0
      });

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
      // Reset toàn bộ form về trạng thái tạo tour mới để tránh giữ thông tin hotspot vừa chỉnh sửa
      setEditingTour(null);
      setEditStartDate('');
      setEditImageUrl('');
      setPendingDeleteImage360(false);
      setImage360UrlToDelete(null);
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
        video360Url: '',
        mapCenter: { lat: null, lng: null },
        mapZoom: 13,
        hotspots: []
      });
      setNewHotspot({
        name: '',
        lat: '',
        lng: '',
        image360Url: '',
        image360Urls: [],
        video360Url: '',
        description: '',
        links: []
      });
      setHotspot360Files([]);
      setHotspot360Previews([]);
      setEditingHotspotIndex(null);
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
          className={activeTab === 'extensions' ? 'active' : ''}
          onClick={() => setActiveTab('extensions')}
        >
          Quản lý Mở rộng
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

              {/* Bản đồ và Hotspot */}
              <div className="form-group full-width">
                <label>🗺️ Bản đồ và Hotspot (Điểm đánh dấu trên bản đồ)</label>

                {/* Map Center */}
                <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f5f5f5', borderRadius: '6px' }}>
                  <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Tọa độ trung tâm bản đồ</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.85rem' }}>Latitude (Vĩ độ)</label>
                      <input
                        type="number"
                        step="any"
                        value={editingTour ? (editingTour.mapCenter?.lat || '') : (newTour.mapCenter?.lat || '')}
                        onChange={(e) => {
                          const value = e.target.value ? parseFloat(e.target.value) : null;
                          if (editingTour) {
                            setEditingTour({
                              ...editingTour,
                              mapCenter: { ...editingTour.mapCenter, lat: value }
                            });
                          } else {
                            setNewTour({
                              ...newTour,
                              mapCenter: { ...newTour.mapCenter, lat: value }
                            });
                          }
                        }}
                        placeholder="Ví dụ: 16.0544 (Đà Nẵng)"
                        style={{ width: '100%', padding: '0.5rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem' }}>Longitude (Kinh độ)</label>
                      <input
                        type="number"
                        step="any"
                        value={editingTour ? (editingTour.mapCenter?.lng || '') : (newTour.mapCenter?.lng || '')}
                        onChange={(e) => {
                          const value = e.target.value ? parseFloat(e.target.value) : null;
                          if (editingTour) {
                            setEditingTour({
                              ...editingTour,
                              mapCenter: { ...editingTour.mapCenter, lng: value }
                            });
                          } else {
                            setNewTour({
                              ...newTour,
                              mapCenter: { ...newTour.mapCenter, lng: value }
                            });
                          }
                        }}
                        placeholder="Ví dụ: 108.2022 (Đà Nẵng)"
                        style={{ width: '100%', padding: '0.5rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem' }}>Zoom level</label>
                      <input
                        type="number"
                        min="1"
                        max="18"
                        value={editingTour ? (editingTour.mapZoom || 13) : (newTour.mapZoom || 13)}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 13;
                          if (editingTour) {
                            setEditingTour({ ...editingTour, mapZoom: value });
                          } else {
                            setNewTour({ ...newTour, mapZoom: value });
                          }
                        }}
                        style={{ width: '100%', padding: '0.5rem' }}
                      />
                    </div>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>
                    💡 Tìm tọa độ tại: <a href="https://www.openstreetmap.org/" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> hoặc <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer">Google Maps</a>
                  </p>
                </div>

                {/* Hotspots */}
                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Danh sách Hotspot</h4>

                  {/* Form thêm/sửa hotspot */}
                  <div style={{ padding: '1rem', background: '#fff', border: '1px solid #ddd', borderRadius: '6px', marginBottom: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.85rem' }}>Tên điểm *</label>
                        <input
                          type="text"
                          value={newHotspot.name}
                          onChange={(e) => setNewHotspot({ ...newHotspot, name: e.target.value })}
                          placeholder="Ví dụ: Bãi biển Mỹ Khê"
                          style={{ width: '100%', padding: '0.5rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.85rem' }}>Mô tả</label>
                        <input
                          type="text"
                          value={newHotspot.description}
                          onChange={(e) => setNewHotspot({ ...newHotspot, description: e.target.value })}
                          placeholder="Mô tả ngắn về điểm này"
                          style={{ width: '100%', padding: '0.5rem' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.85rem' }}>Latitude *</label>
                        <input
                          type="number"
                          step="any"
                          value={newHotspot.lat}
                          onChange={(e) => setNewHotspot({ ...newHotspot, lat: e.target.value })}
                          placeholder="16.0544"
                          style={{ width: '100%', padding: '0.5rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.85rem' }}>Longitude *</label>
                        <input
                          type="number"
                          step="any"
                          value={newHotspot.lng}
                          onChange={(e) => setNewHotspot({ ...newHotspot, lng: e.target.value })}
                          placeholder="108.2022"
                          style={{ width: '100%', padding: '0.5rem' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.85rem' }}>Ảnh 360° (upload từ máy)</label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.35rem' }}>
                          <label className="upload-label" style={{ cursor: 'pointer', margin: 0 }}>
                            📷 Upload ảnh 360°
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png"
                              onChange={handleHotspot360Upload}
                              multiple
                              style={{ display: 'none' }}
                              disabled={uploadingHotspot360}
                            />
                          </label>
                          {uploadingHotspot360 && <span className="uploading-text">Đang upload...</span>}
                        </div>

                        {(newHotspot.image360Urls || []).length > 0 && (
                          <div style={{ marginTop: '0.35rem', background: '#e8f5e9', padding: '0.5rem', borderRadius: '6px', border: '1px solid #c8e6c9' }}>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#2e7d32' }}>✓ Đã có {newHotspot.image360Urls.length} ảnh 360° (đã lưu)</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                              {newHotspot.image360Urls.map((url, idx) => (
                                <div
                                  key={`saved-${idx}`}
                                  style={{
                                    width: '120px',
                                    textAlign: 'center',
                                    background: '#fff',
                                    border: '1px solid #c8e6c9',
                                    borderRadius: '6px',
                                    padding: '0.35rem',
                                    position: 'relative'
                                  }}
                                >
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: '4px',
                                      left: '4px',
                                      background: '#1976d2',
                                      color: '#fff',
                                      borderRadius: '4px',
                                      padding: '2px 6px',
                                      fontSize: '12px',
                                      fontWeight: 600
                                    }}
                                  >
                                    #{idx}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveHotspot360Url(idx)}
                                    style={{
                                      position: 'absolute',
                                      top: '4px',
                                      right: '4px',
                                      border: 'none',
                                      background: '#e53935',
                                      color: '#fff',
                                      borderRadius: '50%',
                                      width: '22px',
                                      height: '22px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      fontSize: '12px'
                                    }}
                                    title="Xóa ảnh đã lưu"
                                  >
                                    ×
                                  </button>
                                  <div style={{ width: '100%', height: '70px', overflow: 'hidden', borderRadius: '4px', marginBottom: '0.25rem' }}>
                                    <img
                                      src={url}
                                      alt={`360-${idx + 1}`}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: '#555' }}>Đã lưu</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {hotspot360Previews.length > 0 && (
                          <div style={{ marginTop: '0.35rem', background: '#fff8e1', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ffe0b2' }}>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#f57c00' }}>Ảnh 360° mới (chưa upload - sẽ upload khi Thêm/Cập nhật hotspot)</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                              {hotspot360Previews.map((url, idx) => (
                                <div
                                  key={`pending-${idx}`}
                                  style={{
                                    width: '120px',
                                    textAlign: 'center',
                                    background: '#fff',
                                    border: '1px solid #ffe0b2',
                                    borderRadius: '6px',
                                    padding: '0.35rem',
                                    position: 'relative'
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePendingHotspot360File(idx)}
                                    style={{
                                      position: 'absolute',
                                      top: '4px',
                                      right: '4px',
                                      border: 'none',
                                      background: '#e53935',
                                      color: '#fff',
                                      borderRadius: '50%',
                                      width: '22px',
                                      height: '22px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      fontSize: '12px'
                                    }}
                                    title="Xóa ảnh mới chọn"
                                  >
                                    ×
                                  </button>
                                  <div style={{ width: '100%', height: '70px', overflow: 'hidden', borderRadius: '4px', marginBottom: '0.25rem' }}>
                                    <img
                                      src={url}
                                      alt={`pending-360-${idx + 1}`}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: '#f57c00' }}>Chưa upload</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <label style={{ fontSize: '0.85rem' }}>URL video 360° YouTube (tùy chọn)</label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            type="url"
                            value={newHotspot.video360Url}
                            onChange={(e) => setNewHotspot({ ...newHotspot, video360Url: e.target.value })}
                            placeholder="https://youtube.com/watch?v=..."
                            style={{ flex: 1, padding: '0.5rem' }}
                          />
                          {newHotspot.video360Url ? (
                            <button
                              type="button"
                              onClick={() => setNewHotspot({ ...newHotspot, video360Url: '' })}
                              style={{
                                padding: '0.45rem 0.75rem',
                                borderRadius: '6px',
                                border: '1px solid #e53935',
                                background: '#e53935',
                                color: '#fff',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              🗑️ Xóa URL
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              style={{
                                padding: '0.45rem 0.75rem',
                                borderRadius: '6px',
                                border: '1px solid #ddd',
                                background: '#f5f5f5',
                                color: '#999',
                                cursor: 'not-allowed',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              Xóa URL
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Liên kết mũi tên giữa các ảnh 360° */}
                    <div style={{ marginTop: '0.5rem', padding: '0.75rem', border: '1px dashed #ccc', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <div>
                          <label style={{ fontSize: '0.95rem', fontWeight: 600 }}>Liên kết mũi tên (Street View)</label>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>
                            Chỉ số hotspot/ảnh bắt đầu từ 0. Yaw: hướng ngang (0-360°). Pitch: hướng dọc (âm = nghiêng xuống, dương = nghiêng lên). Mặc định pitch = -25° để mũi tên nghiêng xuống mặt đất.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddHotspotLink}
                          className="btn-add"
                          style={{ padding: '0.35rem 0.75rem' }}
                        >
                          ➕ Thêm mũi tên
                        </button>
                      </div>

                      {(newHotspot.links || []).length === 0 && (
                        <div style={{ fontSize: '0.85rem', color: '#888', background: '#f7f7f7', padding: '0.5rem', borderRadius: '6px' }}>
                          Chưa có liên kết. Thêm mũi tên để chuyển cảnh giữa các ảnh 360°.
                        </div>
                      )}

                      {(newHotspot.links || []).map((link, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(6, 1fr) auto',
                            gap: '0.35rem',
                            alignItems: 'center',
                            padding: '0.35rem 0',
                            borderBottom: '1px dashed #eee'
                          }}
                        >
                          <div>
                            <label style={{ fontSize: '0.8rem' }}>From Scene</label>
                            <input
                              type="number"
                              value={link.fromSceneIndex === null || link.fromSceneIndex === undefined ? '' : link.fromSceneIndex}
                              onChange={(e) => handleUpdateHotspotLink(idx, 'fromSceneIndex', e.target.value)}
                              style={{ width: '100%', padding: '0.4rem' }}
                              min="0"
                              placeholder="(trống = mọi ảnh)"
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8rem' }}>To Hotspot</label>
                            <input
                              type="number"
                              value={link.toHotspotIndex ?? 0}
                              onChange={(e) => handleUpdateHotspotLink(idx, 'toHotspotIndex', e.target.value)}
                              style={{ width: '100%', padding: '0.4rem' }}
                              min="0"
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8rem' }}>To Scene</label>
                            <input
                              type="number"
                              value={link.toSceneIndex ?? 0}
                              onChange={(e) => handleUpdateHotspotLink(idx, 'toSceneIndex', e.target.value)}
                              style={{ width: '100%', padding: '0.4rem' }}
                              min="0"
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8rem' }}>Yaw (°)</label>
                            <input
                              type="number"
                              step="any"
                              value={link.yaw ?? 0}
                              onChange={(e) => handleUpdateHotspotLink(idx, 'yaw', e.target.value)}
                              style={{ width: '100%', padding: '0.4rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8rem' }}>Pitch (°)</label>
                            <input
                              type="number"
                              step="any"
                              value={link.pitch !== undefined && link.pitch !== null ? link.pitch : -25}
                              onChange={(e) => handleUpdateHotspotLink(idx, 'pitch', e.target.value)}
                              placeholder="-25 (nghiêng xuống)"
                              style={{ width: '100%', padding: '0.4rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8rem' }}>Nhãn</label>
                            <input
                              type="text"
                              value={link.text || ''}
                              onChange={(e) => handleUpdateHotspotLink(idx, 'text', e.target.value)}
                              placeholder="Đi tiếp"
                              style={{ width: '100%', padding: '0.4rem' }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveHotspotLink(idx)}
                            className="btn-delete"
                            style={{ padding: '0.45rem 0.6rem', justifySelf: 'center' }}
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {editingHotspotIndex !== null ? (
                        <>
                          <button
                            type="button"
                            onClick={handleUpdateHotspot}
                            className="btn-add"
                            style={{ flex: 1 }}
                          >
                            ✓ Cập nhật Hotspot
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditHotspot}
                            className="btn-outline"
                            style={{ flex: 1 }}
                          >
                            Hủy
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={handleAddHotspot}
                          className="btn-add"
                          style={{ width: '100%' }}
                        >
                          ➕ Thêm Hotspot
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Danh sách wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwhotspots */}
                  {(editingTour ? editingTour.hotspots : newTour.hotspots).length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      {(editingTour ? editingTour.hotspots : newTour.hotspots).map((hotspot, index) => (
                        <div key={index} style={{
                          padding: '0.75rem',
                          background: '#f9f9f9',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          marginBottom: '0.5rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '28px',
                                borderRadius: '6px',
                                background: '#e3f2fd',
                                border: '1px solid #90caf9',
                                color: '#0d47a1',
                                fontWeight: 700,
                                fontSize: '0.9rem'
                              }}>
                                #{index}
                              </span>
                              <strong>📍 {hotspot.name}</strong>
                            </div>
                            {hotspot.description && <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#666' }}>{hotspot.description}</p>}
                            <p style={{ margin: '0.25rem 0', fontSize: '0.8rem', color: '#888' }}>
                              Tọa độ: {hotspot.lat}, {hotspot.lng}
                              {(() => {
                                const imagesCount = hotspot.image360Urls?.length || (hotspot.image360Url ? 1 : 0);
                                return imagesCount > 0 ? ` | 📷 ${imagesCount} ảnh 360°` : '';
                              })()}
                              {hotspot.video360Url && ' | 🎥 Có video 360°'}
                              {hotspot.links?.length ? ` | 🔗 ${hotspot.links.length} mũi tên` : ''}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => handleEditHotspot(index)}
                              className="btn-edit"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveHotspot(index)}
                              className="btn-delete"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="upload-hint" style={{ marginTop: '0.5rem' }}>
                    💡 Hotspot là các điểm đánh dấu trên bản đồ. Khi người dùng click vào hotspot, họ sẽ xem được ảnh/video 360° của điểm đó.
                    <br />Nếu hotspot không có ảnh/video 360° riêng, sẽ dùng ảnh/video 360° của tour.
                  </p>
                </div>
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
      ) : activeTab === 'extensions' ? (
        <TourExtensionsAdmin />
      ) : (
        <div className="stats-tab">
          <h2>Tour đã hoàn thành</h2>
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
                    <div style={{ color: '#666' }}>
                      <p>Chưa có dữ liệu tour đã hoàn thành</p>
                      <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        💡 Thống kê chỉ hiển thị các đơn đặt có trạng thái <strong>"Hoàn thành"</strong>
                      </p>
                    </div>
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
              {revenueStats.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <div style={{ color: '#666' }}>
                      <p>Chưa có dữ liệu doanh thu</p>
                      <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        💡 Thống kê chỉ hiển thị các đơn đặt có trạng thái <strong>"Hoàn thành"</strong>
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                revenueStats.map((s, idx) => (
                  <tr key={idx}>
                    <td>{s.year}</td>
                    <td>{s.month}</td>
                    <td>{s.totalBookings}</td>
                    <td>{s.totalRevenue.toLocaleString()} VND</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
