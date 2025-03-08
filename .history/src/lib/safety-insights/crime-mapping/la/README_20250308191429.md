# Safety Metrics Analyzer for LA

This module analyzes crime data from the Los Angeles Police Department API to generate safety metrics for different districts.

## Features

- Fetches and analyzes crime data from LA Police Department API
- Calculates 5 different safety metrics:
  - Night Safety
  - Vehicle Safety
  - Child Safety
  - Transit Safety
  - Women's Safety
- Automatically updates metrics every 30 days
- Stores results in Supabase database

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Ensure your .env file contains the necessary Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

3. Run the SQL migration in Supabase:
- Copy the contents of `safety_metrics.sql`
- Run it in your Supabase SQL editor

## Running the Analyzer

### One-time Analysis
To run a one-time analysis:
```bash
python safety_metrics_analyzer.py
```

### Scheduled Updates
To start the scheduler (runs every 30 days):
```bash
python schedule_metrics_update.py
```

## Frontend Integration

The safety metrics are displayed using the `SafetyMetricsCard` React component. To use it:

```typescript
import SafetyMetricsCard from '@/components/safety-metrics/SafetyMetricsCard';

// In your component:
<SafetyMetricsCard metrics={metricsData} />
```

## Data Structure

The safety metrics are stored in Supabase with the following structure:

```typescript
interface SafetyMetrics {
    district: string;
    metrics: {
        night_safety: number;    // 1-10 scale
        vehicle_safety: number;  // 1-10 scale
        child_safety: number;    // 1-10 scale
        transit_safety: number;  // 1-10 scale
        women_safety: number;    // 1-10 scale
    };
    last_updated: string;
}
```

## Maintenance

The analyzer automatically handles:
- Data fetching with pagination
- Error handling and logging
- Database updates
- Scheduled runs

Monitor the logs for any issues during the automated updates. 