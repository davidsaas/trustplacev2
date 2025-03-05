"use client";

import { useEffect, useRef } from "react";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon issues
const fixLeafletIcon = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  
  L.Icon.Default.mergeOptions({
    iconUrl: '/images/leaflet/marker-icon.png',
    iconRetinaUrl: '/images/leaflet/marker-icon-2x.png',
    shadowUrl: '/images/leaflet/marker-shadow.png',
  });
};

interface MapViewProps {
  location: string;
  safetyScore: number;
  coordinates: [number, number]; // [longitude, latitude]
}

export function MapView({ location, safetyScore, coordinates }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const circle = useRef<L.Circle | null>(null);
  const marker = useRef<L.Marker | null>(null);

  // Determine the color based on safety score
  const getSafetyColor = (score: number) => {
    if (score >= 80) return "#22c55e"; // Green
    if (score >= 60) return "#eab308"; // Yellow
    return "#ef4444"; // Red
  };

  useEffect(() => {
    // Fix Leaflet icon issue
    fixLeafletIcon();
    
    if (!mapContainer.current) return;

    // Convert coordinates from [longitude, latitude] to [latitude, longitude] for Leaflet
    const [longitude, latitude] = coordinates;
    const leafletCoords: [number, number] = [latitude, longitude];
    const safetyColor = getSafetyColor(safetyScore);

    // Initialize map if it doesn't exist
    if (!map.current) {
      map.current = L.map(mapContainer.current).setView(leafletCoords, 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map.current);
    } else {
      map.current.setView(leafletCoords, 14);
    }

    // Update or create circle
    if (circle.current) {
      circle.current.setLatLng(leafletCoords);
      circle.current.setStyle({ color: safetyColor });
    } else {
      circle.current = L.circle(leafletCoords, {
        color: safetyColor,
        fillColor: safetyColor,
        fillOpacity: 0.2,
        radius: 300
      }).addTo(map.current);
    }

    // Update or create marker
    if (marker.current) {
      marker.current.setLatLng(leafletCoords);
    } else {
      marker.current = L.marker(leafletCoords)
        .addTo(map.current)
        .bindPopup(location);
    }

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        circle.current = null;
        marker.current = null;
      }
    };
  }, [location, safetyScore, coordinates]);

  return (
    <div className="relative w-full h-64 rounded-md overflow-hidden border border-border">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
} 