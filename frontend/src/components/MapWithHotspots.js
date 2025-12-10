import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix cho icon marker mặc định của Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component để tự động điều chỉnh view của map khi center thay đổi
function MapView({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (center && center.lat && center.lng) {
      map.setView([center.lat, center.lng], zoom);
    }
  }, [center, zoom, map]);
  
  return null;
}

const MapWithHotspots = ({ 
  center, 
  zoom = 13, 
  hotspots = [], 
  onHotspotClick,
  height = '400px' 
}) => {
  // Tọa độ mặc định cho Đà Nẵng nếu không có center
  const defaultCenter = center && center.lat && center.lng 
    ? [center.lat, center.lng] 
    : [16.0544, 108.2022]; // Tọa độ Đà Nẵng

  const mapZoom = zoom || 13;

  // Tạo custom icon cho hotspot
  const createCustomIcon = (isActive = false) => {
    return L.divIcon({
      className: 'custom-hotspot-marker',
      html: `<div class="hotspot-marker ${isActive ? 'active' : ''}">
        <div class="hotspot-pulse"></div>
        <div class="hotspot-icon">📍</div>
      </div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });
  };

  return (
    <div className="map-with-hotspots" style={{ height, width: '100%', position: 'relative' }}>
      <style>{`
        .map-with-hotspots {
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .leaflet-container {
          height: 100%;
          width: 100%;
          z-index: 1;
        }
        .custom-hotspot-marker {
          background: transparent;
          border: none;
        }
        .hotspot-marker {
          position: relative;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .hotspot-marker:hover {
          transform: scale(1.2);
        }
        .hotspot-marker.active {
          transform: scale(1.3);
        }
        .hotspot-pulse {
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 87, 34, 0.3);
          animation: pulse 2s infinite;
        }
        .hotspot-icon {
          position: relative;
          font-size: 24px;
          z-index: 2;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }
        .hotspot-marker.active .hotspot-icon {
          filter: drop-shadow(0 0 8px rgba(255, 87, 34, 0.8));
        }
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.5;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }
        .leaflet-popup-content {
          margin: 12px;
          font-size: 14px;
        }
        .hotspot-popup-content {
          text-align: center;
        }
        .hotspot-popup-name {
          font-weight: 600;
          margin-bottom: 4px;
          color: #333;
        }
        .hotspot-popup-description {
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
        }
        .hotspot-popup-btn {
          background: #ff5722;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          margin-top: 4px;
        }
        .hotspot-popup-btn:hover {
          background: #e64a19;
        }
      `}</style>
      
      <MapContainer
        center={defaultCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <MapView center={center} zoom={mapZoom} />
        
        {/* TileLayer từ OpenStreetMap */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Hiển thị các hotspot */}
        {hotspots.map((hotspot, index) => (
          <Marker
            key={index}
            position={[hotspot.lat, hotspot.lng]}
            icon={createCustomIcon(false)}
            eventHandlers={{
              click: () => {
                if (onHotspotClick) {
                  onHotspotClick(hotspot, index);
                }
              }
            }}
          >
            <Popup>
              <div className="hotspot-popup-content">
                <div className="hotspot-popup-name">{hotspot.name}</div>
                {hotspot.description && (
                  <div className="hotspot-popup-description">{hotspot.description}</div>
                )}
                {(hotspot.image360Url || hotspot.video360Url) && (
                  <button
                    className="hotspot-popup-btn"
                    onClick={() => {
                      if (onHotspotClick) {
                        onHotspotClick(hotspot, index);
                      }
                    }}
                  >
                    🥽 Xem 360°
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapWithHotspots;

