import schedule
import time
from safety_metrics_analyzer import main as run_analysis
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def job():
    logger.info("Starting scheduled safety metrics update...")
    run_analysis()
    logger.info("Completed scheduled safety metrics update")

def run_scheduler():
    # Run immediately on start
    job()
    
    # Schedule to run every 30 days
    schedule.every(30).days.do(job)
    
    while True:
        schedule.run_pending()
        time.sleep(3600)  # Check every hour

if __name__ == "__main__":
    run_scheduler() 