# Safety Metrics Processor

This directory contains scripts to process and calculate safety metrics for various districts in Los Angeles (with support for other cities planned in future releases).

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Create a `.env` file with the following variables:
```
DB_HOST=your_database_host
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
```

## Running the Processor

### One-time Manual Run

To run the safety metrics processor once:

```bash
python safety_metrics_processor.py
```

### Scheduled Runs

To start the scheduler which will run the processor immediately and then every 30 days:

```bash
npm start
```

## Database Setup

The processed safety metrics will be stored in the `safety_metrics` table in your database. The table schema should include:

- `id`: UUID primary key
- `district`: Text field for district name
- `city`: Text field for city name
- `metrics`: JSONB field for storing the calculated metrics
- `lastUpdated`: Timestamp for when the metrics were last updated
- `latitude`: Float for district center latitude
- `longitude`: Float for district center longitude
- `created_at`: Timestamp for row creation

## Crime Type Mapping

The processor maps LAPD crime codes to our five safety metrics:

1. **Night Safety**: "Can I go outside after dark?"
2. **Vehicle Safety**: "Can I park here safely?"
3. **Child Safety**: "Are kids safe here?"
4. **Transit Safety**: "Is it safe to use public transport?"
5. **Women's Safety**: "Would I be harassed here?"

The specific mapping can be found in the `CRIME_MAPPING` dictionary in the Python script.

## Data Source

Currently, the processor uses data from the Los Angeles Police Department API:
- https://data.lacity.org/resource/2nrs-mtv8.json

## Troubleshooting

Check the logs in `safety_metrics_cron.log` for any errors or issues with the scheduled runs. 