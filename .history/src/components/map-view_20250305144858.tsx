"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapViewProps {
  location: string;
  safetyScore: number;
  coordinates?: [number, number]; // Optional coordinates [longitude, latitude]
}

// Mock coordinates for NYC and LA locations based on neighborhood name
const getNeighborhoodCoordinates = (neighborhood: string): [number, number] => {
  const coordinates: Record<string, [number, number]> = {
    // NYC neighborhoods
    "Manhattan": [-73.9712, 40.7831],
    "Brooklyn": [-73.9442, 40.6782],
    "Queens": [-73.7949, 40.7282],
    "Bronx": [-73.8648, 40.8448],
    "Staten Island": [-74.1502, 40.5795],
    "East Village": [-73.9841, 40.7265],
    "West Village": [-74.0051, 40.7359],
    "SoHo": [-74.0018, 40.7248],
    "Upper East Side": [-73.9595, 40.7735],
    "Upper West Side": [-73.9845, 40.7870],
    
    // LA neighborhoods
    "Hollywood": [-118.3287, 34.0928],
    "Downtown LA": [-118.2437, 34.0407],
    "Santa Monica": [-118.4912, 34.0195],
    "Venice": [-118.4695, 33.9850],
    "Beverly Hills": [-118.4003, 34.0736],
    "Silver Lake": [-118.2710, 34.0870],
    "Echo Park": [-118.2603, 34.0782],
    "Koreatown": [-118.3009, 34.0584],
    "Los Feliz": [-118.2923, 34.1073],
    "West Hollywood": [-118.3617, 34.0900],
  };

  // Default to Manhattan if neighborhood not found
  return coordinates[neighborhood] || [-73.9712, 40.7831];
};

export function MapView({ location, safetyScore, coordinates }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Determine the color based on safety score
  const getSafetyColor = (score: number) => {
    if (score >= 80) return "#22c55e"; // Green
    if (score >= 60) return "#eab308"; // Yellow
    return "#ef4444"; // Red
  };

  useEffect(() => {
    if (!mapContainer.current) return;
    
    const locationCoords = coordinates || getNeighborhoodCoordinates(location);
    const safetyColor = getSafetyColor(safetyScore);

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: locationCoords,
      zoom: 13
    });

    map.current.on('load', () => {
      if (!map.current) return;
      
      // Add safety circle
      map.current.addSource('safety-radius', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: locationCoords
          },
          properties: {}
        }
      });

      map.current.addLayer({
        id: 'safety-radius',
        type: 'circle',
        source: 'safety-radius',
        paint: {
          'circle-radius': 300,
          'circle-color': safetyColor,
          'circle-opacity': 0.25,
          'circle-stroke-width': 2,
          'circle-stroke-color': safetyColor
        }
      });

      // Add marker
      new maplibregl.Marker({ color: "#000" })
        .setLngLat(locationCoords)
        .addTo(map.current);

      setLoaded(true);
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [location, safetyScore, coordinates]);

  return (
    <div className="relative w-full h-64 rounded-md overflow-hidden border border-border">
      <div ref={mapContainer} className="absolute inset-0" />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      )}
    </div>
  );
} 