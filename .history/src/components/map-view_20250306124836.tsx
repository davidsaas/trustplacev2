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
  };
  alternativeLocations?: {
    location: string;
    safetyScore: number;
    coordinates: [number, number];
  }[];
}

export default function MapView({ mainLocation, alternativeLocations = [] }: MapViewProps) {
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
        style: 'mapbox://styles/mapbox/light-v11',
        center: mainLocation.coordinates,
        zoom: 12
      });
      
      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
      
      // Function to add a location marker with popup
      const addLocationMarker = (location: { location: string; safetyScore: number; coordinates: [number, number] }, isMain: boolean = false) => {
        const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
          .setHTML(`
            <div style="font-family: system-ui, sans-serif; padding: 8px;">
              <strong style="display: block; margin-bottom: 4px;">${location.location}</strong>
              <span style="color: ${getSafetyColor(location.safetyScore)};">
                Safety Score: ${location.safetyScore}
              </span>
            </div>
          `);
        
        // Add marker
        new mapboxgl.Marker({
          color: getSafetyColor(location.safetyScore),
          scale: isMain ? 1.2 : 1 // Make main location marker slightly larger
        })
          .setLngLat(location.coordinates)
          .setPopup(popup)
          .addTo(map.current!);
      };
      
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
      
      // Fit map to bounds with padding
      map.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 }
      });
      
      // Once the map is loaded, add the safety radius for the main location
      map.current.on('load', () => {
        if (!map.current) return;
        
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
              10, 20,
              15, 200
            ],
            'circle-color': getSafetyColor(mainLocation.safetyScore),
            'circle-opacity': 0.15,
            'circle-stroke-width': 2,
            'circle-stroke-color': getSafetyColor(mainLocation.safetyScore)
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
  }, [mainLocation, alternativeLocations]); // Dependencies

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