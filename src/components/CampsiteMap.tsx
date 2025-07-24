import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { Style, Icon, Fill, Stroke, Circle } from 'ol/style';
import Overlay from 'ol/Overlay';
import { Campsite } from '../types/Campsite';
import { useCampsiteData } from '../hooks/useCampsiteData';
import 'ol/ol.css';

export interface MapNavigationMethods {
  navigateToLocation: (lat: number, lng: number, zoom?: number) => void;
  addLocationMarker: (lat: number, lng: number, label?: string) => void;
  clearLocationMarkers: () => void;
  fitToNYState: () => void;
}

interface CampsiteMapProps {}

const CampsiteMap = forwardRef<MapNavigationMethods, CampsiteMapProps>((props, ref) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const campsiteVectorSourceRef = useRef<VectorSource | null>(null);
  const locationVectorSourceRef = useRef<VectorSource | null>(null);
  const { campsites, loading, error } = useCampsiteData();
  
  const [isMobile, setIsMobile] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringTooltipRef = useRef<boolean>(false);
  const currentCampsiteRef = useRef<Campsite | null>(null);
  
  // Detect if user is on mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Create vector source and layer for campsites
    const campsiteVectorSource = new VectorSource();
    campsiteVectorSourceRef.current = campsiteVectorSource;
    
    // Create vector source and layer for location markers
    const locationVectorSource = new VectorSource();
    locationVectorSourceRef.current = locationVectorSource;
    
    // Function to calculate tent icon scale based on zoom level
    const getTentScale = (zoom: number) => {
      // Scale from 0.5 at zoom 6 to 2.0 at zoom 15
      const minZoom = 6;
      const maxZoom = 15;
      const minScale = 0.5;
      const maxScale = 2.0;
      
      const normalizedZoom = Math.max(minZoom, Math.min(maxZoom, zoom));
      const scale = minScale + ((normalizedZoom - minZoom) / (maxZoom - minZoom)) * (maxScale - minScale);
      return scale;
    };

    // Dynamic style function that responds to zoom level
    const getTentStyle = (zoom: number) => {
      return new Style({
        image: new Icon({
          src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3.5 21 14 3l10.5 18H3.5Z"/>
              <path d="M12 13.5 8.5 21"/>
              <path d="M12 13.5 15.5 21"/>
            </svg>
          `),
          scale: getTentScale(zoom),
          color: '#2563eb'
        })
      });
    };

    const campsiteLayer: VectorLayer<VectorSource> = new VectorLayer({
      source: campsiteVectorSource,
      style: () => {
        // Default style - will be updated by zoom change listener
        return getTentStyle(8);
      }
    });
    
    // Style for location markers
    const getLocationMarkerStyle = () => {
      return new Style({
        image: new Circle({
          radius: 8,
          fill: new Fill({ color: '#ff4444' }),
          stroke: new Stroke({ color: '#ffffff', width: 2 })
        })
      });
    };
    
    const locationLayer: VectorLayer<VectorSource> = new VectorLayer({
      source: locationVectorSource,
      style: getLocationMarkerStyle
    });

    // Create tooltip overlay
    const tooltipOverlay = new Overlay({
      element: tooltipRef.current!,
      offset: [10, 0],
      positioning: 'bottom-left'
    });

    // Initialize map
    const initialMap = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        campsiteLayer,
        locationLayer
      ],
      view: new View({
        center: fromLonLat([-75.0, 44.0]), // Center on New York State
        zoom: 8
      }),
      overlays: [tooltipOverlay]
    });
    
    mapInstanceRef.current = initialMap;


    // Add campsite data when available
    if (campsites.length > 0) {
      // Clear existing features
      campsiteVectorSource.clear();
      
      // Add features for each campsite
      campsites.forEach(campsite => {
        if (campsite.latitude && campsite.longitude) {
          const feature = new Feature({
            geometry: new Point(fromLonLat([campsite.longitude, campsite.latitude])),
            campsite: campsite
          });
          campsiteVectorSource.addFeature(feature);
        }
      });

      // Fit view to show all campsites
      const extent = campsiteVectorSource.getExtent();
      initialMap.getView().fit(extent, { padding: [50, 50, 50, 50] });
    }

    // Add zoom change listener to update icon sizes
    initialMap.getView().on('change:resolution', () => {
      const currentZoom = initialMap.getView().getZoom() || 8;
      campsiteLayer.setStyle(() => getTentStyle(currentZoom));
    });

    // Clear any existing hide timeout
    const clearHideTimeout = () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
    
    // Hide tooltip immediately (no delay)
    const hideTooltip = () => {
      clearHideTimeout();
      if (tooltipRef.current) {
        tooltipRef.current.style.display = 'none';
        tooltipRef.current.style.pointerEvents = 'none';
      }
      currentCampsiteRef.current = null; // Clear current campsite
    };
    
    // Schedule tooltip to hide with minimal delay for smooth transitions
    const scheduleHide = () => {
      clearHideTimeout();
      hideTimeoutRef.current = setTimeout(() => {
        // Only hide if not hovering over tooltip
        if (!isHoveringTooltipRef.current) {
          hideTooltip();
        }
      }, 50); // Very small delay for smooth mouse movement
    };
    
    // Show tooltip for campsite
    const showTooltip = (campsite: Campsite, coordinate: any) => {
      if (tooltipRef.current) {
        clearHideTimeout();
        
        // Only update position if this is a different campsite or tooltip is not visible
        const isDifferentCampsite = !currentCampsiteRef.current || 
          currentCampsiteRef.current.name !== campsite.name ||
          currentCampsiteRef.current.latitude !== campsite.latitude ||
          currentCampsiteRef.current.longitude !== campsite.longitude;
        
        const isTooltipVisible = tooltipRef.current.style.display === 'block';
        
        if (isDifferentCampsite || !isTooltipVisible) {
          currentCampsiteRef.current = campsite; // Set current campsite
          
          tooltipRef.current.innerHTML = `
          <div style="
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
            max-width: 400px;
            min-width: 300px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.5;
          ">
            <div style="
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 16px;
              padding-bottom: 12px;
              border-bottom: 1px solid #f1f5f9;
            ">
              <div style="
                background: #10b981;
                border-radius: 8px;
                padding: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3.5 21 14 3l10.5 18H3.5Z"/>
                  <path d="M12 13.5 8.5 21"/>
                  <path d="M12 13.5 15.5 21"/>
                </svg>
              </div>
              <div>
                <h3 style="
                  margin: 0;
                  font-size: 18px;
                  font-weight: 600;
                  color: #111827;
                  font-family: 'Poppins', sans-serif;
                ">${campsite.name}</h3>
                <p style="
                  margin: 2px 0 0 0;
                  font-size: 14px;
                  color: #6b7280;
                  font-weight: 500;
                ">${campsite.stateLand}</p>
              </div>
            </div>
            
            <div style="margin-bottom: 16px;">
              <div style="
                display: flex;
                align-items: flex-start;
                gap: 10px;
                margin-bottom: 12px;
              ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px; flex-shrink: 0;">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <div>
                  <div style="font-weight: 600; color: #374151; margin-bottom: 2px;">Address</div>
                  <div style="color: #6b7280;">${campsite.address}</div>
                </div>
              </div>
              
              <div style="
                display: flex;
                align-items: flex-start;
                gap: 10px;
                margin-bottom: 12px;
              ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px; flex-shrink: 0;">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10 9 9s9-4.03 9-9V7z"/>
                </svg>
                <div>
                  <div style="font-weight: 600; color: #374151; margin-bottom: 2px;">Location</div>
                  <div style="color: #6b7280;">${campsite.town}, ${campsite.county}</div>
                </div>
              </div>
              
              <div style="
                display: flex;
                align-items: flex-start;
                gap: 10px;
                margin-bottom: ${campsite.notes ? '12px' : '0'};
              ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px; flex-shrink: 0;">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                <div>
                  <div style="font-weight: 600; color: #374151; margin-bottom: 2px;">Coordinates</div>
                  <div style="color: #6b7280; font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace; font-size: 13px;">${campsite.latitude.toFixed(6)}, ${campsite.longitude.toFixed(6)}</div>
                </div>
              </div>
              
              ${campsite.notes ? `
                <div style="
                  background: #fef3c7;
                  border: 1px solid #fbbf24;
                  border-radius: 8px;
                  padding: 12px;
                  margin-top: 12px;
                ">
                  <div style="
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 6px;
                  ">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="16" x2="12" y2="12"/>
                      <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    <span style="font-weight: 600; color: #92400e; font-size: 13px;">Important Information</span>
                  </div>
                  <div style="color: #a16207; font-size: 13px; line-height: 1.4;">${campsite.notes}</div>
                </div>
              ` : ''}
            </div>
            
            <a 
              href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${campsite.name}, ${campsite.address}, ${campsite.town}, NY`)}"
              target="_blank"
              rel="noopener noreferrer"
              style="
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                width: 100%;
                padding: 12px 16px;
                background: #4285f4;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                font-family: 'Inter', sans-serif;
                text-decoration: none;
                box-sizing: border-box;
              "
              onmouseover="this.style.background='#3367d6'; this.style.transform='translateY(-1px)';"
              onmouseout="this.style.background='#4285f4'; this.style.transform='translateY(0)';"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.14 7.5A7.5 7.5 0 0 0 12 0a7.5 7.5 0 0 0-7.14 7.5c0 5.25 7.14 13.5 7.14 13.5S19.14 12.75 19.14 7.5zM12 10.5a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
                <circle cx="12" cy="7.5" r="1.5" fill="white"/>
              </svg>
              Open in Google Maps
            </a>
          </div>
          `;
          
          // Only set position when showing new tooltip
          tooltipOverlay.setPosition(coordinate);
          tooltipRef.current.style.display = 'block';
          tooltipRef.current.style.pointerEvents = 'auto';
          
          // Add event listeners for hover detection
          tooltipRef.current.onmouseenter = (e) => {
            isHoveringTooltipRef.current = true;
            clearHideTimeout(); // Cancel any pending hide
          };
          
          tooltipRef.current.onmouseleave = (e) => {
            isHoveringTooltipRef.current = false;
            scheduleHide(); // Hide after small delay for smooth transitions
          };
        }
      }
    };
    
    // Hover and click interactions for all devices
    initialMap.on('pointermove', (event) => {
      // Don't process map features if mouse is hovering over the tooltip
      if (isHoveringTooltipRef.current) {
        return; // Skip feature detection entirely when hovering over tooltip
      }
      
      const feature = initialMap.forEachFeatureAtPixel(event.pixel, (feature) => feature);
      
      if (feature) {
        const campsite = feature.get('campsite') as Campsite;
        if (campsite && tooltipRef.current) {
          clearHideTimeout(); // Cancel any pending hide immediately
          showTooltip(campsite, event.coordinate);
        }
      } else {
        // Only schedule hide if mouse is not over the tooltip itself
        if (!isHoveringTooltipRef.current) {
          scheduleHide();
        }
      }
    });

    return () => {
      // Clear any pending hide timeout
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      
      // Reset tooltip hover state
      isHoveringTooltipRef.current = false;
      currentCampsiteRef.current = null;
      
      initialMap.setTarget(undefined);
      mapInstanceRef.current = null;
      campsiteVectorSourceRef.current = null;
      locationVectorSourceRef.current = null;
    };
  }, [campsites, isMobile]);
  
  // Expose navigation methods to parent components
  useImperativeHandle(ref, () => ({
    navigateToLocation: (lat: number, lng: number, zoom: number = 12) => {
      if (!mapInstanceRef.current) return;
      
      const view = mapInstanceRef.current.getView();
      const coordinate = fromLonLat([lng, lat]);
      
      // Smooth animation to the location
      view.animate({
        center: coordinate,
        zoom: zoom,
        duration: 1000
      });
    },
    
    addLocationMarker: (lat: number, lng: number, label?: string) => {
      if (!locationVectorSourceRef.current) return;
      
      // Clear existing location markers
      locationVectorSourceRef.current.clear();
      
      // Add new location marker
      const feature = new Feature({
        geometry: new Point(fromLonLat([lng, lat])),
        type: 'location',
        label: label || 'Search Location'
      });
      
      locationVectorSourceRef.current.addFeature(feature);
    },
    
    clearLocationMarkers: () => {
      if (!locationVectorSourceRef.current) return;
      locationVectorSourceRef.current.clear();
    },
    
    fitToNYState: () => {
      if (!mapInstanceRef.current || !campsiteVectorSourceRef.current) return;
      
      const extent = campsiteVectorSourceRef.current.getExtent();
      if (extent && extent.some(val => !isNaN(val))) {
        mapInstanceRef.current.getView().fit(extent, { 
          padding: [50, 50, 50, 50],
          duration: 1000
        });
      } else {
        // Fallback to NY State center
        mapInstanceRef.current.getView().animate({
          center: fromLonLat([-75.0, 44.0]),
          zoom: 8,
          duration: 1000
        });
      }
    }
  }), []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading campsite data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Error: {error}</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      
      {/* Tooltip for all devices */}
      <div 
        ref={tooltipRef} 
        style={{ 
          position: 'absolute',
          display: 'none', // Will be shown by hover events
          pointerEvents: 'none',
          zIndex: 1000
        }} 
      />
      
      {/* Info panel - responsive */}
      <div style={{
        position: 'absolute',
        top: isMobile ? '8px' : '10px',
        left: isMobile ? '8px' : '10px',
        background: 'rgba(255, 255, 255, 0.95)',
        padding: isMobile ? '8px 12px' : '10px',
        borderRadius: isMobile ? '8px' : '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 1000,
        maxWidth: isMobile ? 'calc(100vw - 16px)' : 'auto'
      }}>
        <h3 style={{ 
          margin: '0 0 4px 0', 
          fontSize: isMobile ? '14px' : '16px',
          fontWeight: '600'
        }}>
          NY State Campsites
        </h3>
        <p style={{ 
          margin: 0, 
          fontSize: isMobile ? '11px' : '12px', 
          color: '#666' 
        }}>
          {campsites.length} campsites loaded
        </p>
        <p style={{ 
          margin: '4px 0 0 0', 
          fontSize: isMobile ? '10px' : '11px', 
          color: '#888',
          fontStyle: 'italic'
        }}>
          {isMobile ? 'Tap' : 'Hover over'} campsites for details
        </p>
      </div>
      
    </div>
  );
});

export default CampsiteMap;