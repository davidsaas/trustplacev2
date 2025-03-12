#!/usr/bin/env node

/**
 * Test script for the review takeaways functionality
 * 
 * This script tests the findOrGenerateReviewTakeaways function
 * by fetching or generating takeaways for a specified listing ID.
 * 
 * Usage: node test_review_takeaways.js <listing_id>
 */

// Import required modules
require('dotenv').config({ path: '.env.local' });
const { findOrGenerateReviewTakeaways } = require('../src/lib/reviews/processor');

// Get listing ID from command line arguments
const listingId = process.argv[2];

if (!listingId) {
  console.error('Error: Listing ID is required');
  console.log('Usage: node test_review_takeaways.js <listing_id>');
  process.exit(1);
}

// Test the function
async function testReviewTakeaways() {
  console.log(`Testing review takeaways for listing ID: ${listingId}`);
  console.log('Fetching or generating takeaways...');
  
  try {
    const takeaways = await findOrGenerateReviewTakeaways(listingId);
    
    if (!takeaways) {
      console.log('No takeaways could be generated. Possible reasons:');
      console.log('- No reviews found for this listing');
      console.log('- Error occurred during generation');
      process.exit(1);
    }
    
    console.log('\nTakeaways generated successfully:');
    console.log('--------------------------------');
    console.log('Positive Takeaway:');
    console.log(takeaways.positive_takeaway || 'None');
    console.log('\nNegative Takeaway:');
    console.log(takeaways.negative_takeaway || 'None');
    console.log('\nSummary Takeaway:');
    console.log(takeaways.summary_takeaway || 'None');
    console.log('--------------------------------');
    
    console.log('\nMetadata:');
    console.log(`ID: ${takeaways.id || 'Not saved to database'}`);
    console.log(`Created: ${takeaways.created_at || 'N/A'}`);
    console.log(`Expires: ${takeaways.expires_at || 'N/A'}`);
    
  } catch (error) {
    console.error('Error testing review takeaways:', error);
    process.exit(1);
  }
}

// Run the test
testReviewTakeaways()
  .then(() => {
    console.log('\nTest completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 