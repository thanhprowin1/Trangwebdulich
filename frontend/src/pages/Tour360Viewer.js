import React, { useEffect, useState, useRef } from 'react';
import { useParams, useHistory, Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

const Tour360Viewer = () => {
  const { id } = useParams();
  const history = useHistory();
  const [tour, setTour] = useState(null);
  const [isLoading360, setIsLoading360] = useState(true);
  const [pannellumViewer, setPannellumViewer] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVRMode, setIsVRMode] = useState(false);
  const [vrVideoUrl, setVrVideoUrl] = useState(null);
  const [xrSession, setXrSession] = useState(null);
  const [viewerReloadToken, setViewerReloadToken] = useState(0);
  const vrAnimationFrameRef = useRef(null);
  const youtubePlayerRef = useRef(null);

  // Hàm extract YouTube video ID từ URL
  const extractYouTubeVideoId = (url) => {
    if (!url) return null;
    
    // Hỗ trợ các format:
    // https://www.youtube.com/watch?v=VIDEO_ID
    // https://youtu.be/VIDEO_ID
    // https://www.youtube.com/embed/VIDEO_ID
    // https://m.youtube.com/watch?v=VIDEO_ID
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };

  useEffect(() => {
    const fetchTour = async () => {
      try {
        setErrorMessage('');
        const response = await axios.get(`${API_URL}/tours/${id}`);
        const fetchedTour = response.data?.data?.tour;
        if (!fetchedTour) {
          setErrorMessage('Không tìm thấy tour bạn yêu cầu.');
          return;
        }
        if (!fetchedTour.image360Url && !fetchedTour.video360Url) {
          setErrorMessage('Tour này chưa có ảnh 360° hoặc video 360°.');
        }
        
        setTour(fetchedTour);
      } catch (error) {
        console.error('Error fetching tour 360:', error);
        setErrorMessage('Có lỗi xảy ra khi tải dữ liệu tour. Vui lòng thử lại.');
      }
    };

    fetchTour();
  }, [id]);

  useEffect(() => {
    if (!tour || !tour.image360Url || !window.pannellum) {
      setIsLoading360(false);
      return undefined;
    }

    setIsLoading360(true);

    let loadTimeout;
    let isLoaded = false;

    const timer = setTimeout(() => {
      try {
        const container = document.getElementById('panorama360-viewer');
        if (container) {
          container.innerHTML = '';
        }

        const handleLoad = () => {
          if (!isLoaded) {
            isLoaded = true;
            setIsLoading360(false);
            if (loadTimeout) clearTimeout(loadTimeout);
          }
        };

        const viewer = window.pannellum.viewer('panorama360-viewer', {
          type: 'equirectangular',
          panorama: tour.image360Url,
          autoLoad: true,
          autoRotate: 0,
          showControls: true,
          showFullscreenCtrl: true,
          showZoomCtrl: true,
          hfov: 100,
          minHfov: 50,
          maxHfov: 120,
          compass: true,
          northOffset: 0,
          onLoad: handleLoad,
          onError: (error) => {
            console.error('Pannellum error:', error);
            if (!isLoaded) {
              isLoaded = true;
              setIsLoading360(false);
            }
            if (loadTimeout) clearTimeout(loadTimeout);
            setErrorMessage('Không thể tải ảnh 360°. Vui lòng thử lại sau.');
          }
        });

        setPannellumViewer(viewer);

        // Fallback timeout: nếu onLoad không được gọi sau 3 giây, tự động tắt loading
        loadTimeout = setTimeout(() => {
          if (!isLoaded) {
            console.warn('Pannellum onLoad timeout, hiding loading indicator');
            isLoaded = true;
            setIsLoading360(false);
          }
        }, 3000);

      } catch (error) {
        console.error('Error initializing Pannellum:', error);
        setIsLoading360(false);
        setErrorMessage('Không thể khởi tạo trình xem 360°.');
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (loadTimeout) clearTimeout(loadTimeout);
      if (pannellumViewer && window.pannellum) {
        try {
          pannellumViewer.destroy();
        } catch (e) {
          // ignore cleanup errors
        }
      }
    };
  }, [tour?.image360Url, viewerReloadToken]);

  const handleBack = () => {
    history.push('/tours-360');
  };

  const handleReload360 = () => {
    if (!tour?.image360Url) return;
    setErrorMessage('');
    setIsLoading360(true);
    setViewerReloadToken((prev) => prev + 1);
  };

  const handleEnterVR = async () => {
    try {
      const videoUrl = tour?.video360Url;
      
      if (!videoUrl) {
        alert('Tour này chưa có video 360°. Vui lòng thêm link YouTube video 360° vào tour.');
        return;
      }

      // Kiểm tra xem có phải YouTube link không
      const youtubeVideoId = extractYouTubeVideoId(videoUrl);
      
      if (youtubeVideoId) {
        // Dùng YouTube IFrame API
        showYouTubeVRMode(youtubeVideoId);
      } else {
        // Fallback: dùng video URL trực tiếp (nếu không phải YouTube)
        alert('Chỉ hỗ trợ link YouTube. Vui lòng nhập link YouTube video 360° hợp lệ.');
        return;
      }
      
    } catch (error) {
      console.error('Error entering VR mode:', error);
      alert('Không thể bật chế độ VR. Vui lòng thử lại.');
    }
  };

  const showYouTubeVRMode = (videoId) => {
    // Ẩn panorama viewer
    const panoramaContainer = document.getElementById('panorama360-viewer');
    if (panoramaContainer) {
      panoramaContainer.style.display = 'none';
    }

    // Tạo container cho YouTube VR mode (fullscreen)
    const vrContainer = document.createElement('div');
    vrContainer.id = 'vr-video-container';
    vrContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: #000;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    `;

    // Tạo div cho YouTube player
    const playerDiv = document.createElement('div');
    playerDiv.id = 'youtube-vr-player';
    playerDiv.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
    `;

    // Nút điều khiển
    const controls = document.createElement('div');
    controls.style.cssText = `
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 10px;
      z-index: 10002;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Thoát VR';
    closeBtn.style.cssText = `
      padding: 12px 24px;
      background: rgba(211, 47, 47, 0.9);
      color: white;
      border: 2px solid white;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      transition: all 0.3s ease;
    `;
    closeBtn.onmouseover = () => {
      closeBtn.style.background = 'rgba(211, 47, 47, 1)';
      closeBtn.style.transform = 'scale(1.05)';
    };
    closeBtn.onmouseout = () => {
      closeBtn.style.background = 'rgba(211, 47, 47, 0.9)';
      closeBtn.style.transform = 'scale(1)';
    };
    closeBtn.onclick = () => {
      exitVRMode();
    };

    controls.appendChild(closeBtn);
    vrContainer.appendChild(playerDiv);
    vrContainer.appendChild(controls);
    document.body.appendChild(vrContainer);

    // Khởi tạo YouTube player với VR mode
    const initYouTubePlayer = () => {
      if (window.YT && window.YT.Player) {
        const player = new window.YT.Player('youtube-vr-player', {
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            iv_load_policy: 3,
            // VR mode parameters
            enablejsapi: 1,
            playsinline: 1
          },
          events: {
            onReady: (event) => {
              event.target.playVideo();
              setIsVRMode(true);
            },
            onError: (event) => {
              console.error('YouTube player error:', event.data);
              alert('Không thể phát video YouTube. Vui lòng kiểm tra lại link.');
              exitVRMode();
            }
          }
        });
        youtubePlayerRef.current = player;
      } else {
        // Nếu YouTube API chưa load, đợi một chút rồi thử lại
        setTimeout(initYouTubePlayer, 100);
      }
    };

    // Đợi YouTube IFrame API load
    if (window.YT && window.YT.Player) {
      initYouTubePlayer();
    } else {
      // Nếu chưa có, đợi callback
      window.onYouTubeIframeAPIReady = () => {
        initYouTubePlayer();
      };
      // Hoặc thử lại sau 1 giây
      setTimeout(() => {
        if (window.YT && window.YT.Player) {
          initYouTubePlayer();
        } else {
          alert('Không thể tải YouTube Player. Vui lòng kiểm tra kết nối mạng.');
          exitVRMode();
        }
      }, 1000);
    }

    setIsVRMode(true);
    setVrVideoUrl(tour?.video360Url);
  };

  const exitVRMode = () => {
    // Cancel animation frame
    if (vrAnimationFrameRef.current) {
      cancelAnimationFrame(vrAnimationFrameRef.current);
      vrAnimationFrameRef.current = null;
    }
    
    // Destroy YouTube player
    if (youtubePlayerRef.current) {
      try {
        youtubePlayerRef.current.destroy();
      } catch (e) {
        console.warn('Error destroying YouTube player:', e);
      }
      youtubePlayerRef.current = null;
    }
    
    const vrContainer = document.getElementById('vr-video-container');
    if (vrContainer) {
      const video = document.getElementById('vr-video-player');
      if (video) {
        video.pause();
        video.src = '';
      }
      const canvas = document.getElementById('vr-video-canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      if (vrContainer.parentNode) {
        document.body.removeChild(vrContainer);
      }
    }
    
    // Hiện lại panorama viewer
    const panoramaContainer = document.getElementById('panorama360-viewer');
    if (panoramaContainer) {
      panoramaContainer.style.display = 'block';
    }

    if (pannellumViewer) {
      try {
        pannellumViewer.destroy();
      } catch (e) {
        console.warn('Error destroying Pannellum viewer on VR exit:', e);
      }
      setPannellumViewer(null);
    }
    setIsLoading360(true);
    setViewerReloadToken((prev) => prev + 1);

    setIsVRMode(false);
    setVrVideoUrl(null);
    
    // End XR session nếu có
    if (xrSession) {
      xrSession.end();
      setXrSession(null);
    }
  };

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

          {tour ? (
            <>
              {/* Ảnh 360° */}
              {tour.image360Url && (
                <div className="tour-360-viewer-content">
                  {isLoading360 && (
                    <div className="panorama-loading">
                      <div className="loading-spinner"></div>
                      <p>Đang tải ảnh 360°...</p>
                    </div>
                  )}
                  <div
                    id="panorama360-viewer"
                    key={viewerReloadToken}
                    className="panorama-viewer"
                  ></div>
                  {!tour.video360Url && (
                    <div className="panorama-controls">
                      <p className="panorama-hint">
                        💡 Kéo chuột để xoay, cuộn để zoom.
                      </p>
                      <button
                        className="btn btn-outline"
                        onClick={handleReload360}
                        disabled={isLoading360}
                      >
                        ↻ Tải lại ảnh 360°
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Nút Bật WebVR - chỉ hiện khi có video360Url */}
              {tour.video360Url && tour.image360Url && (
                <div className="panorama-controls" style={{ marginTop: '1.5rem' }}>
                  <button
                    onClick={handleEnterVR}
                    className="btn btn-primary btn-vr"
                    disabled={!pannellumViewer || isLoading360}
                  >
                    🥽 Bật WebVR (Video 360°)
                  </button>
                  <button
                    onClick={handleReload360}
                    className="btn btn-outline"
                    disabled={isLoading360}
                  >
                    ↻ Tải lại ảnh 360°
                  </button>
                  <p className="panorama-hint">
                    💡 Nhấn nút WebVR để xem video 360° với chế độ toàn màn hình và VR.
                  </p>
                </div>
              )}
              
              {/* Nếu chỉ có video mà không có ảnh */}
              {tour.video360Url && !tour.image360Url && (
                <div className="tour-360-viewer-content">
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-color)' }}>
                      🎥 Video 360°
                    </h3>
                    <p style={{ marginBottom: '1.5rem', color: '#666' }}>
                      Bấm nút bên dưới để xem video 360° với chế độ VR
                    </p>
                    <button
                      onClick={handleEnterVR}
                      className="btn btn-primary btn-vr"
                    >
                      🥽 Bật WebVR (Video 360°)
                    </button>
                  </div>
                </div>
              )}

              {/* Nếu không có cả ảnh và video */}
              {!tour.image360Url && !tour.video360Url && !errorMessage && (
                <div className="empty-state">
                  <p>Tour này chưa có ảnh 360° hoặc video 360°.</p>
                </div>
              )}
            </>
          ) : !errorMessage ? (
            <div className="empty-state">
              <p>Đang tải thông tin tour 360°...</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Tour360Viewer;

