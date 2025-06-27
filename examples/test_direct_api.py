#!/usr/bin/env python3
"""
Direct test of the RateSpot API to verify it works
"""

import urllib.request
import urllib.parse
import json
from datetime import datetime

def test_direct_api():
    """Test the RateSpot API directly using the curl example"""
    
    print("🚀 Testing RateSpot API directly")
    print("=" * 50)
    
    # Get API key from environment
    import os
    api_key = os.getenv('RATESPOT_API_KEY')
    if not api_key:
        # Try to read from .env file
        try:
            with open('../.env', 'r') as f:
                for line in f:
                    if line.startswith('RATESPOT_API_KEY='):
                        api_key = line.split('=', 1)[1].strip()
                        break
        except FileNotFoundError:
            pass
    
    if not api_key:
        print("❌ RATESPOT_API_KEY not found in environment or .env file")
        print("Please set the RATESPOT_API_KEY environment variable or create a .env file")
        return False

    # API parameters from the curl example
    params = {
        "apikey": api_key,
        "purpose": "purchase",
        "zipcode": "90210",
        "property_value": "500000",
        "down_payment": "20",
        "mortgage_balance": "80",
        "credit_score": "790",
        "fha": "1",
        "va": "1",
        "property_type": "single_family",
        "property_use": "primary"
    }
    
    url = "https://api.ratespot.io/v1/mortgage_products"
    
    try:
        # Build URL with parameters
        query_string = urllib.parse.urlencode(params)
        full_url = f"{url}?{query_string}"
        
        print(f"📡 Making request to: {full_url}")
        
        # Create request with headers
        req = urllib.request.Request(
            full_url,
            headers={
                'Accept': 'text/event-stream',
                'Cache-Control': 'no-cache'
            }
        )
        
        # Make the request
        with urllib.request.urlopen(req) as response:
            print(f"📊 Response status: {response.getcode()}")
            print(f"📄 Response headers: {dict(response.headers)}")
            
            if response.getcode() == 200:
                print("✅ API request successful!")
                
                # Read the response
                content = response.read().decode('utf-8')
                print(f"📝 Raw content preview: {content[:500]}...")
                
                print(f"\n📄 Full response length: {len(content)} characters")
                
                # Parse Server-Sent Events
                events = []
                lines = content.split('\n')
                current_event = {}
                
                for line in lines:
                    if line.startswith('event:'):
                        current_event['event'] = line[6:].strip()
                    elif line.startswith('data:'):
                        try:
                            current_event['data'] = json.loads(line[5:].strip())
                            events.append(dict(current_event))
                            current_event = {}
                        except json.JSONDecodeError as e:
                            print(f"⚠️ JSON decode error: {e}")
                            print(f"   Line: {line}")
                
                print(f"\n🎯 Parsed {len(events)} events")
                for i, event in enumerate(events[:3]):  # Show first 3 events
                    print(f"   Event {i+1}: {event}")
                
                if len(events) > 3:
                    print(f"   ... and {len(events) - 3} more events")
                
                # Save results
                result_data = {
                    "test_timestamp": datetime.now().isoformat(),
                    "api_url": url,
                    "parameters": params,
                    "status_code": response.getcode(),
                    "headers": dict(response.headers),
                    "raw_content": content,
                    "parsed_events": events,
                    "success": True
                }
                
                with open("data/direct_api_test_results.json", "w") as f:
                    json.dump(result_data, f, indent=2)
                
                print(f"\n💾 Results saved to data/direct_api_test_results.json")
                return True
            else:
                print(f"❌ API request failed with status {response.getcode()}")
                content = response.read().decode('utf-8')
                print(f"📄 Response: {content}")
                return False
            
    except Exception as e:
        print(f"💥 Error making API request: {e}")
        return False

if __name__ == "__main__":
    import os
    os.makedirs("data", exist_ok=True)
    success = test_direct_api()
    exit(0 if success else 1)
