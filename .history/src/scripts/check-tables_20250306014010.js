const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  try {
    console.log('Checking Supabase tables...');
    
    // Query to get a list of tables
    const { data, error } = await supabase
      .from('location_videos')
      .select('id')
      .limit(1);
      
    if (error) {
      if (error.code === '42P01') {
        console.error('ERROR: Table location_videos does not exist in the database.');
        console.log('You need to run the SQL schema migration to create the location_videos table.');
        console.log('Use the schema in src/lib/schema.sql to create the table in the Supabase SQL editor.');
      } else {
        console.error('Error querying location_videos table:', error);
      }
      return;
    }
    
    console.log('Table location_videos exists in the database.');
    console.log('Sample data:', data);
    
    // Check for videos
    const { data: videoCount, error: countError } = await supabase
      .from('location_videos')
      .select('id', { count: 'exact' });
      
    if (countError) {
      console.error('Error counting videos:', countError);
    } else {
      console.log(`Found ${videoCount.length} videos in the database.`);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the function
checkTables(); 