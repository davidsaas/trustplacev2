-- Create users table with premium membership fields
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  is_premium BOOLEAN DEFAULT false,
  premium_since TIMESTAMP WITH TIME ZONE,
  premium_until TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create saved_reports table for storing user saved reports
CREATE TABLE IF NOT EXISTS public.saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_url TEXT NOT NULL,
  listing_title TEXT NOT NULL,
  safety_score INTEGER NOT NULL,
  premium_features JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_reports_user_id ON public.saved_reports(user_id);

-- Create RLS policies for users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can only read their own data
CREATE POLICY "Users can read their own data" 
  ON public.users 
  FOR SELECT 
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update their own data" 
  ON public.users 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Users can insert their own data
CREATE POLICY "Users can insert their own data"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Service role can manage all user data
CREATE POLICY "Service role can manage all user data" 
  ON public.users 
  USING (auth.role() = 'service_role');

-- Enable RLS for saved_reports table
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

-- Users can read their own saved reports
CREATE POLICY "Users can read their own saved reports"
  ON public.saved_reports
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own saved reports
CREATE POLICY "Users can insert their own saved reports"
  ON public.saved_reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own saved reports
CREATE POLICY "Users can delete their own saved reports"
  ON public.saved_reports
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to create a user record on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add premium features related fields to existing tables as needed
ALTER TABLE public.saved_reports ADD COLUMN IF NOT EXISTS premium_features JSONB; 