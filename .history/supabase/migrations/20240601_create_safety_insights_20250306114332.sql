-- Create safety_insights table
CREATE TABLE IF NOT EXISTS safety_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id TEXT NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  url TEXT,
  username TEXT NOT NULL,
  safety_score INTEGER CHECK (safety_score >= 0 AND safety_score <= 100),
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral', 'mixed')),
  location_mentioned TEXT,
  district TEXT,
  city TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS safety_insights_location_idx ON safety_insights (latitude, longitude);
CREATE INDEX IF NOT EXISTS safety_insights_sentiment_idx ON safety_insights (sentiment);
CREATE INDEX IF NOT EXISTS safety_insights_created_at_idx ON safety_insights (created_at DESC);

-- Enable Row Level Security
ALTER TABLE safety_insights ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access to all authenticated users
CREATE POLICY "Allow read access for authenticated users" ON safety_insights
  FOR SELECT TO authenticated
  USING (true); 