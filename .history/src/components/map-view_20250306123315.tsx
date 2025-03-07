"use client";

import { useEffect, useRef, useState, memo } from "react";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set your Mapbox token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY || '';

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

  // Determine the color based on safety score
  const getSafetyColor = (score: number) => {
    if (score >= 80) return "#10b981"; // Emerald-500
    if (score >= 60) return "#f59e0b"; // Amber-500
    return "#f43f5e"; // Rose-500
  };

  useEffect(() => {
    if (!mapContainer.current || mapInitialized || !mapboxgl.accessToken) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: coordinates,
      zoom: 14,
      interactive: true,
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

    // Add circle layer for safety radius
    map.current.on('load', () => {
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
    });

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        marker.current = null;
      }
    };
  }, [coordinates, location, safetyScore, mapInitialized]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-blue-100 shadow-inner">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
});

export default MapView; 