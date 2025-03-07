-- Safety Insights Table Schema
CREATE TABLE IF NOT EXISTS safety_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  url TEXT,
  username TEXT,
  community_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  
  -- AI-processed fields
  is_safety_related BOOLEAN,
  safety_score FLOAT,
  sentiment TEXT, -- positive, negative, neutral
  
  -- Location data
  location_mentioned TEXT,
  latitude FLOAT,
  longitude FLOAT,
  district TEXT,
  city TEXT,
  
  -- Metadata
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Enable PostGIS extension for spatial queries
  -- Note: You'll need to enable the PostGIS extension in Supabase
  -- via the SQL editor: CREATE EXTENSION postgis;
  
  -- Add a geography column for spatial queries
  -- location GEOGRAPHY(POINT, 4326)
);

-- Create spatial index (after enabling PostGIS)
-- CREATE INDEX safety_insights_location_idx ON safety_insights USING GIST (location);

-- Create text search index for full-text search
CREATE INDEX safety_insights_body_idx ON safety_insights USING GIN (to_tsvector('english', body));
CREATE INDEX safety_insights_title_idx ON safety_insights USING GIN (to_tsvector('english', title));

-- Create index for location-based queries
CREATE INDEX safety_insights_coords_idx ON safety_insights (latitude, longitude); 