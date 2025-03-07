"use client";

import { useEffect, useRef } from "react";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// This needs to be set before any mapbox functions are called
if (typeof window !== 'undefined') {
  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY || '';
}

interface MapViewProps {
  location: string;
  safetyScore: number;
  coordinates: [number, number]; // [longitude, latitude]
}

export default function MapView({ location, safetyScore, coordinates }: MapViewProps) {
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
    console.log('Initializing Mapbox map with coordinates:', coordinates);
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: coordinates,
        zoom: 14
      });
      
      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
      
      // Create a popup with safety information
      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
        .setHTML(`
          <div style="font-family: system-ui, sans-serif; padding: 8px;">
            <strong style="display: block; margin-bottom: 4px;">${location}</strong>
            <span style="color: ${getSafetyColor(safetyScore)};">
              Safety Score: ${safetyScore}
            </span>
          </div>
        `);
      
      // Add marker
      new mapboxgl.Marker({
        color: getSafetyColor(safetyScore)
      })
        .setLngLat(coordinates)
        .setPopup(popup)
        .addTo(map.current);
      
      // Once the map is loaded, add the safety radius
      map.current.on('load', () => {
        if (!map.current) return;
        
        map.current.addSource('safety-radius', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: coordinates
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
            'circle-color': getSafetyColor(safetyScore),
            'circle-opacity': 0.15,
            'circle-stroke-width': 2,
            'circle-stroke-color': getSafetyColor(safetyScore)
          }
        });
        
        // Resize the map to ensure it renders correctly
        map.current.resize();
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
  }, [coordinates, location, safetyScore]); // Dependencies

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-blue-100 shadow-md" style={{ height: '100%', minHeight: '300px' }}>
      <div 
        ref={mapContainer} 
        className="w-full h-full"
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
      />
    </div>
  );
} 