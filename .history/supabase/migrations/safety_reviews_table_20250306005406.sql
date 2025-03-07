-- Create safety_reviews table
CREATE TABLE IF NOT EXISTS safety_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id TEXT NOT NULL,
  review_id TEXT NOT NULL,
  author TEXT NOT NULL,
  author_image TEXT,
  text TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add indexes for faster queries
  CONSTRAINT unique_review_id UNIQUE (review_id)
);

-- Add index on listing_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_safety_reviews_listing_id ON safety_reviews (listing_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE safety_reviews ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read
CREATE POLICY "Allow anyone to read safety_reviews"
  ON safety_reviews
  FOR SELECT
  USING (true);

-- Create policy to allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert safety_reviews"
  ON safety_reviews
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Create policy to allow service role to update and delete
CREATE POLICY "Allow service role to update and delete safety_reviews"
  ON safety_reviews
  USING (auth.role() = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE safety_reviews IS 'Stores safety-related reviews from Airbnb listings';
COMMENT ON COLUMN safety_reviews.listing_id IS 'The ID of the Airbnb listing';
COMMENT ON COLUMN safety_reviews.review_id IS 'The original ID of the review from Airbnb';
COMMENT ON COLUMN safety_reviews.author IS 'The name of the review author';
COMMENT ON COLUMN safety_reviews.author_image IS 'URL to the author profile image';
COMMENT ON COLUMN safety_reviews.text IS 'The text content of the review';
COMMENT ON COLUMN safety_reviews.date IS 'The date when the review was posted';
COMMENT ON COLUMN safety_reviews.rating IS 'The rating given by the reviewer (1-5)'; 