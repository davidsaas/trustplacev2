import schedule
import time
from safety_metrics_analyzer import SafetyMetricsAnalyzer
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_safety_metrics():
    """Run the safety metrics update"""
    logger.info("Starting scheduled safety metrics update...")
    analyzer = SafetyMetricsAnalyzer()
    analyzer.update_database()
    logger.info("Scheduled safety metrics update completed")

def main():
    # Run immediately on start
    update_safety_metrics()
    
    # Schedule to run every 30 days
    schedule.every(30).days.do(update_safety_metrics)
    
    # Keep the script running
    while True:
        schedule.run_pending()
        time.sleep(1)

if __name__ == "__main__":
    main() 