-- Create the location_videos table to store YouTube videos about locations
CREATE TABLE IF NOT EXISTS public.location_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  summary TEXT NOT NULL,
  relevance_score FLOAT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Add a unique constraint to prevent duplicate videos for the same location
  UNIQUE(location_id, video_id)
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_location_videos_location_id ON public.location_videos(location_id);
CREATE INDEX IF NOT EXISTS idx_location_videos_relevance ON public.location_videos(relevance_score);

-- Add RLS policies
ALTER TABLE public.location_videos ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read location videos
CREATE POLICY "Allow public read access to location_videos" 
ON public.location_videos FOR SELECT USING (true);

-- Only allow authenticated users to insert/update/delete
CREATE POLICY "Allow authenticated users to insert location_videos" 
ON public.location_videos FOR INSERT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to update location_videos" 
ON public.location_videos FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete location_videos" 
ON public.location_videos FOR DELETE TO authenticated USING (true); 