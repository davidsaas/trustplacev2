#!/usr/bin/env python3
import os
import json
import time
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
import base64
from dotenv import load_dotenv
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables from .env.local
env_path = Path('../..') / '.env.local'
load_dotenv(dotenv_path=env_path)

# Get Supabase credentials from environment
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Missing Supabase credentials in .env.local")
    raise ValueError("Supabase credentials not found")

logger.info(f"Using Supabase URL: {SUPABASE_URL}")

# LA districts with their approximate geographical centers
LA_DISTRICTS = {
    'Central': {'lat': 34.0511, 'lng': -118.2459},
    'Rampart': {'lat': 34.0617, 'lng': -118.2756},
    'Southwest': {'lat': 34.0118, 'lng': -118.3073},
    'Hollywood': {'lat': 34.0928, 'lng': -118.3287},
    'Harbor': {'lat': 33.7369, 'lng': -118.2920},
    'West LA': {'lat': 34.0462, 'lng': -118.4473},
    'Van Nuys': {'lat': 34.1866, 'lng': -118.4487},
    'West Valley': {'lat': 34.1987, 'lng': -118.5665},
    'Northeast': {'lat': 34.1156, 'lng': -118.2076},
    'Devonshire': {'lat': 34.2574, 'lng': -118.5361},
    'Southeast': {'lat': 33.9380, 'lng': -118.2582},
    'Mission': {'lat': 34.2721, 'lng': -118.4137},
    'Pacific': {'lat': 33.9950, 'lng': -118.4623},
    'Olympic': {'lat': 34.0512, 'lng': -118.2953},
    '77th Street': {'lat': 33.9643, 'lng': -118.2928},
    'Wilshire': {'lat': 34.0641, 'lng': -118.3533},
    'Newton': {'lat': 34.0086, 'lng': -118.2475},
    'Foothill': {'lat': 34.2532, 'lng': -118.3067},
    'N Hollywood': {'lat': 34.1718, 'lng': -118.3814},
    'Topanga': {'lat': 34.2147, 'lng': -118.6057},
    'Hollenbeck': {'lat': 34.0417, 'lng': -118.1965}
}

# Crime mapping to our safety metrics
CRIME_MAPPING = {
    # Night Safety - crimes happening after dark that affect pedestrians
    'night_safety': [
        'ROBBERY', 'ASSAULT WITH DEADLY WEAPON', 'BATTERY - SIMPLE ASSAULT',
        'CRIMINAL HOMICIDE', 'RAPE', 'KIDNAPPING', 'SHOTS FIRED AT MOVING VEHICLE',
        'STREET ROBBERY', 'ASSAULT WITH DEADLY WEAPON ON POLICE OFFICER'
    ],
    
    # Vehicle Safety - car theft and break-ins
    'vehicle_safety': [
        'VEHICLE - STOLEN', 'THEFT FROM MOTOR VEHICLE', 'BURGLARY FROM VEHICLE',
        'GRAND THEFT AUTO', 'VANDALISM FELONY ($400 & OVER, ALL CHURCH VANDALISMS)',
        'VANDALISM MISDEAMEANOR ($399 OR UNDER)', 'BIKE - STOLEN', 'THEFT FROM MOTOR VEHICLE - GRAND ($950.01 & OVER)',
        'THEFT FROM MOTOR VEHICLE - PETTY ($950 & UNDER)'
    ],
    
    # Child Safety - crimes that could affect children
    'child_safety': [
        'CHILD ABUSE (PHYSICAL) - AGGRAVATED ASSAULT', 'CHILD NEGLECT', 'CHILD ABUSE (PHYSICAL) - SIMPLE ASSAULT',
        'CHILD PORNOGRAPHY', 'CHILD STEALING', 'CHILD ABANDONMENT', 'DRUGS, TO A MINOR',
        'FAILURE TO PROVIDE CARE FOR CHILD'
    ],
    
    # Transit Safety - crimes near transit locations
    'transit_safety': [
        'PURSE SNATCHING', 'PICKPOCKET', 'THEFT PLAIN - PETTY ($950 & UNDER)',
        'THEFT-GRAND ($950.01 & OVER)EXCPT,GUNS,FOWL,LIVESTK,PROD',
        'ROBBERY', 'ASSAULT WITH DEADLY WEAPON', 'BATTERY - SIMPLE ASSAULT'
    ],
    
    # Women's Safety - crimes disproportionately affecting women
    'womens_safety': [
        'RAPE, FORCIBLE', 'SEXUAL PENETRATION W/FOREIGN OBJECT', 'INTIMATE PARTNER - SIMPLE ASSAULT',
        'INTIMATE PARTNER - AGGRAVATED ASSAULT', 'BATTERY WITH SEXUAL CONTACT',
        'SEX, UNLAWFUL', 'STALKING', 'CRIMINAL THREATS - NO WEAPON DISPLAYED',
        'INDECENT EXPOSURE', 'LEWD CONDUCT', 'LETTERS, LEWD'
    ]
}

