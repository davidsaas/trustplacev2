"use client";

import { useEffect, useRef, useState, memo } from "react";
import dynamic from "next/dynamic";

interface MapViewProps {
  location: string;
  safetyScore: number;
  coordinates: [number, number]; // [longitude, latitude]
}

// Memo the component to prevent unnecessary re-renders when scrolling
const MapView = memo(({ location, safetyScore, coordinates }: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const circle = useRef<any>(null);
  const marker = useRef<any>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [L, setL] = useState<any>(null);

  // Determine the color based on safety score
  const getSafetyColor = (score: number) => {
    if (score >= 80) return "#10b981"; // Emerald-500
    if (score >= 60) return "#f59e0b"; // Amber-500
    return "#f43f5e"; // Rose-500
  };

  // Load Leaflet only on client side
  useEffect(() => {
    const loadLeaflet = async () => {
      const L = (await import('leaflet')).default;
      require('leaflet/dist/leaflet.css');
      
      // Fix Leaflet marker icon issues
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: '/images/leaflet/marker-icon.png',
        iconRetinaUrl: '/images/leaflet/marker-icon-2x.png',
        shadowUrl: '/images/leaflet/marker-shadow.png',
      });
      
      setL(L);
    };
    
    loadLeaflet();
  }, []);

  // Initialize map once Leaflet is loaded
  useEffect(() => {
    if (!L || !mapContainer.current || mapInitialized) return;

    // Convert coordinates from [longitude, latitude] to [latitude, longitude] for Leaflet
    const [longitude, latitude] = coordinates;
    const leafletCoords: [number, number] = [latitude, longitude];
    const safetyColor = getSafetyColor(safetyScore);

    // Initialize map if it doesn't exist
    if (!map.current) {
      map.current = L.map(mapContainer.current, {
        center: leafletCoords,
        zoom: 14,
        layers: [
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          })
        ]
      });
      
      // Add a marker for the location
      marker.current = L.marker(leafletCoords).addTo(map.current);
      marker.current.bindPopup(`<b>${location}</b><br>Safety Score: ${safetyScore}`).openPopup();
      
      // Create a circle to represent the safety score radius (bigger and greener = safer)
      const radiusFactor = Math.max(300, safetyScore * 5); // Base radius calculation on safety score
      circle.current = L.circle(leafletCoords, {
        color: safetyColor,
        fillColor: safetyColor,
        fillOpacity: 0.15,
        radius: radiusFactor
      }).addTo(map.current);
      
      // Mark the map as initialized to prevent re-initialization on scroll
      setMapInitialized(true);
    }

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        marker.current = null;
        circle.current = null;
      }
    };
  }, [L, coordinates, location, safetyScore, mapInitialized]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-blue-100 shadow-inner">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
});

export default MapView; 