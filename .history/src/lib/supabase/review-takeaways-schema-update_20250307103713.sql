-- Migration script to update review_takeaways table to match the new design
-- This script is idempotent and can be run multiple times

-- First, check if the review_summary field exists
DO $$
BEGIN
    -- Review the existing table structure
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'review_takeaways' 
        AND column_name = 'review_summary'
    ) THEN
        -- No changes needed to the structure - just execute the migration
        RAISE NOTICE 'review_takeaways table already has the required structure.';
    ELSE
        -- This is just a precaution - the table should already exist, but if not, create it
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
        
        RAISE NOTICE 'review_takeaways table created or verified.';
    END IF;
END $$; 