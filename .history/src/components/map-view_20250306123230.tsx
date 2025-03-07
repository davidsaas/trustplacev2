"use client";

import { useEffect, useRef, useState, memo } from "react";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set your Mapbox token
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_API_KEY || '';
if (!MAPBOX_TOKEN) {
  console.error('Mapbox token is missing!');
}
mapboxgl.accessToken = MAPBOX_TOKEN;

interface MapViewProps {
  location: string;
  safetyScore: number;
  coordinates: [number, number]; // [longitude, latitude]
}

// Memo the component to prevent unnecessary re-renders when scrolling
const MapView = memo(({ location, safetyScore, coordinates }: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine the color based on safety score
  const getSafetyColor = (score: number) => {
    if (score >= 80) return "#10b981"; // Emerald-500
    if (score >= 60) return "#f59e0b"; // Amber-500
    return "#f43f5e"; // Rose-500
  };

  useEffect(() => {
    if (!mapContainer.current || mapInitialized) return;

    if (!mapboxgl.accessToken) {
      setError('Mapbox token is missing');
      return;
    }

    try {
      console.log('Initializing map with coordinates:', coordinates);

      // Initialize map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12', // Changed to streets style for better visibility
        center: coordinates,
        zoom: 14,
        interactive: true,
        attributionControl: true,
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

      // Create a popup
      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div style="font-family: system-ui, sans-serif; padding: 8px;">
            <strong style="display: block; margin-bottom: 4px;">${location}</strong>
            <span style="color: ${getSafetyColor(safetyScore)};">
              Safety Score: ${safetyScore}
            </span>
          </div>
        `);

      // Add marker
      marker.current = new mapboxgl.Marker({
        color: getSafetyColor(safetyScore)
      })
        .setLngLat(coordinates)
        .setPopup(popup)
        .addTo(map.current);

      // Wait for map to load before adding layers
      map.current.on('load', () => {
        console.log('Map loaded successfully');
        
        try {
          // Add source for the circle
          map.current?.addSource('safety-radius', {
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

          // Add circle layer
          map.current?.addLayer({
            id: 'safety-radius',
            type: 'circle',
            source: 'safety-radius',
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'],
                10, 20,
                15, 100
              ],
              'circle-color': getSafetyColor(safetyScore),
              'circle-opacity': 0.15,
              'circle-stroke-width': 2,
              'circle-stroke-color': getSafetyColor(safetyScore)
            }
          });

          setMapInitialized(true);
        } catch (err) {
          console.error('Error adding map layers:', err);
          setError('Error adding map layers');
        }
      });

      // Handle map load errors
      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setError('Error loading map');
      });

    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Error initializing map');
    }

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        marker.current = null;
      }
    };
  }, [coordinates, location, safetyScore, mapInitialized]);

  // Add CSS for the map container
  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-blue-100 shadow-inner">
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-red-600 z-10">
          {error}
        </div>
      )}
      <div 
        ref={mapContainer} 
        className="absolute inset-0"
        style={{ visibility: error ? 'hidden' : 'visible' }}
      />
    </div>
  );
});

MapView.displayName = 'MapView';

export default MapView; 