def supabase_request(endpoint, method='GET', data=None, auth_key=None):
    """Make a request to the Supabase REST API."""
    url = f"{SUPABASE_URL}/{endpoint}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {auth_key or SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    
    try:
        if method == 'GET':
            response = requests.get(url, headers=headers)
        elif method == 'POST':
            response = requests.post(url, headers=headers, json=data)
        elif method == 'PUT':
            response = requests.put(url, headers=headers, json=data)
        elif method == 'DELETE':
            response = requests.delete(url, headers=headers)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
            
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Supabase API request error: {e}")
        if hasattr(e.response, 'text'):
            logger.error(f"Response: {e.response.text}")
        raise

def fetch_crime_data(city='Los Angeles'):
    """Fetch crime data from the LAPD API."""
    try:
        if city != 'Los Angeles':
            logger.error(f"City {city} not supported yet")
            return None
            
        # LA crime data API endpoint
        api_url = "https://data.lacity.org/resource/2nrs-mtv8.json"
        
        # Get data from the past 12 months
        one_year_ago = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%dT00:00:00.000')
        
        all_data = []
        offset = 0
        limit = 50000  # Maximum allowed for SODA 2.1 endpoints
        
        while True:
            params = {
                '$where': f"date_occ >= '{one_year_ago}'",
                '$limit': limit,
                '$offset': offset
            }
            
            logger.info(f"Fetching data with offset {offset}")
            response = requests.get(api_url, params=params)
            
            if response.status_code != 200:
                logger.error(f"API error: {response.status_code} - {response.text}")
                break
                
            data = response.json()
            if not data:  # No more data
                break
                
            all_data.extend(data)
            logger.info(f"Fetched {len(data)} records, total: {len(all_data)}")
            
            if len(data) < limit:  # Last batch
                break
                
            offset += limit
            time.sleep(1)  # Avoid hitting rate limits
        
        logger.info(f"Total crime records fetched: {len(all_data)}")
        return all_data
        
    except Exception as e:
        logger.error(f"Error fetching crime data: {e}")
        return None

def process_crime_data(crime_data):
    """Process crime data into a pandas DataFrame and calculate safety metrics."""
    if not crime_data:
        return None
        
    df = pd.DataFrame(crime_data)
    
    # Ensure required columns exist
    required_cols = ['area', 'crm_cd_desc', 'date_occ', 'time_occ', 'lat', 'lon']
    for col in required_cols:
        if col not in df.columns:
            logger.error(f"Required column '{col}' not found in data")
            return None
    
    # Convert columns to appropriate types
    df['lat'] = pd.to_numeric(df['lat'], errors='coerce')
    df['lon'] = pd.to_numeric(df['lon'], errors='coerce')
    
    # Parse date and time
    if 'date_occ' in df.columns:
        df['date_occ'] = pd.to_datetime(df['date_occ'], errors='coerce')
    
    if 'time_occ' in df.columns:
        # LAPD time format is typically a 4-digit military time (e.g., 1430 for 2:30 PM)
        df['time_occ'] = df['time_occ'].astype(str).str.zfill(4)
        df['hour'] = df['time_occ'].str[:2].astype(int)
        
        # Flag for night crimes (between 6 PM and 6 AM)
        df['is_night'] = ((df['hour'] >= 18) | (df['hour'] < 6))
    
    # Process by district
    district_metrics = {}
    
    for area_name, records in df.groupby('area'):
        # Convert LAPD area numbers to district names if needed
        district = area_name
        
        metrics = {
            'night_safety': calculate_safety_score(records, 'night_safety', is_night=True),
            'vehicle_safety': calculate_safety_score(records, 'vehicle_safety'),
            'child_safety': calculate_safety_score(records, 'child_safety'),
            'transit_safety': calculate_safety_score(records, 'transit_safety'),
            'womens_safety': calculate_safety_score(records, 'womens_safety')
        }
        
        # Format metrics for frontend display
        formatted_metrics = format_metrics_for_display(metrics)
        district_metrics[district] = formatted_metrics
    
    return district_metrics

