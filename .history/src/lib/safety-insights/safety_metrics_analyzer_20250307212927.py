import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from supabase import create_client, Client
import os
from dotenv import load_dotenv
import time
import logging

# Load environment variables
load_dotenv('.env.local')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Supabase client
supabase: Client = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

class SafetyMetricsAnalyzer:
    def __init__(self):
        self.LA_API_URL = "https://data.lacity.org/resource/2nrs-mtv8.json"
        self.metrics = ["night_safety", "vehicle_safety", "child_safety", "transit_safety", "women_safety"]
        
    def fetch_la_crime_data(self, offset=0, limit=50000):
        """Fetch crime data from LA API with pagination"""
        try:
            params = {
                "$limit": limit,
                "$offset": offset,
                "$where": f"date_occ >= '{(datetime.now() - timedelta(days=365)).strftime('%Y-%m-%dT%H:%M:%S.%f')}'"
            }
            response = requests.get(self.LA_API_URL, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching LA crime data: {e}")
            return []

    def categorize_crimes(self, crimes_df):
        """Map crimes to safety categories"""
        # Define crime mappings for each safety metric
        crime_mappings = {
            'night_safety': ['ROBBERY', 'ASSAULT WITH DEADLY WEAPON', 'BATTERY - SIMPLE ASSAULT'],
            'vehicle_safety': ['VEHICLE - STOLEN', 'BURGLARY FROM VEHICLE', 'VANDALISM'],
            'child_safety': ['CHILD ABUSE', 'KIDNAPPING', 'CHILD NEGLECT'],
            'transit_safety': ['PICKPOCKET', 'PURSE SNATCHING', 'ROBBERY'],
            'women_safety': ['INTIMATE PARTNER - SIMPLE ASSAULT', 'CRIMINAL THREATS', 'STALKING']
        }

        # Calculate scores for each category
        scores = {}
        for metric, crime_types in crime_mappings.items():
            metric_crimes = crimes_df[crimes_df['crm_cd_desc'].isin(crime_types)]
            scores[metric] = self.calculate_safety_score(metric_crimes)
            
        return scores

    def calculate_safety_score(self, metric_crimes):
        """Calculate safety score on a scale of 1-10"""
        if metric_crimes.empty:
            return 10
        
        # Calculate crime rate per 1000 residents
        total_crimes = len(metric_crimes)
        # Using log scale to handle outliers
        score = 10 - min(9, np.log1p(total_crimes))
        return round(max(1, score), 1)

    def analyze_district_safety(self):
        """Analyze safety metrics for all districts"""
        all_crimes = []
        offset = 0
        
        # Fetch all crime data with pagination
        while True:
            crimes = self.fetch_la_crime_data(offset=offset)
            if not crimes:
                break
            all_crimes.extend(crimes)
            offset += 50000
            time.sleep(1)  # Rate limiting

        if not all_crimes:
            logger.error("No crime data fetched")
            return

        # Convert to DataFrame
        crimes_df = pd.DataFrame(all_crimes)
        
        # Group by district and calculate metrics
        districts = crimes_df['area_name'].unique()
        district_metrics = []

        for district in districts:
            district_crimes = crimes_df[crimes_df['area_name'] == district]
            scores = self.categorize_crimes(district_crimes)
            
            district_metrics.append({
                'district': district,
                'city': 'Los Angeles',
                'metrics': scores,
                'updated_at': datetime.now().isoformat()
            })

        return district_metrics

    def update_database(self):
        """Update safety metrics in the database"""
        try:
            metrics = self.analyze_district_safety()
            if not metrics:
                return
            
            # Update database
            for district_metric in metrics:
                supabase.table('safety_metrics').upsert(
                    {
                        'district': district_metric['district'],
                        'city': district_metric['city'],
                        'night_safety': district_metric['metrics']['night_safety'],
                        'vehicle_safety': district_metric['metrics']['vehicle_safety'],
                        'child_safety': district_metric['metrics']['child_safety'],
                        'transit_safety': district_metric['metrics']['transit_safety'],
                        'women_safety': district_metric['metrics']['women_safety'],
                        'updated_at': district_metric['updated_at']
                    }
                ).execute()
            
            logger.info("Safety metrics updated successfully")
            
        except Exception as e:
            logger.error(f"Error updating safety metrics: {e}")

if __name__ == "__main__":
    analyzer = SafetyMetricsAnalyzer()
    analyzer.update_database() 