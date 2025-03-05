import { fetchJson } from '@/lib/utils';

interface OSMFeature {
  type: string;
  distance: number;
  name?: string;
}

interface SafetyMetrics {
  emergencyServices: {
    score: number;
    details: string[];
  };
  publicTransport: {
    score: number;
    details: string[];
  };
  nightSafety: {
    score: number;
    details: string[];
  };
  communityPresence: {
    score: number;
    details: string[];
  };
}

async function fetchNearbyFeatures(lat: number, lon: number, radius: number = 1000): Promise<OSMFeature[]> {
  const query = `
    [out:json][timeout:25];
    (
      // Emergency services
      node["amenity"="police"](around:${radius},${lat},${lon});
      way["amenity"="police"](around:${radius},${lat},${lon});
      node["amenity"="fire_station"](around:${radius},${lat},${lon});
      way["amenity"="fire_station"](around:${radius},${lat},${lon});
      node["amenity"="hospital"](around:${radius},${lat},${lon});
      way["amenity"="hospital"](around:${radius},${lat},${lon});
      
      // Public transport
      node["public_transport"](around:${radius},${lat},${lon});
      way["public_transport"](around:${radius},${lat},${lon});
      node["highway"="bus_stop"](around:${radius},${lat},${lon});
      
      // Night safety
      node["highway"="street_lamp"](around:${radius},${lat},${lon});
      node["amenity"="restaurant"](around:${radius},${lat},${lon});
      way["amenity"="restaurant"](around:${radius},${lat},${lon});
      node["amenity"="cafe"](around:${radius},${lat},${lon});
      way["amenity"="cafe"](around:${radius},${lat},${lon});
      
      // Community presence
      node["shop"](around:${radius},${lat},${lon});
      way["shop"](around:${radius},${lat},${lon});
      node["amenity"="library"](around:${radius},${lat},${lon});
      node["amenity"="community_centre"](around:${radius},${lat},${lon});
    );
    out body;
    >;
    out skel qt;
  `;

  const response = await fetch(
    `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
  );
  const data = await response.json();
  
  return data.elements.map((element: any) => ({
    type: element.tags?.amenity || element.tags?.public_transport || element.tags?.highway || element.tags?.shop || 'unknown',
    distance: calculateDistance(lat, lon, element.lat, element.lon),
    name: element.tags?.name
  }));
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // Convert to meters
}

export async function calculateSafetyMetrics(lat: number, lon: number): Promise<SafetyMetrics> {
  const features = await fetchNearbyFeatures(lat, lon);
  
  const metrics: SafetyMetrics = {
    emergencyServices: { score: 0, details: [] },
    publicTransport: { score: 0, details: [] },
    nightSafety: { score: 0, details: [] },
    communityPresence: { score: 0, details: [] }
  };

  // Emergency Services Score (max 100)
  const police = features.filter(f => f.type === 'police');
  const fireStation = features.filter(f => f.type === 'fire_station');
  const hospital = features.filter(f => f.type === 'hospital');

  if (police.length > 0) {
    const nearestPolice = Math.min(...police.map(p => p.distance));
    metrics.emergencyServices.score += Math.max(0, 40 - (nearestPolice / 50));
    metrics.emergencyServices.details.push(`Police station ${Math.round(nearestPolice)}m away`);
  }
  if (fireStation.length > 0) {
    const nearestFire = Math.min(...fireStation.map(f => f.distance));
    metrics.emergencyServices.score += Math.max(0, 30 - (nearestFire / 75));
    metrics.emergencyServices.details.push(`Fire station ${Math.round(nearestFire)}m away`);
  }
  if (hospital.length > 0) {
    const nearestHospital = Math.min(...hospital.map(h => h.distance));
    metrics.emergencyServices.score += Math.max(0, 30 - (nearestHospital / 100));
    metrics.emergencyServices.details.push(`Hospital ${Math.round(nearestHospital)}m away`);
  }

  // Public Transport Score (max 100)
  const busStops = features.filter(f => f.type === 'bus_stop');
  const publicTransport = features.filter(f => f.type === 'public_transport');
  
  const transportCount = busStops.length + publicTransport.length;
  metrics.publicTransport.score = Math.min(100, transportCount * 15);
  metrics.publicTransport.details.push(`${transportCount} public transport stops nearby`);
  
  if (busStops.length > 0) {
    const nearestBusStop = Math.min(...busStops.map(b => b.distance));
    metrics.publicTransport.details.push(`Nearest bus stop ${Math.round(nearestBusStop)}m away`);
  }

  // Night Safety Score (max 100)
  const streetLamps = features.filter(f => f.type === 'street_lamp');
  const nightVenues = features.filter(f => 
    f.type === 'restaurant' || f.type === 'cafe'
  );

  metrics.nightSafety.score += Math.min(50, streetLamps.length * 5);
  metrics.nightSafety.score += Math.min(50, nightVenues.length * 10);
  
  metrics.nightSafety.details.push(
    `${streetLamps.length} street lamps in the area`,
    `${nightVenues.length} restaurants/cafes nearby`
  );

  // Community Presence Score (max 100)
  const shops = features.filter(f => f.type === 'shop');
  const communitySpaces = features.filter(f => 
    f.type === 'library' || f.type === 'community_centre'
  );

  metrics.communityPresence.score += Math.min(70, shops.length * 5);
  metrics.communityPresence.score += Math.min(30, communitySpaces.length * 15);
  
  metrics.communityPresence.details.push(
    `${shops.length} shops in the area`,
    `${communitySpaces.length} community spaces nearby`
  );

  // Normalize all scores to 0-100
  metrics.emergencyServices.score = Math.min(100, metrics.emergencyServices.score);
  metrics.publicTransport.score = Math.min(100, metrics.publicTransport.score);
  metrics.nightSafety.score = Math.min(100, metrics.nightSafety.score);
  metrics.communityPresence.score = Math.min(100, metrics.communityPresence.score);

  return metrics;
} 