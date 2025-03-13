#!/usr/bin/env python3
"""
Safety Metrics Processor

This script processes crime data from LAPD and uploads it to Supabase as safety metrics.
It maps crime types to safety metrics categories and calculates safety scores.
"""

import os
import json
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client
import uuid
import math
import time

# Load environment variables
load_dotenv()
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

# LAPD API endpoint
LAPD_API_URL = "https://data.lacity.org/resource/2nrs-mtv8.json"

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Define safety metric types and their questions
SAFETY_METRICS = {
    'night': {
        'question': 'Can I go outside after dark?',
        'description': 'Safety for pedestrians during evening/night hours',
        'crime_codes': ['210', '220', '230', '231', '235', '236', '250', '251', '761', '762', '763', '860'],
        'time_filter': lambda hour: hour >= 18 or hour < 6  # 6 PM to 6 AM
    },
    'vehicle': {
        'question': 'Can I park here safely?',
        'description': 'Risk of vehicle theft and break-ins',
        'crime_codes': ['330', '331', '410', '420', '421', '330', '331', '440', '441', '442', '443', '444', '445']
    },
    'child': {
        'question': 'Are kids safe here?',
        'description': 'Overall safety concerning crimes that could affect children',
        'crime_codes': ['235', '236', '627', '760', '762', '922', '237', '812', '813', '814', '815']
    },
    'transit': {
        'question': 'Is it safe to use public transport?',
        'description': 'Safety at and around transit locations',
        'crime_codes': ['210', '220', '230', '231', '476', '946', '761', '762', '763', '475', '352']
    },
    'women': {
        'question': 'Would I be harassed here?',
        'description': 'Assessment of crimes that disproportionately affect women',
        'crime_codes': ['121', '122', '815', '820', '821', '236', '626', '627', '647', '860', '921', '922']
    }
}

def fetch_crime_data():
    """Fetch crime data from LAPD API using proper pagination"""
    all_data = []
    offset = 0
    limit = 1000  # Default SODA limit - more reliable than larger batches
    retries = 3
    timeout = 30  # seconds
    
    while True:
        for attempt in range(retries):
            try:
                print(f"\nFetching batch starting at offset {offset}...")
                params = {
                    "$limit": limit,
                    "$offset": offset,
                    "$order": "date_occ DESC"  # Stable ordering for pagination
                }
                
                response = requests.get(LAPD_API_URL, params=params, timeout=timeout)
                response.raise_for_status()  # Raise exception for bad status codes
                
                batch = response.json()
                batch_size = len(batch)
                
                if batch_size > 0:
                    # Validate data structure
                    if not all(isinstance(record, dict) and 'date_occ' in record for record in batch):
                        print(f"Warning: Invalid data structure in batch at offset {offset}")
                        continue
                    
                    all_data.extend(batch)
                    total_fetched = len(all_data)
                    print(f"Fetched {batch_size} records. Total records so far: {total_fetched:,}")
                    
                    # Progress metrics
                    if 'X-Total-Count' in response.headers:
                        total_available = int(response.headers['X-Total-Count'])
                        progress = (total_fetched / total_available) * 100
                        print(f"Progress: {progress:.1f}% ({total_fetched:,}/{total_available:,})")
                    
                    # If we got less than the limit, we've reached the end
                    if batch_size < limit:
                        print("\nReached end of data")
                        break
                    
                    # Prepare for next batch
                    offset += batch_size
                else:
                    print("\nNo more data available")
                    break
                
                # Successful fetch, break retry loop
                break
                
            except requests.exceptions.Timeout:
                if attempt < retries - 1:
                    wait_time = (attempt + 1) * 5  # Progressive backoff
                    print(f"Timeout occurred. Retrying in {wait_time} seconds... (Attempt {attempt + 1}/{retries})")
                    time.sleep(wait_time)
                else:
                    print(f"Failed to fetch batch at offset {offset} after {retries} attempts")
                    break
                    
            except requests.exceptions.RequestException as e:
                print(f"Error fetching data at offset {offset}: {str(e)}")
                if attempt < retries - 1:
                    wait_time = (attempt + 1) * 5
                    print(f"Retrying in {wait_time} seconds... (Attempt {attempt + 1}/{retries})")
                    time.sleep(wait_time)
                else:
                    print(f"Failed to fetch batch at offset {offset} after {retries} attempts")
                    break
        
        # If we got less than the limit or had an unrecoverable error, we're done
        if not batch or batch_size < limit:
            break
    
    print(f"\nFetch complete. Total records fetched: {len(all_data):,}")
    
    # Enhanced data validation and debug info
    if len(all_data) > 0:
        dates = []
        future_dates = 0
        invalid_dates = 0
        now = datetime.now()
        
        for record in all_data:
            try:
                date = pd.to_datetime(record['date_occ'])
                if date > now:
                    future_dates += 1
                    print(f"Warning: Future date found: {date}")
                else:
                    dates.append(date)
            except (ValueError, TypeError):
                invalid_dates += 1
                print(f"Warning: Invalid date format: {record.get('date_occ')}")
        
        if dates:
            dates = pd.Series(dates)
            earliest = dates.min()
            latest = dates.max()
            print(f"\nDate Statistics:")
            print(f"Date range: {earliest} to {latest}")
            print(f"Records by year:")
            print(dates.dt.year.value_counts().sort_index())
            print(f"\nRecords in last 90 days: {len(dates[dates > (now - timedelta(days=90))])}")
            print(f"Invalid dates: {invalid_dates}")
            print(f"Future dates: {future_dates}")
            
            # Sample of recent records
            recent_records = dates[dates > (now - timedelta(days=90))]
            if not recent_records.empty:
                print("\nSample of 5 recent records:")
                for date in recent_records.head():
                    print(f"  {date}")
    
    return all_data

