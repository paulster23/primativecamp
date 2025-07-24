import React from 'react';
import { Campsite } from '../types/Campsite';

interface CampsiteModalProps {
  campsite: Campsite | null;
  isVisible: boolean;
  onClose: () => void;
}

const CampsiteModal: React.FC<CampsiteModalProps> = ({ campsite, isVisible, onClose }) => {
  if (!isVisible || !campsite) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0',
        // Animate in from bottom on mobile
        animation: isVisible ? 'slideUp 0.3s ease-out' : 'slideDown 0.3s ease-in'
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px 16px 0 0',
          padding: '20px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '70vh',
          overflowY: 'auto',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
          position: 'relative',
          // Mobile-first responsive design
          margin: '0',
          '@media (min-width: 768px)': {
            borderRadius: '12px',
            margin: '20px',
            alignSelf: 'center',
            maxHeight: '80vh'
          }
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#666',
            padding: '8px',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f0f0f0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          ×
        </button>

        {/* Drag handle for mobile */}
        <div
          style={{
            width: '40px',
            height: '4px',
            backgroundColor: '#ddd',
            borderRadius: '2px',
            margin: '0 auto 16px auto'
          }}
        />

        {/* Campsite details */}
        <div style={{ paddingRight: '40px' }}>
          <h2 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '20px', 
            fontWeight: '600',
            color: '#333',
            lineHeight: '1.3'
          }}>
            ⛺ {campsite.name}
          </h2>

          <div style={{ 
            fontSize: '16px', 
            color: '#666', 
            marginBottom: '16px',
            fontStyle: 'italic'
          }}>
            🌲 {campsite.stateLand}
          </div>

          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px',
            fontSize: '15px',
            lineHeight: '1.4'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ fontSize: '16px', minWidth: '20px' }}>📍</span>
              <div>
                <div style={{ fontWeight: '500', color: '#333' }}>Address</div>
                <div style={{ color: '#666' }}>{campsite.address}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ fontSize: '16px', minWidth: '20px' }}>🏘️</span>
              <div>
                <div style={{ fontWeight: '500', color: '#333' }}>Location</div>
                <div style={{ color: '#666' }}>{campsite.town}, {campsite.county}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ fontSize: '16px', minWidth: '20px' }}>🗺️</span>
              <div>
                <div style={{ fontWeight: '500', color: '#333' }}>Coordinates</div>
                <div style={{ color: '#666', fontFamily: 'monospace', fontSize: '14px' }}>
                  {campsite.latitude.toFixed(6)}, {campsite.longitude.toFixed(6)}
                </div>
              </div>
            </div>

            {campsite.notes && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '16px', minWidth: '20px' }}>ℹ️</span>
                <div>
                  <div style={{ fontWeight: '500', color: '#333' }}>Notes</div>
                  <div style={{ 
                    color: '#666', 
                    fontSize: '14px',
                    lineHeight: '1.5',
                    backgroundColor: '#f8f9fa',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    marginTop: '4px'
                  }}>
                    {campsite.notes}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            marginTop: '24px',
            flexWrap: 'wrap'
          }}>
            <button
              style={{
                padding: '12px 20px',
                backgroundColor: '#4285f4',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '500',
                cursor: 'pointer',
                flex: '1',
                minWidth: '120px',
                transition: 'background-color 0.2s ease'
              }}
              onClick={() => {
                const googleMapsUrl = `https://www.google.com/maps?q=${campsite.latitude},${campsite.longitude}`;
                window.open(googleMapsUrl, '_blank');
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#3367d6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#4285f4';
              }}
            >
              🧭 Directions
            </button>

            <button
              style={{
                padding: '12px 20px',
                backgroundColor: '#f8f9fa',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '500',
                cursor: 'pointer',
                flex: '1',
                minWidth: '120px',
                transition: 'background-color 0.2s ease'
              }}
              onClick={() => {
                const shareText = `${campsite.name} - ${campsite.stateLand}\n${campsite.address}\n${campsite.town}, ${campsite.county}`;
                if (navigator.share) {
                  navigator.share({
                    title: campsite.name,
                    text: shareText,
                    url: window.location.href
                  });
                } else {
                  // Fallback to copy to clipboard
                  navigator.clipboard.writeText(shareText);
                  alert('Campsite details copied to clipboard!');
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e9ecef';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
              }}
            >
              📤 Share
            </button>
          </div>
        </div>

        <style>{`
          @keyframes slideUp {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          @keyframes slideDown {
            from {
              transform: translateY(0);
              opacity: 1;
            }
            to {
              transform: translateY(100%);
              opacity: 0;
            }
          }

          @media (min-width: 768px) {
            @keyframes slideUp {
              from {
                transform: scale(0.9) translateY(20px);
                opacity: 0;
              }
              to {
                transform: scale(1) translateY(0);
                opacity: 1;
              }
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default CampsiteModal;