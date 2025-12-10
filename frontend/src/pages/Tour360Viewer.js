import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useHistory, Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import MapWithHotspots from '../components/MapWithHotspots';

const Tour360Viewer = () => {
  const { id } = useParams();
  const history = useHistory();
  const [tour, setTour] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [selectedHotspotIndex, setSelectedHotspotIndex] = useState(null);
  const [show360Modal, setShow360Modal] = useState(false);
  const [activeImage360Url, setActiveImage360Url] = useState(null);
  const [currentSceneId, setCurrentSceneId] = useState(null);
  const modalPannellumRef = useRef(null);

  // Helper function để kiểm tra mapCenter hợp lệ
  const hasValidMapCenter = (mapCenter) => {
    return mapCenter && 
           mapCenter.lat !== null && 
           mapCenter.lat !== undefined &&
           mapCenter.lng !== null && 
           mapCenter.lng !== undefined &&
           !isNaN(mapCenter.lat) &&
           !isNaN(mapCenter.lng);
  };

  useEffect(() => {
    const fetchTour = async () => {
      try {
        setLoading(true);
        setErrorMessage('');
        const response = await axios.get(`${API_URL}/tours/${id}`);
        const fetchedTour = response.data?.data?.tour;
        
        if (!fetchedTour) {
          setErrorMessage('Không tìm thấy tour bạn yêu cầu.');
          setLoading(false);
          return;
        }
        
        // Kiểm tra tour có bản đồ và hotspot không
        if (!hasValidMapCenter(fetchedTour.mapCenter) || 
            !fetchedTour.hotspots || 
            fetchedTour.hotspots.length === 0) {
          setErrorMessage('Tour này chưa có bản đồ hoặc hotspot. Vui lòng thêm bản đồ và hotspot trong Admin Dashboard.');
        }
        
        setTour(fetchedTour);
      } catch (error) {
        console.error('Error fetching tour:', error);
        setErrorMessage('Có lỗi xảy ra khi tải dữ liệu tour. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };

    fetchTour();
  }, [id]);

  // Tạo sceneId chuẩn để load qua lại giữa các ảnh
  const buildSceneId = (hotspotIndex, imageIndex) => `hotspot-${hotspotIndex}-scene-${imageIndex}`;

  const parseSceneId = (sceneId) => {
    const match = /^hotspot-(\d+)-scene-(\d+)$/.exec(sceneId || '');
    if (!match) return { hotspotIndex: null, sceneIndex: null };
    return { hotspotIndex: Number(match[1]), sceneIndex: Number(match[2]) };
  };

  // Lấy danh sách ảnh 360° cho một hotspot (ưu tiên mảng, sau đó đơn lẻ, sau cùng fallback tour)
  const getHotspotImages = (hotspot) => {
    if (!hotspot) return [];
    if (hotspot.image360Urls && hotspot.image360Urls.length > 0) return hotspot.image360Urls;
    if (hotspot.image360Url) return [hotspot.image360Url];
    return tour?.image360Url ? [tour.image360Url] : [];
  };

  // Xây dựng cấu hình scenes cho Pannellum với các liên kết (mũi tên) giữa ảnh
  const buildScenesFromTour = (tourData) => {
    if (!tourData?.hotspots) return {};
    const scenes = {};

    tourData.hotspots.forEach((hotspot, hIndex) => {
      const images = getHotspotImages(hotspot);
      if (!images || images.length === 0) {
        return;
      }

      images.forEach((imageUrl, imgIndex) => {
        const sceneId = buildSceneId(hIndex, imgIndex);
        const hotSpots = [];

        // Tạo mũi tên scene-link dựa trên links đã cấu hình (có thể áp dụng cho tất cả ảnh hoặc chỉ ảnh cụ thể)
        if (hotspot.links && Array.isArray(hotspot.links)) {
          hotspot.links.forEach((link) => {
            // Nếu link chỉ áp dụng cho 1 ảnh cụ thể, bỏ qua ảnh khác
            if (link.fromSceneIndex !== null && link.fromSceneIndex !== undefined && link.fromSceneIndex !== imgIndex) {
              return;
            }

            const targetHotspotIndex = typeof link.toHotspotIndex === 'number' ? link.toHotspotIndex : hIndex;
            const targetHotspot = tourData.hotspots[targetHotspotIndex];
            const targetImages = getHotspotImages(targetHotspot);

            if (targetHotspot && targetImages.length > 0) {
              const targetImageIndex = Math.min(
                typeof link.toSceneIndex === 'number' ? link.toSceneIndex : 0,
                targetImages.length - 1
              );
              const targetSceneId = buildSceneId(targetHotspotIndex, targetImageIndex);

              // Nếu text là chuỗi rỗng, để Pannellum tự xử lý (không hiển thị nhãn)
              // Chỉ fallback khi text là undefined/null (dữ liệu cũ)
              const hotspotText = link.text !== undefined && link.text !== null 
                ? link.text 
                : (targetHotspot?.name || 'Đi tiếp');
              
              hotSpots.push({
                pitch: typeof link.pitch === 'number' ? link.pitch : 0,
                yaw: typeof link.yaw === 'number' ? link.yaw : 0,
                type: 'scene',
                text: hotspotText,
                sceneId: targetSceneId
              });
            }
          });
        }

        scenes[sceneId] = {
          title: `${hotspot.name || 'Hotspot'}${images.length > 1 ? ` (#${imgIndex + 1})` : ''}`,
          type: 'equirectangular',
          panorama: imageUrl,
          autoLoad: true,
          hotSpots
        };
      });
    });

    return scenes;
  };

  const sceneMap = useMemo(() => (tour ? buildScenesFromTour(tour) : {}), [tour]);
  const hasScenes = Object.keys(sceneMap).length > 0;

  // Xử lý khi click vào hotspot
  const handleHotspotClick = (hotspot, index) => {
    setSelectedHotspot(hotspot);
    setSelectedHotspotIndex(index);
    const images = getHotspotImages(hotspot);
    const firstHotspotImg = images[0] || hotspot.image360Url || tour?.image360Url || null;
    setActiveImage360Url(firstHotspotImg);
    setCurrentSceneId(buildSceneId(index, 0));
    
    // Nếu hotspot có ảnh hoặc video 360°, hiển thị modal
    if (images.length > 0 || hotspot.video360Url || tour?.image360Url || tour?.video360Url) {
      setShow360Modal(true);
    }
  };

  const handleClose360Modal = () => {
    // Destroy pannellum viewer khi đóng modal
    if (modalPannellumRef.current && window.pannellum) {
      try {
        modalPannellumRef.current.destroy();
      } catch (e) {
        console.warn('Error destroying modal pannellum:', e);
      }
      modalPannellumRef.current = null;
    }
    setShow360Modal(false);
    setSelectedHotspot(null);
    setSelectedHotspotIndex(null);
    setActiveImage360Url(null);
    setCurrentSceneId(null);
  };

  // Khởi tạo pannellum viewer với multi-scene và hotspot điều hướng
  useEffect(() => {
    if (!show360Modal || !window.pannellum || !hasScenes) {
      return;
    }

    const container = document.getElementById('modal-panorama-viewer');
    if (!container) return;
    container.innerHTML = '';

    const initialSceneFromHotspot = selectedHotspotIndex !== null ? buildSceneId(selectedHotspotIndex, 0) : null;
    const sceneIds = Object.keys(sceneMap);
    const initialScene = (currentSceneId && sceneMap[currentSceneId])
      ? currentSceneId
      : (initialSceneFromHotspot && sceneMap[initialSceneFromHotspot])
        ? initialSceneFromHotspot
        : sceneIds[0];

    if (!initialScene) return;

    const timer = setTimeout(() => {
      try {
        const viewer = window.pannellum.viewer('modal-panorama-viewer', {
          default: {
            firstScene: initialScene,
          autoLoad: true,
            autoRotate: 0
          },
          showControls: true,
          showFullscreenCtrl: true,
          showZoomCtrl: true,
          mouseZoom: true,
          keyboardZoom: false,
          orientationOnByDefault: false,
          minPitch: -85,
          maxPitch: 85,
          hfov: 100,
          minHfov: 50,
          maxHfov: 120,
          northOffset: 0,
          scenes: sceneMap
        });

        if (viewer && typeof viewer.on === 'function') {
          viewer.on('scenechange', (sceneId) => {
            setCurrentSceneId(sceneId);
            const { hotspotIndex } = parseSceneId(sceneId);
            if (hotspotIndex !== null && tour?.hotspots?.[hotspotIndex]) {
              setSelectedHotspot(tour.hotspots[hotspotIndex]);
              setSelectedHotspotIndex(hotspotIndex);
            }
        });
        }

        modalPannellumRef.current = viewer;
        setCurrentSceneId(initialScene);
      } catch (error) {
        console.error('Error initializing modal pannellum:', error);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (modalPannellumRef.current && window.pannellum) {
        try {
          modalPannellumRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying modal pannellum on cleanup:', e);
        }
        modalPannellumRef.current = null;
      }
    };
  }, [show360Modal, sceneMap, selectedHotspotIndex, hasScenes, currentSceneId, tour]);

  const handleBack = () => {
    history.push('/tours-360');
  };

  // Lấy URL 360° để hiển thị (ưu tiên hotspot, sau đó tour)
  const get360ImageUrl = () => {
    if (activeImage360Url) return activeImage360Url;
    if (selectedHotspot?.image360Urls && selectedHotspot.image360Urls.length > 0) return selectedHotspot.image360Urls[0];
    if (selectedHotspot?.image360Url) return selectedHotspot.image360Url;
    if (tour?.image360Url) return tour.image360Url;
    return null;
  };

  const get360VideoUrl = () => {
    if (selectedHotspot?.video360Url) return selectedHotspot.video360Url;
    if (tour?.video360Url) return tour.video360Url;
    return null;
  };

  const handleSceneSelect = (sceneId) => {
    setCurrentSceneId(sceneId);
    if (modalPannellumRef.current && sceneMap[sceneId]) {
      try {
        modalPannellumRef.current.loadScene(sceneId);
      } catch (e) {
        console.warn('Không thể load scene:', e);
      }
    }
    const { hotspotIndex, sceneIndex } = parseSceneId(sceneId);
    if (hotspotIndex !== null && tour?.hotspots?.[hotspotIndex]) {
      const hImages = getHotspotImages(tour.hotspots[hotspotIndex]);
      setSelectedHotspot(tour.hotspots[hotspotIndex]);
      setSelectedHotspotIndex(hotspotIndex);
      setActiveImage360Url(hImages[sceneIndex] || null);
    }
  };

  // Extract YouTube video ID
  const extractYouTubeVideoId = (url) => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
    }
    }
    return null;
  };

  if (loading) {
    return (
      <div className="tour-360-viewer-page">
        <div className="container">
          <div className="tour-360-viewer-card">
            <div className="empty-state">
              <p>Đang tải thông tin tour...</p>
            </div>
          </div>
        </div>
      </div>
    );
    }

  return (
    <div className="tour-360-viewer-page">
      <div className="container">
        <div className="tour-360-viewer-card">
          <div className="tour-360-viewer-header">
            <button className="btn btn-light btn-back" onClick={handleBack}>
              ← Quay lại danh sách tour 360°
            </button>
            {tour && (
              <div className="tour-360-viewer-title">
                <p className="tour-name">{tour.name}</p>
                <Link to={`/tours/${tour._id}`} className="tour-detail-link">
                  Xem chi tiết tour
                </Link>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="alert alert-error">
              {errorMessage}
            </div>
          )}

          {tour && hasValidMapCenter(tour.mapCenter) && tour.hotspots && tour.hotspots.length > 0 ? (
                <div className="tour-360-viewer-content">
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-color)' }}>
                  🗺️ Bản đồ khu vực {tour.destination}
                </h3>
              </div>
              
              <MapWithHotspots
                center={tour.mapCenter}
                zoom={tour.mapZoom || 13}
                hotspots={tour.hotspots}
                onHotspotClick={handleHotspotClick}
                height="600px"
              />
              
              <p style={{ marginTop: '1rem', color: '#666', fontSize: '14px', textAlign: 'center' }}>
                💡 Nhấp vào các điểm đánh dấu trên bản đồ để xem ảnh/video 360° của từng địa điểm
              </p>
            </div>
          ) : tour ? (
            <div className="empty-state">
              <p>Tour này chưa có bản đồ hoặc hotspot. Vui lòng thêm bản đồ và hotspot trong Admin Dashboard.</p>
                    </div>
          ) : null}

          {/* Modal hiển thị 360° khi click hotspot */}
          {show360Modal && (
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                zIndex: 10000,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem'
              }}
              onClick={handleClose360Modal}
            >
              <div 
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: '1200px',
                  maxHeight: '90vh',
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  overflow: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header với thông tin hotspot */}
                {selectedHotspot && (
                  <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #ddd' }}>
                    <h3 style={{ marginBottom: '0.5rem', color: '#ff5722' }}>
                      📍 {selectedHotspot.name}
                    </h3>
                    {selectedHotspot.description && (
                      <p style={{ color: '#666', fontSize: '14px' }}>
                        {selectedHotspot.description}
                      </p>
                  )}
                </div>
              )}

                {/* Nút đóng */}
                  <button
                  onClick={handleClose360Modal}
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: '#ff5722',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    fontSize: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10001
                  }}
                  >
                  ✕
                  </button>

                {/* Danh sách ảnh 360° (nếu hotspot có nhiều ảnh) */}
                {selectedHotspot && (() => {
                  const hotspotImages = getHotspotImages(selectedHotspot);
                  if (!hotspotImages.length) return null;
                  return (
                  <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {hotspotImages.map((url, idx) => {
                        const sceneId = buildSceneId(selectedHotspotIndex ?? 0, idx);
                        const isActive = currentSceneId === sceneId || activeImage360Url === url;
                        return (
                      <button
                        key={idx}
                        type="button"
                            onClick={() => handleSceneSelect(sceneId)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                              border: isActive ? '2px solid #ff5722' : '1px solid #ddd',
                              background: isActive ? '#fff3e0' : '#fff',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        Ảnh 360° #{idx + 1}
                      </button>
                        );
                      })}
                  </div>
                  );
                })()}

                {/* Hiển thị ảnh 360° */}
                {(hasScenes || get360ImageUrl()) && window.pannellum && (
                  <div style={{ marginBottom: '1rem' }}>
                    <style>{`
                      /* Làm mờ mũi tên điều hướng trong Pannellum */
                      #modal-panorama-viewer .pnlm-hotspot {
                        opacity: 0.3 !important;
                        transition: opacity 0.2s ease;
                      }
                      #modal-panorama-viewer .pnlm-hotspot:hover {
                        opacity: 0.7 !important;
                      }
                    `}</style>
                    <div
                      id="modal-panorama-viewer"
                      style={{ width: '100%', height: '500px', borderRadius: '8px', overflow: 'hidden' }}
                    ></div>
                  </div>
                )}
              
                {/* Hiển thị video 360° YouTube */}
                {get360VideoUrl() && (() => {
                  const videoId = extractYouTubeVideoId(get360VideoUrl());
                  if (videoId) {
                    return (
                      <div style={{ marginTop: '1rem' }}>
                        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
                          <iframe
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%'
                            }}
                            src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Nếu không có ảnh/video */}
                {!get360ImageUrl() && !get360VideoUrl() && (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p style={{ color: '#666' }}>
                      Hotspot này chưa có ảnh hoặc video 360°.
                    </p>
                </div>
              )}
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tour360Viewer;
