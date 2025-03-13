# Safety Metrics Feature

This feature provides users with essential safety assessments for Airbnb locations within Los Angeles, with more cities planned for future releases. It transforms official police data into intuitive safety indicators that address common user concerns.

## Overview

Safety metrics are displayed on the report page and include five key safety dimensions:

1. **Night Safety**: "Can I go outside after dark?"
2. **Vehicle Safety**: "Can I park here safely?"
3. **Child Safety**: "Are kids safe here?"
4. **Transit Safety**: "Is it safe to use public transport?"
5. **Women's Safety**: "Would I be harassed here?"

Each metric includes a score (1-10), the user question, and a description of the current safety status.

## Data Processing

The safety metrics are calculated using crime data from the Los Angeles Police Department API. The data is processed and stored in Supabase for quick access by the frontend.

### Setup

1. Install the required Python dependencies:
   ```
   cd src/safety-metrics
   pip install -r requirements.txt
   ```

2. Run the Supabase schema setup:
   ```sql
   -- Execute this in Supabase SQL Editor
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

   Then run the schema file:
   ```sql
   -- Execute the content of src/lib/supabase/safety-metrics-schema.sql
   ```

3. Run the data processing script to populate Supabase with safety metrics:
   ```
   cd src/safety-metrics
   python process_safety_metrics.py
   ```

### Data Sources

- **LA**: Los Angeles Police Department API
  - Source: https://data.lacity.org/resource/2nrs-mtv8.json

### Crime Mapping

The script maps police crime codes to our five safety metrics:

- **Night Safety**: Crimes that occur during evening/night hours (6 PM to 6 AM)
- **Vehicle Safety**: Vehicle theft, break-ins, vandalism, etc.
- **Child Safety**: Crimes that could affect children
- **Transit Safety**: Crimes at or around transit locations
- **Women's Safety**: Crimes that disproportionately affect women

### Scoring Method

Scores are calculated on a 1-10 scale where:
- 10 = Very safe (few or no incidents)
- 1 = Exercise extreme caution (high incident rate)

The calculation takes into account:
- Number of crimes in each category
- Ratio compared to city average
- Geographic normalization

## Frontend Integration

The frontend component `SafetyMetrics.tsx` fetches data from Supabase based on the latitude and longitude of the Airbnb listing.

### Usage

The component is integrated into the report page and displayed as a separate card:

```jsx
<SafetyMetrics
  latitude={listing.location.coordinates.lat}
  longitude={listing.location.coordinates.lng}
  city={listing.location.city}
/>
```

## Maintenance

Safety metrics data should be refreshed monthly. The `expires_at` field in the Supabase table can be used to determine when data needs to be refreshed.

To update the data, simply run the processing script again:

```
python process_safety_metrics.py
``` 