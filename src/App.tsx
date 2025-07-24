import React, { useRef, useState, useEffect } from 'react';
import CampsiteMap, { MapNavigationMethods } from './components/CampsiteMap';
import LocationSearchBar from './components/LocationSearchBar';
import { LocationResult } from './services/geocodingService';
import './styles/App.css';

function App() {
  const mapRef = useRef<MapNavigationMethods>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLocationSelected = (location: LocationResult) => {
    if (mapRef.current) {
      // Navigate to the selected location
      mapRef.current.navigateToLocation(
        location.latitude, 
        location.longitude,
        location.bbox ? 11 : 12 // Use slightly lower zoom for areas with bounding boxes
      );
      
      // Add a marker at the searched location
      mapRef.current.addLocationMarker(
        location.latitude,
        location.longitude,
        location.displayName.split(',')[0]
      );
    }
  };

  return (
    <div className="App" style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <CampsiteMap ref={mapRef} />
      
      {/* Search bar overlay - mobile responsive */}
      <div style={{
        position: 'absolute',
        top: isMobile ? '12px' : '20px',
        left: isMobile ? '8px' : '50%',
        right: isMobile ? '8px' : 'auto',
        transform: isMobile ? 'none' : 'translateX(-50%)',
        zIndex: 1000,
        width: isMobile ? 'auto' : '90%',
        maxWidth: isMobile ? 'none' : '400px'
      }}>
        <LocationSearchBar 
          onLocationSelected={handleLocationSelected}
          placeholder="Search cities, towns, zip codes..."
          showPopularLocations={true}
        />
      </div>
      
      {/* Clear search button - mobile responsive */}
      <div style={{
        position: 'absolute',
        top: isMobile ? '72px' : '80px',
        right: isMobile ? '8px' : '20px',
        zIndex: 1000
      }}>
        <button
          onClick={() => {
            if (mapRef.current) {
              mapRef.current.clearLocationMarkers();
              mapRef.current.fitToNYState();
            }
          }}
          style={{
            padding: isMobile ? '12px 16px' : '8px 12px',
            backgroundColor: 'white',
            border: '2px solid #ddd',
            borderRadius: isMobile ? '8px' : '6px',
            cursor: 'pointer',
            fontSize: isMobile ? '14px' : '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease',
            minHeight: isMobile ? '44px' : 'auto', // Touch target size
            minWidth: isMobile ? '44px' : 'auto'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f8f9fa';
            e.currentTarget.style.borderColor = '#4285f4';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.borderColor = '#ddd';
          }}
        >
          🏠 Reset View
        </button>
      </div>
    </div>
  );
}

export default App;
