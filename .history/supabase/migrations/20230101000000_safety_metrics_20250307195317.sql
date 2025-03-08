-- Create the safety_metrics table
CREATE TABLE IF NOT EXISTS safety_metrics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  district text NOT NULL,
  city text NOT NULL,
  metrics jsonb NOT NULL,
  lastUpdated timestamp with time zone NOT NULL DEFAULT now(),
  latitude double precision,
  longitude double precision,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(district, city)
);

-- Add indexes for geographical and text searches
CREATE INDEX IF NOT EXISTS idx_safety_metrics_district ON safety_metrics (district);
CREATE INDEX IF NOT EXISTS idx_safety_metrics_city ON safety_metrics (city);
CREATE INDEX IF NOT EXISTS idx_safety_metrics_location ON safety_metrics (latitude, longitude);

-- Create an RPC function to find the LA district for a specific lat/lng
CREATE OR REPLACE FUNCTION find_la_district(lat double precision, lng double precision)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Query for the nearest district in LA by calculating distance
  -- This is a simplified approach - in a real implementation,
  -- you would use PostGIS and proper geospatial functions
  SELECT 
    jsonb_build_object(
      'district', district,
      'distance_km', 
      (point(latitude, longitude) <-> point(lat, lng)) * 111.32 -- Approx conversion to km
    ) INTO result
  FROM 
    safety_metrics
  WHERE 
    city = 'Los Angeles' 
    AND latitude IS NOT NULL 
    AND longitude IS NOT NULL
  ORDER BY 
    point(latitude, longitude) <-> point(lat, lng)
  LIMIT 1;
  
  RETURN result;
END;
$$; 