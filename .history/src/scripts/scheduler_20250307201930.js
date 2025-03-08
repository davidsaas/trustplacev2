const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');
const logFile = path.join(__dirname, 'safety_metrics_cron.log');

// Create a write stream for logging
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Function to log messages with timestamps
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp}: ${message}\n`;
  logStream.write(logMessage);
  console.log(message);
};

// Function to run the safety metrics processor
const runSafetyMetricsProcessor = () => {
  log('Starting safety metrics processing job...');
  
  const pythonScript = path.join(__dirname, 'safety_metrics_processor.py');
  
  // Check if the script exists
  if (!fs.existsSync(pythonScript)) {
    log(`ERROR: Python script not found at ${pythonScript}`);
    return;
  }
  
  // Spawn a new process to run the Python script
  const pythonProcess = spawn('python3', [pythonScript]);
  
  pythonProcess.stdout.on('data', (data) => {
    log(`STDOUT: ${data.toString()}`);
  });
  
  pythonProcess.stderr.on('data', (data) => {
    log(`STDERR: ${data.toString()}`);
  });
  
  pythonProcess.on('close', (code) => {
    log(`Safety metrics processing completed with code ${code}`);
  });
  
  pythonProcess.on('error', (error) => {
    log(`ERROR: Failed to start Python process: ${error.message}`);
  });
};

// Run immediately on startup
log('Safety metrics scheduler started');
runSafetyMetricsProcessor();

// Schedule to run every 30 days
// Format: sec min hour day month day-of-week
cron.schedule('0 0 0 */30 * *', () => {
  log('Running scheduled safety metrics update (30-day interval)');
  runSafetyMetricsProcessor();
});

// Keep process alive
process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`);
});

log('Safety metrics scheduler initialized. Will run every 30 days.'); 