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
  isSaferAlternative?: boolean;
}

interface MapViewProps {
  mainLocation: Location;
  alternativeLocations?: EnhancedLocation[];
  allListings?: Location[];
  onLocationClick?: (url: string) => void;
}

export default function MapView({ mainLocation, alternativeLocations = [], allListings = [], onLocationClick }: MapViewProps) {
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
        style: 'mapbox://styles/mapbox/streets-v12',
        center: mainLocation.coordinates,
        zoom: 12, // Increased zoom level for better visibility
      });
      
      // Add premium controls
      map.current.addControl(new mapboxgl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true
      }), 'bottom-right');

      // Wait for the map to load before adding markers
      map.current.on('load', () => {
        if (!map.current) return;

        // Function to add a location marker with popup for main location and safer alternatives
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

          // Add marker with enhanced styling
          const markerElement = document.createElement('div');
          markerElement.innerHTML = `
            <div style="
              width: ${isMain ? '40px' : '24px'};
              height: ${isMain ? '40px' : '24px'};
              background: ${isMain ? getSafetyColor(location.safetyScore) : `#10b981`};
              border-radius: 50%;
              border: ${isMain ? '4px solid white' : '2px solid rgba(255, 255, 255, 0.9)'};
              box-shadow: ${isMain ? 
                '0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 4px rgba(255, 255, 255, 0.4)' : 
                '0 2px 4px rgba(0, 0, 0, 0.1)'};
              cursor: ${location.url ? 'pointer' : 'default'};
              transition: all 0.2s ease;
              display: flex;
              align-items: center;
              justify-content: center;
              ${isMain ? `
                &::after {
                  content: '';
                  position: absolute;
                  width: 48px;
                  height: 48px;
                  border-radius: 50%;
                  border: 2px solid ${getSafetyColor(location.safetyScore)}40;
                  animation: pulse 2s infinite;
                }
              ` : ''}
            ">
              ${!isMain ? `
                <div style="
                  font-size: 14px;
                  color: white;
                  font-weight: bold;
                  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                ">↗</div>
              ` : ''}
            </div>
            ${isMain ? `
              <style>
                @keyframes pulse {
                  0% {
                    transform: scale(1);
                    opacity: 1;
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

          // Add hover and click effects
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

        // Calculate bounds to fit all markers
        const bounds = new mapboxgl.LngLatBounds();

        // Add markers for all listings first (they'll be at the bottom layer)
        allListings.forEach(listing => {
          // Skip if this is the main listing or a safer alternative
          if (listing.coordinates[0] === mainLocation.coordinates[0] && 
              listing.coordinates[1] === mainLocation.coordinates[1]) return;
          
          if (alternativeLocations.some(alt => 
            alt.coordinates[0] === listing.coordinates[0] && 
            alt.coordinates[1] === listing.coordinates[1])) return;

          // Create marker for regular listing
          const el = document.createElement('div');
          el.innerHTML = `
            <div style="
              width: 16px;
              height: 16px;
              background: ${getSafetyColor(listing.safetyScore)}80;
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              cursor: pointer;
              transition: all 0.2s ease;
            "></div>
          `;

          // Add popup for regular listing
          const popup = new mapboxgl.Popup({
            offset: 25,
            closeButton: false,
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
              ">${listing.location}</strong>
              <div style="
                display: inline-block;
                padding: 4px 8px;
                border-radius: 12px;
                background: ${getSafetyColor(listing.safetyScore)}15;
                color: ${getSafetyColor(listing.safetyScore)};
                font-weight: 600;
                font-size: 12px;
              ">
                Safety Score: ${Math.round(listing.safetyScore)}
              </div>
            </div>
          `);

          new mapboxgl.Marker({
            element: el,
            anchor: 'center'
          })
          .setLngLat(listing.coordinates)
          .setPopup(popup)
          .addTo(map.current!);

          bounds.extend(listing.coordinates);
        });

        // Add safer alternatives (middle layer)
        alternativeLocations.forEach(location => {
          const marker = addLocationMarker(location);
          bounds.extend(location.coordinates);
        });

        // Add main location marker (top layer)
        const mainMarker = addLocationMarker(mainLocation, true);
        bounds.extend(mainLocation.coordinates);

        // Fit bounds with padding
        map.current.fitBounds(bounds, {
          padding: { top: 100, bottom: 100, left: 100, right: 100 },
          maxZoom: 14
        });
      });

    } catch (error) {
      console.error('Error initializing Mapbox map:', error);
    }
    
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mainLocation, alternativeLocations, allListings, onLocationClick]);

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