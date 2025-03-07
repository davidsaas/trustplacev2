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
    if (score >= 80) return "#10b981"; // Emerald-500
    if (score >= 60) return "#f59e0b"; // Amber-500
    return "#f43f5e"; // Rose-500
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
      map.current = L.map(mapContainer.current, {
        zoomControl: false, // Hide default zoom control
        attributionControl: false // Hide attribution
      }).setView(leafletCoords, 15);
      
      // Add custom tile layer with a more modern style
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      }).addTo(map.current);
      
      // Add custom zoom control to bottom right
      L.control.zoom({
        position: 'bottomright'
      }).addTo(map.current);
      
      // Add attribution in bottom left
      L.control.attribution({
        position: 'bottomleft'
      }).addTo(map.current);
    } else {
      map.current.setView(leafletCoords, 15);
    }

    // Update or create circle
    if (circle.current) {
      circle.current.setLatLng(leafletCoords);
      circle.current.setStyle({ 
        color: safetyColor,
        fillColor: safetyColor
      });
    } else {
      circle.current = L.circle(leafletCoords, {
        color: safetyColor,
        fillColor: safetyColor,
        fillOpacity: 0.2,
        weight: 2,
        radius: 300
      }).addTo(map.current);
    }

    // Create custom icon
    const customIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `<div style="background-color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); border: 2px solid ${safetyColor};">
              <div style="background-color: ${safetyColor}; width: 12px; height: 12px; border-radius: 50%;"></div>
            </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    // Update or create marker
    if (marker.current) {
      marker.current.setLatLng(leafletCoords);
      marker.current.setIcon(customIcon);
    } else {
      marker.current = L.marker(leafletCoords, { icon: customIcon })
        .addTo(map.current)
        .bindPopup(`<div style="font-family: system-ui, sans-serif; padding: 4px 8px;">
                      <strong>${location}</strong>
                      <p style="margin: 4px 0 0; font-size: 12px;">Safety Score: ${safetyScore}/100</p>
                    </div>`, 
                    { 
                      closeButton: false,
                      className: 'custom-popup',
                      offset: [0, -12]
                    });
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
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-blue-100 shadow-inner">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
} 