def process_crime_data(crime_data):
    """Process crime data into a pandas DataFrame"""
    print("\nProcessing crime data...")
    df = pd.DataFrame(crime_data)
    
    # Convert date and coordinates with explicit error handling
    print("Converting dates and calculating time weights...")
    df['date_occ'] = pd.to_datetime(df['date_occ'], errors='coerce')
    
    # Remove future dates and invalid dates
    now = pd.Timestamp.now()
    invalid_dates = df['date_occ'].isna().sum()
    future_dates = (df['date_occ'] > now).sum()
    
    print(f"Removed {invalid_dates} invalid dates and {future_dates} future dates")
    df = df[df['date_occ'].notna() & (df['date_occ'] <= now)]
    
    # Calculate time-based fields
    df['hour'] = df['date_occ'].dt.hour
    df['days_ago'] = (now - df['date_occ']).dt.total_seconds() / (24 * 3600)  # More precise calculation
    
    # Weight recent crimes more heavily (exponential decay with 180-day half-life)
    df['time_weight'] = np.exp(-df['days_ago'] * (np.log(2) / 180))
    
    # Convert coordinates
    df['lat'] = pd.to_numeric(df['lat'], errors='coerce')
    df['lon'] = pd.to_numeric(df['lon'], errors='coerce')
    
    # Remove invalid coordinates
    invalid_coords = df[['lat', 'lon']].isna().any(axis=1).sum()
    print(f"Removed {invalid_coords} records with invalid coordinates")
    
    # Filter to LA boundaries
    df = df[
        (df['lat'].between(33.70, 34.83)) & 
        (df['lon'].between(-118.67, -117.65))
    ]
    
    # Print summary statistics
    print("\nData Summary:")
    print(f"Total valid records: {len(df):,}")
    print(f"Date range: {df['date_occ'].min()} to {df['date_occ'].max()}")
    print(f"Records in last 90 days: {len(df[df['days_ago'] <= 90]):,}")
    print(f"Average incidents per day: {len(df) / df['days_ago'].max():.1f}")
    
    return df

