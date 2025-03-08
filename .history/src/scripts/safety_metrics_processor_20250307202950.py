def update_safety_metrics_database(district_metrics, city='Los Angeles'):
    """Update the safety_metrics table in the database using Supabase REST API."""
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
    }
    
    success_count = 0
    error_count = 0
    
    for district, metrics in district_metrics.items():
        # Get lat/lng for this district
        lat = LA_DISTRICTS.get(district, {}).get('lat')
        lng = LA_DISTRICTS.get(district, {}).get('lng')
        
        # Format the data for Supabase
        data = {
            'district': district,
            'city': city,
            'metrics': metrics,
            'lastupdated': datetime.now().isoformat(),  # Using lastupdated to match the actual column name
            'latitude': lat,
            'longitude': lng
        }
        
        # Check if record exists first
        check_url = f"{SUPABASE_URL}/rest/v1/safety_metrics?district=eq.{district}&city=eq.{city}"
        check_response = requests.get(check_url, headers=headers)
        
        if check_response.status_code == 200 and len(check_response.json()) > 0:
            # Record exists, update it
            record_id = check_response.json()[0]['id']
            update_url = f"{SUPABASE_URL}/rest/v1/safety_metrics?id=eq.{record_id}"
            response = requests.patch(update_url, headers=headers, json=data)
        else:
            # Record doesn't exist, insert new one
            insert_url = f"{SUPABASE_URL}/rest/v1/safety_metrics"
            response = requests.post(insert_url, headers=headers, json=data)
        
        if response.status_code in [200, 201, 204]:
            success_count += 1
        else:
            error_count += 1
            logger.error(f"Error updating district {district}: {response.status_code} - {response.text}")
    
    logger.info(f"Database update completed: {success_count} successes, {error_count} errors")
    return success_count > 0 