# Review Takeaways Feature

This document describes the Review Takeaways feature, which uses AI to generate concise summaries of Airbnb reviews for safety analysis.

## Overview

The Review Takeaways feature analyzes reviews for an Airbnb listing and generates three types of takeaways:

1. **Positive Takeaway**: Summarizes positive safety aspects mentioned in 4-5 star reviews
2. **Negative Takeaway**: Summarizes safety concerns mentioned in 1-3 star reviews
3. **Summary Takeaway**: Provides an overall safety impression based on all reviews

These takeaways are stored in a Supabase database and displayed on the listing report page.

## Architecture

The feature consists of the following components:

- **Database Table**: `review_takeaways` in Supabase
- **API Route**: `/api/review-takeaways` for fetching or generating takeaways
- **Processor**: `src/lib/reviews/processor.ts` for generating takeaways using Gemini AI
- **Component**: `src/components/ReviewTakeaways.tsx` for displaying takeaways

## Database Schema

The `review_takeaways` table has the following structure:

```sql
CREATE TABLE public.review_takeaways (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id TEXT NOT NULL,
  positive_takeaway TEXT,
  negative_takeaway TEXT,
  summary_takeaway TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  CONSTRAINT review_takeaways_listing_id_unique UNIQUE (listing_id)
);
```

## Setup

To set up the Review Takeaways feature:

1. Create the `review_takeaways` table in Supabase:
   - Option 1: Run the SQL script in `supabase/direct_sql_script.sql` in the Supabase SQL Editor
   - Option 2: Use the Supabase CLI with the migration file in `supabase/migrations/20240601_create_review_takeaways.sql`
   - Option 3: Run the Node.js script in `scripts/create_review_takeaways_table.js`

2. Add the required environment variables to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

## How It Works

1. When a user views a listing report, the `ReviewTakeaways` component makes a request to `/api/review-takeaways` with the listing ID.
2. The API route calls `findOrGenerateReviewTakeaways` from the processor.
3. The processor first checks if valid takeaways already exist in the database.
4. If not, it fetches reviews for the listing and uses Gemini AI to generate new takeaways.
5. The generated takeaways are stored in the database with an expiration date (7 days).
6. The takeaways are returned to the component for display.

## Caching

Takeaways are cached in the database for 7 days to reduce API calls to Gemini AI. The `expires_at` field is used to determine if cached takeaways are still valid.

## Error Handling

The processor includes retry logic for handling rate limits from the Gemini AI API. If all retries fail, the component falls back to displaying a message indicating that takeaways could not be generated.

## Future Improvements

Potential improvements to the feature:

1. Add a background job to pre-generate takeaways for popular listings
2. Implement more sophisticated AI prompts for better takeaways
3. Add user feedback mechanism to improve takeaway quality
4. Support multiple languages for international listings 