def calculate_safety_metrics(crime_data):
    """Calculate safety metrics for each location and metric type"""
    print("\nCalculating safety metrics...")
    metrics = []
    
    # Grid the area into 0.01 degree squares (roughly 1km)
    lats = np.arange(33.70, 34.83, 0.01)
    lons = np.arange(-118.67, -117.65, 0.01)
    
    # Calculate citywide weighted crime rates for normalization
    print("\nCalculating citywide crime rates...")
    citywide_rates = {}
    citywide_stats = {}
    for metric_type, config in SAFETY_METRICS.items():
        crimes_of_type = crime_data[crime_data['crm_cd'].isin(config['crime_codes'])]
        if 'time_filter' in config:
            crimes_of_type = crimes_of_type[crimes_of_type['hour'].apply(config['time_filter'])]
        
        total_weighted_crimes = crimes_of_type['time_weight'].sum()
        total_recent_crimes = len(crimes_of_type[crimes_of_type['days_ago'] <= 90])
        total_crimes = len(crimes_of_type)
        
        citywide_rates[metric_type] = total_weighted_crimes / crime_data['time_weight'].sum() if len(crime_data) > 0 else 0
        citywide_stats[metric_type] = {
            'total_crimes': total_crimes,
            'recent_crimes': total_recent_crimes,
            'crimes_per_day': total_crimes / (crime_data['days_ago'].max() or 1)
        }
        
        print(f"\n{metric_type.title()} Crimes:")
        print(f"  Total incidents: {total_crimes:,}")
        print(f"  Recent incidents (90 days): {total_recent_crimes:,}")
        print(f"  Average per day: {citywide_stats[metric_type]['crimes_per_day']:.1f}")
    
    print("\nProcessing grid cells...")
    total_cells = len(lats) * len(lons)
    processed_cells = 0
    cells_with_data = 0
    
    for lat in lats:
        for lon in lons:
            processed_cells += 1
            if processed_cells % 100 == 0:
                print(f"Progress: {processed_cells}/{total_cells} cells processed ({cells_with_data} with data)")
            
            # Filter crimes in this grid cell (1km x 1km)
            mask = (
                (crime_data['lat'].between(lat, lat + 0.01)) &
                (crime_data['lon'].between(lon, lon + 0.01))
            )
            grid_crimes = crime_data[mask]
            
            if len(grid_crimes) == 0:
                continue
                
            cells_with_data += 1
            
            # Calculate metrics for each type
            for metric_type, config in SAFETY_METRICS.items():
                crimes = grid_crimes[grid_crimes['crm_cd'].isin(config['crime_codes'])]
                
                # Apply time filter for night safety
                if 'time_filter' in config:
                    crimes = crimes[crimes['hour'].apply(config['time_filter'])]
                
                if len(crimes) == 0:
                    continue
                
                # Calculate relative crime rate compared to citywide average using weighted crimes
                local_weighted_rate = crimes['time_weight'].sum() / grid_crimes['time_weight'].sum()
                relative_rate = local_weighted_rate / citywide_rates[metric_type] if citywide_rates[metric_type] > 0 else 1
                
                # Adjusted risk thresholds based on relative rate
                if relative_rate <= 0.3:  # Much safer than average
                    risk_level = "Low risk"
                    score = 8
                elif relative_rate <= 0.7:  # Somewhat safer than average
                    risk_level = "Medium risk"
                    score = 6
                elif relative_rate <= 1.5:  # Around average
                    risk_level = "High risk"
                    score = 4
                else:  # Significantly more dangerous than average
                    risk_level = "Maximum risk"
                    score = 2
                
                # Calculate recent and historical metrics
                recent_crimes = len(crimes[crimes['days_ago'] <= 90])
                total_crimes = len(crimes)
                days_covered = crimes['days_ago'].max() or 1
                
                # Calculate rates and trends
                recent_rate = recent_crimes / 90 * 365 if recent_crimes > 0 else 0  # Annualized recent rate
                historical_rate = total_crimes / days_covered * 365  # Annualized historical rate
                
                # Determine trend
                if recent_rate > historical_rate * 1.2:
                    trend = "↑"  # Increasing
                elif recent_rate < historical_rate * 0.8:
                    trend = "↓"  # Decreasing
                else:
                    trend = "→"  # Stable
                
                # Enhanced debug info
                debug_info = (
                    f" [Debug: {total_crimes} incidents "
                    f"({recent_crimes} in last 90 days) {trend}, "
                    f"{relative_rate:.2f}x city average]"  # Removed extra space and ~yearly rate
                )
                
                # Create timestamps in UTC format
                now_utc = datetime.now().astimezone()
                expires_utc = (now_utc + timedelta(days=30))
                
                metrics.append({
                    'id': str(uuid.uuid4()),
                    'latitude': float(lat + 0.005),  # Center of grid cell
                    'longitude': float(lon + 0.005),  # Center of grid cell
                    'metric_type': metric_type,
                    'score': score,
                    'question': config['question'],
                    'description': f"{risk_level}. {config['description']}{debug_info}",
                    'created_at': now_utc.isoformat(),
                    'expires_at': expires_utc.isoformat()
                })
    
    print(f"\nMetrics generation complete:")
    print(f"Processed {processed_cells:,} grid cells")
    print(f"Found data in {cells_with_data:,} cells")
    print(f"Generated {len(metrics):,} safety metrics")
    
    return metrics

def upload_to_supabase(metrics):
    """Upload safety metrics to Supabase"""
    if not metrics:
        print("No metrics to upload")
        return False
    
    try:
        # Clear existing metrics
        supabase.table('safety_metrics').delete().gte('score', 0).execute()
        
        # Upload in batches
        batch_size = 50
        for i in range(0, len(metrics), batch_size):
            batch = metrics[i:i+batch_size]
            supabase.table('safety_metrics').upsert(batch).execute()
        
        print(f"Successfully uploaded {len(metrics)} metrics")
        return True
    except Exception as e:
        print(f"Error uploading metrics: {str(e)}")
        return False

def main():
    """Main function to process safety metrics"""
    print("Fetching crime data...")
    crime_data = fetch_crime_data()
    
    if not crime_data:
        print("No crime data available. Exiting.")
        return
    
    print(f"Processing {len(crime_data)} crime records...")
    df = process_crime_data(crime_data)
    
    print("Calculating safety metrics...")
    metrics = calculate_safety_metrics(df)
    
    print(f"Uploading {len(metrics)} metrics to Supabase...")
    success = upload_to_supabase(metrics)
    
    if success:
        print("Safety metrics processing complete!")
    else:
        print("Error uploading to Supabase.")

if __name__ == "__main__":
    main() 