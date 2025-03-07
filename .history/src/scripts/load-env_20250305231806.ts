import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
const result = config({
  path: resolve(process.cwd(), '.env.local')
});

if (result.error) {
  console.error('Error loading .env.local file:', result.error);
  process.exit(1);
}

// Log loaded environment variables (without values for security)
console.log('Loaded environment variables:');
Object.keys(result.parsed || {}).forEach(key => {
  console.log(`- ${key}: ${key.includes('KEY') ? '[HIDDEN]' : result.parsed![key]}`);
}); 