#!/bin/bash

# Script to run the review_takeaways table migration using Supabase CLI
# Make sure you have Supabase CLI installed and configured

# Set variables
MIGRATION_FILE="../supabase/migrations/20240601_create_review_takeaways.sql"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Supabase CLI is not installed. Please install it first."
    echo "You can install it with: npm install -g supabase"
    exit 1
fi

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "Running migration to create review_takeaways table..."

# Run the migration using Supabase CLI
# This assumes you're already logged in to Supabase
supabase db push

echo "Migration completed successfully!"
echo "The review_takeaways table has been created in your Supabase project."
echo ""
echo "Alternatively, you can run the SQL directly in the Supabase SQL Editor:"
echo "1. Go to your Supabase project dashboard"
echo "2. Navigate to the SQL Editor"
echo "3. Copy and paste the contents of supabase/direct_sql_script.sql"
echo "4. Run the SQL script" 