def calculate_safety_score(df, metric_type, is_night=False):
    """
    Calculate safety score for a specific metric type.
    
    Args:
        df: DataFrame with crime records for a district
        metric_type: Type of safety metric to calculate
        is_night: Whether to filter for nighttime crimes only
        
    Returns:
        Raw count of incidents for this metric type
    """
    # Filter crimes by type
    relevant_crimes = CRIME_MAPPING.get(metric_type, [])
    mask = df['crm_cd_desc'].isin(relevant_crimes)
    
    # Additional night filter if applicable
    if is_night and 'is_night' in df.columns:
        mask = mask & df['is_night']
    
    # Count incidents
    count = df[mask].shape[0]
    
    return count

def normalize_scores(district_metrics, city_population=3990456):
    """
    Normalize raw crime counts to safety scores on a 1-10 scale.
    Los Angeles population is approximately 3,990,456 (2020 census).
    """
    # Extract raw counts for each metric
    metric_types = ['night_safety', 'vehicle_safety', 'child_safety', 'transit_safety', 'womens_safety']
    raw_counts = {metric: [] for metric in metric_types}
    
    for district, metrics in district_metrics.items():
        for metric in metric_types:
            raw_counts[metric].append(metrics[metric]['raw_count'])
    
    # Convert to numpy arrays for calculation
    for metric in metric_types:
        raw_counts[metric] = np.array(raw_counts[metric])
    
    # Normalize and calculate safety scores (inverted, higher is safer)
    normalized_metrics = district_metrics.copy()
    
    for district_idx, (district, metrics) in enumerate(normalized_metrics.items()):
        for metric in metric_types:
            raw_count = metrics[metric]['raw_count']
            
            # Create percentile rank (0-1 scale where 0 is worst, 1 is best)
            # We invert this because higher crime count = lower safety
            counts_array = raw_counts[metric]
            if len(counts_array) > 0 and counts_array.max() > 0:
                percentile = 1.0 - (raw_count / counts_array.max())
            else:
                percentile = 1.0  # Default to highest safety if no crimes
            
            # Convert to 1-10 scale
            safety_score = 1 + (percentile * 9)
            safety_score = round(safety_score, 1)  # Round to one decimal
            
            # Update the metrics
            normalized_metrics[district][metric]['score'] = safety_score
    
    return normalized_metrics

def format_metrics_for_display(metrics):
    """Format raw metrics into user-friendly display format."""
    formatted = {}
    
    # Night Safety
    formatted['night_safety'] = {
        'raw_count': metrics['night_safety'],
        'title': "Can I go outside after dark?",
        'score': 0  # Will be calculated during normalization
    }
    
    # Vehicle Safety
    formatted['vehicle_safety'] = {
        'raw_count': metrics['vehicle_safety'],
        'title': "Can I park here safely?",
        'score': 0
    }
    
    # Child Safety
    formatted['child_safety'] = {
        'raw_count': metrics['child_safety'],
        'title': "Are kids safe here?",
        'score': 0
    }
    
    # Transit Safety
    formatted['transit_safety'] = {
        'raw_count': metrics['transit_safety'],
        'title': "Is it safe to use public transport?",
        'score': 0
    }
    
    # Women's Safety
    formatted['womens_safety'] = {
        'raw_count': metrics['womens_safety'],
        'title': "Would I be harassed here?",
        'score': 0
    }
    
    return formatted

