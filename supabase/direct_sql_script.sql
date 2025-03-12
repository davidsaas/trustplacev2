-- Direct SQL script to create review_takeaways table
-- You can run this directly in the Supabase SQL Editor

-- Create review_takeaways table
CREATE TABLE IF NOT EXISTS public.review_takeaways (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id TEXT NOT NULL,
  positive_takeaway TEXT,
  negative_takeaway TEXT,
  summary_takeaway TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Add any additional fields as needed
  CONSTRAINT review_takeaways_listing_id_unique UNIQUE (listing_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS review_takeaways_listing_id_idx ON public.review_takeaways (listing_id);
CREATE INDEX IF NOT EXISTS review_takeaways_expires_at_idx ON public.review_takeaways (expires_at);

-- Add RLS policies
ALTER TABLE public.review_takeaways ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read review takeaways
CREATE POLICY "Allow anyone to read review takeaways"
  ON public.review_takeaways
  FOR SELECT
  USING (true);

-- Only allow authenticated users to insert review takeaways
CREATE POLICY "Allow authenticated users to insert review takeaways"
  ON public.review_takeaways
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only allow service role to update or delete review takeaways
CREATE POLICY "Allow service role to update review takeaways"
  ON public.review_takeaways
  FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Allow service role to delete review takeaways"
  ON public.review_takeaways
  FOR DELETE
  TO service_role
  USING (true);

-- Add comment to table
COMMENT ON TABLE public.review_takeaways IS 'Stores AI-generated takeaways from Airbnb reviews for safety analysis'; 