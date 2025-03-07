/**
 * Script to process Reddit data for safety insights
 * 
 * Usage:
 * - To process local JSON file:
 *   npx tsx scripts/process-safety-data.ts local "Los Angeles" "/app/api/social-comments/la.json"
 * 
 * - To process data from Apify API:
 *   npx tsx scripts/process-safety-data.ts apify "Los Angeles" "https://api.apify.com/v2/datasets/GBLsNDHJw4w2bRwYG/items?clean=true&format=json"
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { processLocalJsonFile, processApifyData } from '../lib/safety-insights/processor';

// Load environment variables from .env.local
const result = config({
  path: resolve(process.cwd(), '.env.local')
});

if (result.error) {
  console.error('Error loading .env.local file:', result.error);
  process.exit(1);
}

async function main() {
  const [source, city, path] = process.argv.slice(2);
  
  if (!source || !city || !path) {
    console.error('Usage: npx tsx scripts/process-safety-data.ts <source> <city> <path>');
    console.error('  <source>: "local" or "apify"');
    console.error('  <city>: City name, e.g., "Los Angeles"');
    console.error('  <path>: File path or Apify API URL');
    process.exit(1);
  }
  
  console.log(`Processing ${source} data for ${city}...`);
  
  try {
    let processedInsights = [];
    
    if (source === 'local') {
      processedInsights = await processLocalJsonFile(path, city);
    } else if (source === 'apify') {
      processedInsights = await processApifyData(path, city);
    } else {
      console.error('Invalid source. Use "local" or "apify".');
      process.exit(1);
    }
    
    console.log(`Processed ${processedInsights.length} safety insights.`);
    
    if (processedInsights.length > 0) {
      console.log('Sample insight:');
      console.log(JSON.stringify(processedInsights[0], null, 2));
    }
  } catch (error) {
    console.error('Error processing data:', error);
    process.exit(1);
  }
}

main(); 