def generate_descriptions(district_metrics):
    """Generate textual descriptions based on safety scores."""
    description_templates = {
        'night_safety': {
            'high': "This area generally has fewer nighttime safety incidents compared to other parts of the city. Always take normal precautions.",
            'medium': "Moderate caution advised after dark. Some nighttime incidents reported in this area.",
            'low': "Exercise increased caution at night. This area has more reported nighttime safety incidents than average."
        },
        'vehicle_safety': {
            'high': "Vehicle-related crimes are relatively less common here. Standard precautions for securing your vehicle are still recommended.",
            'medium': "Take normal precautions with your vehicle. Don't leave valuables visible and use secure parking when available.",
            'low': "Vehicle crimes are more frequent in this area. Extra precautions recommended for securing your vehicle."
        },
        'child_safety': {
            'high': "This area reports fewer incidents related to child safety concerns compared to other districts.",
            'medium': "Standard supervision recommended for children in this area. Typical urban safety awareness advised.",
            'low': "Exercise increased vigilance with children in this area. Higher rates of incidents affecting child safety reported."
        },
        'transit_safety': {
            'high': "Public transportation areas appear to have fewer safety incidents in this district.",
            'medium': "Normal caution advised when using public transportation in this area.",
            'low': "Be extra alert when using public transportation. Higher rates of incidents reported around transit areas."
        },
        'womens_safety': {
            'high': "Reports of harassment and gender-based incidents are comparatively lower in this district.",
            'medium': "Standard awareness advised. Some incidents of harassment reported in this area.",
            'low': "Higher reports of harassment and gender-based incidents. Increased awareness recommended."
        }
    }
    
    for district, metrics in district_metrics.items():
        for metric_type in metrics:
            score = metrics[metric_type]['score']
            
            # Determine description category based on score
            if score >= 7.0:
                category = 'high'
            elif score >= 4.0:
                category = 'medium'
            else:
                category = 'low'
            
            # Add description to the metrics
            metrics[metric_type]['description'] = description_templates[metric_type][category]
    
    return district_metrics

def update_safety_metrics_database(district_metrics, city='Los Angeles'):
    """Update the safety_metrics table in the Supabase database."""
    try:
        for district, metrics in district_metrics.items():
            # Get lat/lng for this district
            lat = LA_DISTRICTS.get(district, {}).get('lat')
            lng = LA_DISTRICTS.get(district, {}).get('lng')
            
            # Convert metrics to JSON
            metrics_json = metrics
            
            # Check if record exists
            query_params = f"district=eq.{district}&city=eq.{city}"
            existing_records = supabase_request(f"rest/v1/safety_metrics?{query_params}&select=id", method='GET')
            
            if existing_records and len(existing_records) > 0:
                # Update existing record
                record_id = existing_records[0]['id']
                update_data = {
                    'metrics': metrics_json,
                    'lastupdated': datetime.now().isoformat(),
                    'latitude': lat,
                    'longitude': lng
                }
                
                supabase_request(
                    f"rest/v1/safety_metrics?id=eq.{record_id}",
                    method='PATCH',
                    data=update_data
                )
                logger.info(f"Updated safety metrics for {district}, {city}")
            else:
                # Insert new record
                insert_data = {
                    'district': district,
                    'city': city,
                    'metrics': metrics_json,
                    'latitude': lat,
                    'longitude': lng,
                    'lastupdated': datetime.now().isoformat()
                }
                
                supabase_request(
                    "rest/v1/safety_metrics",
                    method='POST',
                    data=insert_data
                )
                logger.info(f"Inserted new safety metrics for {district}, {city}")
        
        logger.info(f"Successfully updated safety metrics for {len(district_metrics)} districts in {city}")
        return True
    except Exception as e:
        logger.error(f"Database update error: {e}")
        return False

def process_safety_metrics(city='Los Angeles'):
    """Main function to process safety metrics."""
    logger.info(f"Starting safety metrics processing for {city}")
    
    # Step 1: Fetch crime data
    crime_data = fetch_crime_data(city)
    if not crime_data:
        logger.error("Failed to fetch crime data")
        return False
    
    # Step 2: Process crime data
    district_metrics = process_crime_data(crime_data)
    if not district_metrics:
        logger.error("Failed to process crime data")
        return False
    
    # Step 3: Normalize scores
    normalized_metrics = normalize_scores(district_metrics)
    
    # Step 4: Generate descriptions
    final_metrics = generate_descriptions(normalized_metrics)
    
    # Step 5: Update database
    success = update_safety_metrics_database(final_metrics, city)
    
    if success:
        logger.info(f"Completed safety metrics processing for {city}")
    else:
        logger.error(f"Failed to update safety metrics in database for {city}")
    
    return success

if __name__ == "__main__":
    # Process safety metrics for Los Angeles
    process_safety_metrics('Los Angeles') 