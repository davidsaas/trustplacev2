#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for schema changes

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createReviewTakeawaysTable() {
  try {
    console.log('Creating review_takeaways table...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '../supabase/migrations/20240601_create_review_takeaways.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL
    const { error } = await supabase.rpc('pgmigrate', { query: sqlContent });
    
    if (error) {
      throw error;
    }
    
    console.log('Successfully created review_takeaways table!');
  } catch (error) {
    console.error('Error creating review_takeaways table:', error);
  }
}

// Run the function
createReviewTakeawaysTable(); 