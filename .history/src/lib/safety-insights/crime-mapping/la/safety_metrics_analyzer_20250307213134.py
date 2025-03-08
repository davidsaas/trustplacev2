import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
from supabase import create_client, Client
from typing import Dict, List, Tuple
import logging
import time

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
        self.LA_CRIME_API = "https://data.lacity.org/resource/2nrs-mtv8.json"
        self.BATCH_SIZE = 50000  # Maximum records per request
        self.METRICS = {
            'night_safety': self._calculate_night_safety,
            'vehicle_safety': self._calculate_vehicle_safety,
            'child_safety': self._calculate_child_safety,
            'transit_safety': self._calculate_transit_safety,
            'women_safety': self._calculate_women_safety
        }

    def fetch_crime_data(self) -> pd.DataFrame:
        """Fetches crime data from LA API with pagination"""
        all_data = []
        offset = 0
        
        while True:
            try:
                params = {
                    '$limit': self.BATCH_SIZE,
                    '$offset': offset,
                    '$where': f"date_occ >= '{(datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')}'"
                }
                
                response = requests.get(self.LA_CRIME_API, params=params)
                response.raise_for_status()
                
                batch_data = response.json()
                if not batch_data:
                    break
                    
                all_data.extend(batch_data)
                offset += self.BATCH_SIZE
                
                logger.info(f"Fetched {len(all_data)} records so far...")
                
            except Exception as e:
                logger.error(f"Error fetching data: {str(e)}")
                break
                
        return pd.DataFrame(all_data)

    def _calculate_night_safety(self, df: pd.DataFrame, district: str) -> float:
        """Calculate night safety score based on crimes occurring after dark"""
        night_crimes = df[
            (df['district'] == district) & 
            (pd.to_datetime(df['time_occ']).dt.hour >= 18) |
            (pd.to_datetime(df['time_occ']).dt.hour <= 6)
        ]
        return self._normalize_score(len(night_crimes))

    def _calculate_vehicle_safety(self, df: pd.DataFrame, district: str) -> float:
        """Calculate vehicle safety score based on vehicle-related crimes"""
        vehicle_crimes = df[
            (df['district'] == district) & 
            (df['crm_cd_desc'].str.contains('VEHICLE|AUTO|CAR', case=False, na=False))
        ]
        return self._normalize_score(len(vehicle_crimes))

    def _calculate_child_safety(self, df: pd.DataFrame, district: str) -> float:
        """Calculate child safety score"""
        child_related_crimes = df[
            (df['district'] == district) & 
            (df['crm_cd_desc'].str.contains('CHILD|MINOR|SCHOOL', case=False, na=False))
        ]
        return self._normalize_score(len(child_related_crimes))

    def _calculate_transit_safety(self, df: pd.DataFrame, district: str) -> float:
        """Calculate transit safety score"""
        transit_crimes = df[
            (df['district'] == district) & 
            (df['premis_desc'].str.contains('TRANSIT|BUS|TRAIN|METRO', case=False, na=False))
        ]
        return self._normalize_score(len(transit_crimes))

    def _calculate_women_safety(self, df: pd.DataFrame, district: str) -> float:
        """Calculate women's safety score"""
        women_related_crimes = df[
            (df['district'] == district) & 
            (df['crm_cd_desc'].str.contains('RAPE|ASSAULT|HARASSMENT', case=False, na=False))
        ]
        return self._normalize_score(len(women_related_crimes))

    def _normalize_score(self, crime_count: int) -> float:
        """Convert crime counts to a 1-10 safety score using logarithmic scaling"""
        if crime_count == 0:
            return 10.0
        score = 10 - np.log1p(crime_count)
        return max(1.0, min(10.0, score))

    def calculate_district_metrics(self, df: pd.DataFrame) -> List[Dict]:
        """Calculate all safety metrics for each district"""
        districts = df['district'].unique()
        all_metrics = []
        
        for district in districts:
            metrics = {
                'district': district,
                'last_updated': datetime.now().isoformat(),
            }
            
            for metric_name, calc_func in self.METRICS.items():
                metrics[metric_name] = calc_func(df, district)
            
            all_metrics.append(metrics)
            
        return all_metrics

    def update_database(self, metrics: List[Dict]):
        """Update the safety metrics in Supabase"""
        try:
            # First, delete existing metrics
            supabase.table('safety_metrics').delete().execute()
            
            # Then insert new metrics
            for metric in metrics:
                supabase.table('safety_metrics').insert(metric).execute()
                
            logger.info("Successfully updated safety metrics in database")
            
        except Exception as e:
            logger.error(f"Error updating database: {str(e)}")

def main():
    analyzer = SafetyMetricsAnalyzer()
    
    try:
        # Fetch and process crime data
        df = analyzer.fetch_crime_data()
        
        # Calculate metrics
        metrics = analyzer.calculate_district_metrics(df)
        
        # Update database
        analyzer.update_database(metrics)
        
        logger.info("Safety metrics analysis completed successfully")
        
    except Exception as e:
        logger.error(f"Error in main execution: {str(e)}")

if __name__ == "__main__":
    main() 