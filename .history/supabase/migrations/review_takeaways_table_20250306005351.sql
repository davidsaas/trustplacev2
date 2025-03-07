-- Create review_takeaways table
CREATE TABLE IF NOT EXISTS review_takeaways (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id TEXT NOT NULL,
  positive_takeaway TEXT,
  negative_takeaway TEXT,
  summary_takeaway TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Add indexes for faster queries
  CONSTRAINT unique_listing_id UNIQUE (listing_id)
);

-- Add RLS (Row Level Security) policies
ALTER TABLE review_takeaways ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read
CREATE POLICY "Allow anyone to read review_takeaways"
  ON review_takeaways
  FOR SELECT
  USING (true);

-- Create policy to allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert review_takeaways"
  ON review_takeaways
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Create policy to allow service role to update and delete
CREATE POLICY "Allow service role to update and delete review_takeaways"
  ON review_takeaways
  USING (auth.role() = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE review_takeaways IS 'Stores AI-generated takeaways from Airbnb reviews';
COMMENT ON COLUMN review_takeaways.listing_id IS 'The ID of the Airbnb listing';
COMMENT ON COLUMN review_takeaways.positive_takeaway IS 'AI-generated positive takeaway from reviews';
COMMENT ON COLUMN review_takeaways.negative_takeaway IS 'AI-generated negative takeaway from reviews';
COMMENT ON COLUMN review_takeaways.summary_takeaway IS 'AI-generated summary takeaway from all reviews';
COMMENT ON COLUMN review_takeaways.expires_at IS 'When the takeaways should be regenerated'; 