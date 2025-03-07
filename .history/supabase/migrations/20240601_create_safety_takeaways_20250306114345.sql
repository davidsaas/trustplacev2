-- Create safety_takeaways table
CREATE TABLE IF NOT EXISTS safety_takeaways (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius DOUBLE PRECISION NOT NULL DEFAULT 2,
  positive_takeaway TEXT,
  negative_takeaway TEXT,
  neutral_takeaway TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS safety_takeaways_location_idx ON safety_takeaways (latitude, longitude, radius);
CREATE INDEX IF NOT EXISTS safety_takeaways_expires_at_idx ON safety_takeaways (expires_at DESC);

-- Enable Row Level Security
ALTER TABLE safety_takeaways ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access to all authenticated users
CREATE POLICY "Allow read access for authenticated users" ON safety_takeaways
  FOR SELECT TO authenticated
  USING (true);

-- Create policy to allow insert for service role only
CREATE POLICY "Allow insert for service role" ON safety_takeaways
  FOR INSERT TO service_role
  WITH CHECK (true); 