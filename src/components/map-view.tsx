"use client";

import { useEffect, useRef } from "react";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// This needs to be set before any mapbox functions are called
if (typeof window !== 'undefined') {
  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY || '';
}

interface Location {
  location: string;
  safetyScore: number;
  coordinates: [number, number]; // [longitude, latitude]
  url?: string;
}

interface EnhancedLocation extends Location {
  distanceKm?: number;
  safetyScoreDiff?: number;
  priceMatch?: number;
  typeMatch?: boolean;
}

interface BasicLocation extends Location {
  price?: number;
  image?: string; // Add image property for hover card
}

interface MapViewProps {
  mainLocation: Location;
  alternativeLocations?: EnhancedLocation[];
  allListings?: BasicLocation[];
  onLocationClick?: (url: string) => void;
}

export default function MapView({ mainLocation, alternativeLocations = [], allListings = [], onLocationClick }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  
  // Determine the color based on safety score
  const getSafetyColor = (score: number) => {
    if (score >= 80) return "#22c55e"; // Green-500 (matching overview)
    if (score >= 60) return "#3b82f6"; // Blue-500 (matching overview)
    if (score >= 40) return "#eab308"; // Yellow-500 (matching overview)
    return "#ef4444"; // Red-500 (matching overview)
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
        style: 'mapbox://styles/mapbox/streets-v12',
        center: mainLocation.coordinates,
        zoom: 9,
      });
      
      // Add premium controls
      map.current.addControl(new mapboxgl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true
      }), 'bottom-right');

      // Function to add a basic listing marker
      const addBasicMarker = (location: BasicLocation) => {
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
              background: rgba(255, 255, 255, 0.98);
              backdrop-filter: blur(8px);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
              border: 1px solid rgba(0, 0, 0, 0.05);
            ">
              ${location.image ? `
                <div style="
                  width: 100%;
                  height: 140px;
                  border-radius: 6px;
                  overflow: hidden;
                  margin-bottom: 12px;
                ">
                  <img 
                    src="${location.image}" 
                    alt="${location.location}"
                    style="
                      width: 100%;
                      height: 100%;
                      object-fit: cover;
                    "
                  />
                </div>
              ` : ''}
              
              <strong style="
                display: block;
                margin-bottom: 8px;
                font-size: 14px;
                color: #1f2937;
              ">${location.location}</strong>
              
              <div style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
              ">
                <div style="
                  display: flex;
                  align-items: center;
                  gap: 8px;
                ">
                  <div style="
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: ${getSafetyColor(location.safetyScore)}15;
                    color: ${getSafetyColor(location.safetyScore)};
                    font-weight: 600;
                    font-size: 13px;
                  ">
                    ${location.safetyScore}
                  </div>
                  <div style="
                    font-size: 13px;
                    color: ${getSafetyColor(location.safetyScore)};
                    font-weight: 500;
                  ">
                    Safety Score
                  </div>
                </div>
                
                ${location.price ? `
                  <div style="
                    font-size: 14px;
                    font-weight: 600;
                    color: #1f2937;
                  ">
                    $${location.price}
                    <span style="
                      font-size: 12px;
                      font-weight: 400;
                      color: #6b7280;
                    ">/night</span>
                  </div>
                ` : ''}
              </div>

              ${location.url ? `
                <button style="
                  width: 100%;
                  padding: 8px;
                  background: #f3f4f6;
                  border: none;
                  border-radius: 6px;
                  color: #2563eb;
                  font-size: 13px;
                  font-weight: 500;
                  cursor: pointer;
                  transition: all 0.2s;
                  text-align: center;
                  margin-top: 4px;
                ">View details →</button>
              ` : ''}
            </div>
          `);

        const markerElement = document.createElement('div');
        markerElement.innerHTML = `
          <div class="marker-container" style="
            position: relative;
            width: 24px;
            height: 24px;
            cursor: ${location.url ? 'pointer' : 'default'};
          ">
            <div class="marker-score" style="
              position: absolute;
              inset: 0;
              border-radius: 50%;
              background: ${getSafetyColor(location.safetyScore)};
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              font-weight: 600;
              font-family: system-ui, sans-serif;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
              transition: all 0.2s ease;
            ">
              ${Math.round(location.safetyScore)}
            </div>
          </div>
        `;

        const marker = new mapboxgl.Marker({
          element: markerElement,
          anchor: 'center'
        })
          .setLngLat(location.coordinates)
          .setPopup(popup)
          .addTo(map.current!);

        if (location.url && onLocationClick) {
          const markerDiv = markerElement.querySelector('.marker-container') as HTMLDivElement | null;
          const scoreDiv = markerElement.querySelector('.marker-score') as HTMLDivElement | null;
          
          if (markerDiv && scoreDiv) {
            markerDiv.addEventListener('mouseenter', () => {
              scoreDiv.style.transform = 'scale(1.15)';
              scoreDiv.style.opacity = '0.9';
              if (map.current) {
                const popup = marker.getPopup();
                if (popup) {
                  popup.addTo(map.current);
                }
              }
            });
            
            markerDiv.addEventListener('mouseleave', () => {
              scoreDiv.style.transform = 'scale(1)';
              scoreDiv.style.opacity = '1';
              const popup = marker.getPopup();
              if (popup) {
                popup.remove();
              }
            });
            
            markerDiv.addEventListener('click', () => {
              onLocationClick(location.url!);
            });
          }
        }

        return marker;
      };

      // Function to add enhanced location markers (main location and alternatives)
      const addLocationMarker = (location: Location | EnhancedLocation, isMain: boolean = false) => {
        // Create a safer alternative label if it's not the main location
        if (!isMain) {
          const el = document.createElement('div');
          el.className = 'safer-alternative-label';
          el.innerHTML = `
            <div style="
              background-color: #10b981;
              color: white;
              padding: 6px 12px;
              text-transform: uppercase;
              border-radius: 20px;
              font-size: 10px;
              font-weight: 600;
              white-space: nowrap;
              transform: translateY(-20px);
              text-align: center;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              backdrop-filter: blur(4px);
              border: 1px solid rgba(255, 255, 255, 0.2);
            ">
              Safer Alternative
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
              
              <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;">
                ${!isMain && 'safetyScoreDiff' in location && location.safetyScoreDiff ? `
                  <div style="
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 12px;
                    background: #dcfce7;
                    color: #15803d;
                    font-weight: 600;
                    font-size: 12px;
                  ">
                    +${location.safetyScoreDiff.toFixed(0)} Safety Score
                  </div>
                ` : ''}
                
                ${!isMain && 'distanceKm' in location && location.distanceKm ? `
                  <div style="
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 12px;
                    background: #dbeafe;
                    color: #1d4ed8;
                    font-weight: 600;
                    font-size: 12px;
                  ">
                    ${location.distanceKm}km away
                  </div>
                ` : ''}
                
                ${!isMain && 'priceMatch' in location && location.priceMatch ? `
                  <div style="
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 12px;
                    background: ${location.priceMatch >= 90 ? '#dbeafe' : '#fef9c3'};
                    color: ${location.priceMatch >= 90 ? '#1d4ed8' : '#a16207'};
                    font-weight: 600;
                    font-size: 12px;
                  ">
                    ${location.priceMatch}% Price Match
                  </div>
                ` : ''}
                
                ${!isMain && 'typeMatch' in location && location.typeMatch ? `
                  <div style="
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 12px;
                    background: #f3e8ff;
                    color: #7e22ce;
                    font-weight: 600;
                    font-size: 12px;
                  ">
                    Similar Type
                  </div>
                ` : ''}
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

        const markerElement = document.createElement('div');
        markerElement.innerHTML = `
          <div style="
            width: ${isMain ? '40px' : '24px'};
            height: ${isMain ? '40px' : '24px'};
            background: ${isMain ? getSafetyColor(location.safetyScore) : getSafetyColor(location.safetyScore)};
            border-radius: 50%;
            border: ${isMain ? '3px solid white' : '2px solid white'};
            box-shadow: ${isMain ? 
              '0 4px 12px rgba(0, 0, 0, 0.2)' : 
              '0 2px 4px rgba(0, 0, 0, 0.15)'};
            cursor: ${location.url ? 'pointer' : 'default'};
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: ${isMain ? '16px' : '11px'};
            font-weight: 600;
            font-family: system-ui, sans-serif;
            ${isMain ? `
              position: relative;
              &::after {
                content: '';
                position: absolute;
                width: 48px;
                height: 48px;
                border-radius: 50%;
                border: 2px solid ${getSafetyColor(location.safetyScore)};
                animation: pulse 2s infinite;
              }
            ` : ''}
          ">
            ${Math.round(location.safetyScore)}
          </div>
          ${isMain ? `
            <style>
              @keyframes pulse {
                0% {
                  transform: scale(1);
                  opacity: 0.6;
                }
                100% {
                  transform: scale(1.5);
                  opacity: 0;
                }
              }
            </style>
          ` : ''}
        `;

        const marker = new mapboxgl.Marker({
          element: markerElement,
          anchor: 'center'
        })
          .setLngLat(location.coordinates)
          .setPopup(popup)
          .addTo(map.current!);

        if (location.url && onLocationClick) {
          const markerDiv = markerElement.querySelector('div');
          if (markerDiv) {
            markerElement.addEventListener('mouseenter', () => {
              markerDiv.style.transform = 'scale(1.1)';
              if (!isMain) {
                markerDiv.style.background = getSafetyColor(location.safetyScore);
              }
            });
            markerElement.addEventListener('mouseleave', () => {
              markerDiv.style.transform = 'scale(1)';
              if (!isMain) {
                markerDiv.style.background = `${getSafetyColor(location.safetyScore)}CC`;
              }
            });
            markerElement.addEventListener('click', () => {
              onLocationClick(location.url!);
            });
          }
        }

        return marker;
      };

      // Wait for the map to load before adding markers
      map.current.on('load', () => {
        if (!map.current) return;

        // Add 3D building layer
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

        // Add all basic listings first (bottom layer)
        allListings.forEach(location => {
          addBasicMarker(location);
        });

        // Add alternative locations (middle layer)
        alternativeLocations.forEach(location => {
          addLocationMarker(location);
        });

        // Add main location marker (top layer)
        addLocationMarker(mainLocation, true);

        // Calculate bounds to fit all markers
        const bounds = new mapboxgl.LngLatBounds();
        
        // Add main location to bounds
        bounds.extend(mainLocation.coordinates);
        
        // Add alternative locations to bounds
        alternativeLocations.forEach(location => {
          bounds.extend(location.coordinates);
        });
        
        // Add all listings to bounds
        allListings.forEach(location => {
          bounds.extend(location.coordinates);
        });
        
        // Fit bounds with padding
        map.current.fitBounds(bounds, {
          padding: { top: 100, bottom: 100, left: 100, right: 100 },
          maxZoom: 14,
          duration: 2000,
          essential: true
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
  }, [mainLocation, alternativeLocations, allListings, onLocationClick]); // Dependencies

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