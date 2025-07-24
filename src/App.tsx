import React, { useRef } from 'react';
import CampsiteMap, { MapNavigationMethods } from './components/CampsiteMap';
import LocationSearchBar from './components/LocationSearchBar';
import { LocationResult } from './services/geocodingService';
import './styles/App.css';

function App() {
  const mapRef = useRef<MapNavigationMethods>(null);

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
      
      {/* Search bar overlay */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        width: '90%',
        maxWidth: '400px'
      }}>
        <LocationSearchBar 
          onLocationSelected={handleLocationSelected}
          placeholder="Search cities, towns, zip codes..."
          showPopularLocations={true}
        />
      </div>
      
      {/* Clear search button */}
      <div style={{
        position: 'absolute',
        top: '80px',
        right: '20px',
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
            padding: '8px 12px',
            backgroundColor: 'white',
            border: '2px solid #ddd',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease'
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
