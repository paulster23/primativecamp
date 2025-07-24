import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
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

    // Add hover interaction
    initialMap.on('pointermove', (event) => {
      const feature = initialMap.forEachFeatureAtPixel(event.pixel, (feature) => feature);
      
      if (feature) {
        const campsite = feature.get('campsite') as Campsite;
        if (campsite && tooltipRef.current) {
          tooltipRef.current.innerHTML = `
            <div style="
              background: white;
              border: 1px solid #ccc;
              border-radius: 4px;
              padding: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              max-width: 600px;
              font-size: 12px;
            ">
              <strong>${campsite.name}</strong><br/>
              <em>${campsite.stateLand}</em><br/>
              📍 ${campsite.address}<br/>
              🏘️ ${campsite.town}, ${campsite.county}<br/>
              📍 ${campsite.latitude.toFixed(6)}, ${campsite.longitude.toFixed(6)}
              ${campsite.notes ? `<br/><small>ℹ️ ${campsite.notes}</small>` : ''}
            </div>
          `;
          tooltipOverlay.setPosition(event.coordinate);
          tooltipRef.current.style.display = 'block';
        }
      } else {
        if (tooltipRef.current) {
          tooltipRef.current.style.display = 'none';
        }
      }
    });

    return () => {
      initialMap.setTarget(undefined);
      mapInstanceRef.current = null;
      campsiteVectorSourceRef.current = null;
      locationVectorSourceRef.current = null;
    };
  }, [campsites]);
  
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
      <div 
        ref={tooltipRef} 
        style={{ 
          position: 'absolute',
          display: 'none',
          pointerEvents: 'none',
          zIndex: 1000
        }} 
      />
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '10px',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        zIndex: 1000
      }}>
        <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>NY State Campsites</h3>
        <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
          {campsites.length} campsites loaded
        </p>
      </div>
    </div>
  );
});

export default CampsiteMap;