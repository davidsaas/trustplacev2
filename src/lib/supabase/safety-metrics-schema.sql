-- safety_metrics table for storing safety metrics data
CREATE TABLE IF NOT EXISTS public.safety_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  metric_type TEXT NOT NULL, -- 'night', 'vehicle', 'child', 'transit', 'women'
  score INTEGER NOT NULL, -- 1-10 scale
  question TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create indices for faster queries
CREATE INDEX IF NOT EXISTS idx_safety_metrics_location ON public.safety_metrics (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_safety_metrics_type ON public.safety_metrics (metric_type);
CREATE INDEX IF NOT EXISTS idx_safety_metrics_expires_at ON public.safety_metrics (expires_at); 