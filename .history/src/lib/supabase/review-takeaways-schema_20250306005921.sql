CREATE TABLE IF NOT EXISTS public.review_takeaways (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id TEXT NOT NULL,
  positive_takeaway TEXT,
  negative_takeaway TEXT,
  review_summary TEXT,
  average_rating FLOAT,
  review_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_review_takeaways_listing ON public.review_takeaways (listing_id);
CREATE INDEX IF NOT EXISTS idx_review_takeaways_expires_at ON public.review_takeaways (expires_at); 