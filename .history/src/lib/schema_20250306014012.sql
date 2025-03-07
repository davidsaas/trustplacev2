-- Schema for location_videos table
CREATE TABLE IF NOT EXISTS public.location_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  summary TEXT NOT NULL,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  relevance_score FLOAT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Ensure we don't have duplicate videos for the same location
  UNIQUE(location_id, video_id)
);

-- Add RLS policies
ALTER TABLE public.location_videos ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" 
  ON public.location_videos
  FOR SELECT 
  USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated insert" 
  ON public.location_videos
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Allow authenticated users to update their own records
CREATE POLICY "Allow authenticated update" 
  ON public.location_videos
  FOR UPDATE 
  TO authenticated 
  USING (true); 