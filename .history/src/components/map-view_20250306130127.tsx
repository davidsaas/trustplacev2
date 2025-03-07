"use client";

import { useEffect, useRef } from "react";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// This needs to be set before any mapbox functions are called
if (typeof window !== 'undefined') {
  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY || '';
}

interface MapViewProps {
  mainLocation: {
    location: string;
    safetyScore: number;
    coordinates: [number, number]; // [longitude, latitude]
    url?: string;
  };
  alternativeLocations?: {
    location: string;
    safetyScore: number;
    coordinates: [number, number];
    url: string;
  }[];
  onLocationClick?: (url: string) => void;
}

export default function MapView({ mainLocation, alternativeLocations = [], onLocationClick }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  
  // Determine the color based on safety score
  const getSafetyColor = (score: number) => {
    if (score >= 80) return "#10b981"; // Emerald-500
    if (score >= 60) return "#f59e0b"; // Amber-500
    return "#f43f5e"; // Rose-500
  };

  useEffect(() => {
    // Verify we're in browser and have the container and token
    if (typeof window === 'undefined' || !mapContainer.current || !mapboxgl.accessToken) return;
    
    // Only initialize the map once
    if (map.current) return;
    
    // Initialize map
    console.log('Initializing Mapbox map with main coordinates:', mainLocation.coordinates);
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12', // More detailed, premium style
        center: mainLocation.coordinates,
        zoom: 9,
      });
      
      // Add premium controls
      map.current.addControl(new mapboxgl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true
      }), 'bottom-right');
      
      // Function to add a location marker with popup
      const addLocationMarker = (location: { location: string; safetyScore: number; coordinates: [number, number]; url?: string }, isMain: boolean = false) => {
        // Create a safer alternative label if it's not the main location
        if (!isMain) {
          const el = document.createElement('div');
          el.className = 'safer-alternative-label';
          el.innerHTML = `
            <div style="
              background-color: rgba(16, 185, 129, 0.95);
              color: white;
              padding: 6px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              white-space: nowrap;
              transform: translateY(-40px);
              text-align: center;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              backdrop-filter: blur(4px);
              border: 1px solid rgba(255, 255, 255, 0.2);
            ">
              ✨ Safer Alternative
            </div>
          `;
          new mapboxgl.Marker({
            element: el,
            anchor: 'bottom',
          })
            .setLngLat(location.coordinates)
            .addTo(map.current!);
        }

        const popup = new mapboxgl.Popup({ 
          offset: 25, 
          closeButton: false,
          className: 'custom-popup',
          maxWidth: '300px'
        })
          .setHTML(`
            <div style="
              font-family: system-ui, sans-serif;
              padding: 12px;
              border-radius: 8px;
              background: rgba(255, 255, 255, 0.95);
              backdrop-filter: blur(8px);
            ">
              <strong style="
                display: block;
                margin-bottom: 8px;
                font-size: 14px;
                color: #1f2937;
              ">${location.location}</strong>
              <div style="
                display: inline-block;
                padding: 4px 8px;
                border-radius: 12px;
                background: ${getSafetyColor(location.safetyScore)}15;
                color: ${getSafetyColor(location.safetyScore)};
                font-weight: 600;
                font-size: 13px;
                margin-bottom: 6px;
              ">
                Safety Score: ${location.safetyScore}
              </div>
              ${location.url ? `
                <div style="
                  margin-top: 8px;
                  font-size: 13px;
                  color: #2563eb;
                  cursor: pointer;
                  font-weight: 500;
                ">View details →</div>
              ` : ''}
            </div>
          `);

        // Add marker with enhanced styling
        const markerElement = document.createElement('div');
        markerElement.innerHTML = `
          <div style="
            width: ${isMain ? '32px' : '24px'};
            height: ${isMain ? '32px' : '24px'};
            background: ${getSafetyColor(location.safetyScore)};
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            cursor: ${location.url ? 'pointer' : 'default'};
            transition: all 0.2s ease;
          "></div>
        `;

        const marker = new mapboxgl.Marker({
          element: markerElement,
          anchor: 'center'
        })
          .setLngLat(location.coordinates)
          .setPopup(popup)
          .addTo(map.current!);

        // Add hover and click effects
        if (location.url && onLocationClick) {
          markerElement.addEventListener('mouseenter', () => {
            markerElement.style.transform = 'scale(1.1)';
          });
          markerElement.addEventListener('mouseleave', () => {
            markerElement.style.transform = 'scale(1)';
          });
          markerElement.addEventListener('click', () => {
            onLocationClick(location.url!);
          });
        }

        return marker;
      };
      
      // Wait for the map to load before adding markers and fitting bounds
      map.current.on('load', () => {
        if (!map.current) return;

        // Add 3D building layer for more premium feel
        map.current.addLayer({
          'id': '3d-buildings',
          'source': 'composite',
          'source-layer': 'building',
          'filter': ['==', 'extrude', 'true'],
          'type': 'fill-extrusion',
          'minzoom': 12,
          'paint': {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height'],
            'fill-extrusion-opacity': 0.4
          }
        });

        // Add main location marker
        addLocationMarker(mainLocation, true);
        
        // Add alternative location markers
        alternativeLocations.forEach(location => {
          addLocationMarker(location);
        });
        
        // Calculate bounds to fit all markers
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend(mainLocation.coordinates);
        alternativeLocations.forEach(location => {
          bounds.extend(location.coordinates);
        });
        
        // Fit bounds with smooth animation
        map.current.fitBounds(bounds, {
          padding: { top: 100, bottom: 100, left: 100, right: 100 },
          maxZoom: 14,
          duration: 2000,
          essential: true
        });

        // Add the safety radius with enhanced styling
        map.current.addSource('safety-radius', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: mainLocation.coordinates
            },
            properties: {}
          }
        });
        
        map.current.addLayer({
          id: 'safety-radius',
          type: 'circle',
          source: 'safety-radius',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'],
              10, 30,
              15, 300
            ],
            'circle-color': getSafetyColor(mainLocation.safetyScore),
            'circle-opacity': 0.08,
            'circle-stroke-width': 3,
            'circle-stroke-color': getSafetyColor(mainLocation.safetyScore),
            'circle-stroke-opacity': 0.3,
            'circle-blur': 0.4
          }
        });

        // Add a second inner radius for more depth
        map.current.addLayer({
          id: 'safety-radius-inner',
          type: 'circle',
          source: 'safety-radius',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'],
              10, 15,
              15, 150
            ],
            'circle-color': getSafetyColor(mainLocation.safetyScore),
            'circle-opacity': 0.12,
            'circle-stroke-width': 2,
            'circle-stroke-color': getSafetyColor(mainLocation.safetyScore),
            'circle-stroke-opacity': 0.4
          }
        });
      });
    } catch (error) {
      console.error('Error initializing Mapbox map:', error);
    }
    
    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mainLocation, alternativeLocations, onLocationClick]); // Dependencies

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-blue-100 shadow-inner">
      <div 
        ref={mapContainer} 
        className="absolute inset-0" 
        style={{ minHeight: '100%' }}
      />
    </div>
  );
} 