#!/usr/bin/env python3
"""
Debug script to test the exact API parameters that work vs don't work
"""

import urllib.request
import urllib.parse
import json
import os

def test_api_call(params, description):
    """Test an API call with given parameters"""
    print(f"\n🧪 Testing: {description}")
    print("=" * 60)
    
    # Get API key
    # Get API key from environment
    api_key = os.getenv('RATESPOT_API_KEY')
    if not api_key:
        # Try to read from .env file
        try:
            with open('.env', 'r') as f:
                for line in f:
                    if line.startswith('RATESPOT_API_KEY='):
                        api_key = line.split('=', 1)[1].strip()
                        break
        except FileNotFoundError:
            pass
    
    if not api_key:
        print("❌ RATESPOT_API_KEY not found in environment or .env file")
        print("Please set the RATESPOT_API_KEY environment variable or create a .env file")
        return
    
    # Add API key to params
    test_params = dict(params)
    test_params["apikey"] = api_key
    
    print("📋 Parameters being sent:")
    for key, value in test_params.items():
        print(f"   {key}: {value}")
    
    url = "https://api.ratespot.io/v1/mortgage_products"
    
    try:
        # Build URL with parameters
        query_string = urllib.parse.urlencode(test_params)
        full_url = f"{url}?{query_string}"
        
        print(f"\n📡 Full URL: {full_url}")
        
        # Create request
        req = urllib.request.Request(
            full_url,
            headers={
                'Accept': 'text/event-stream',
                'Cache-Control': 'no-cache'
            }
        )
        
        # Make the request
        with urllib.request.urlopen(req) as response:
            if response.getcode() == 200:
                print("✅ SUCCESS!")
                content = response.read().decode('utf-8')
                
                # Count events
                lines = content.split('\n')
                event_count = sum(1 for line in lines if line.startswith('event: mortgage_product'))
                print(f"📊 Found {event_count} mortgage products")
                return True
            else:
                print(f"❌ FAILED: {response.getcode()}")
                return False
                
    except Exception as e:
        print(f"💥 ERROR: {e}")
        return False

def main():
    print("🔍 API Parameter Debugging")
    print("=" * 60)
    
    # Test 1: Known working parameters (from our successful test)
    working_params = {
        "purpose": "purchase",
        "zipcode": "94949",
        "property_value": "625000",
        "down_payment": "20",
        "mortgage_balance": "80",
        "credit_score": "740",
        "fha": "1",
        "va": "1",
        "property_type": "single_family",
        "property_use": "primary"
    }
    
    # Test 2: What the MCP server is probably sending (problematic)
    mcp_params = {
        "purpose": "purchase",
        "zipcode": "94949",
        "property_value": "625000",
        "down_payment": "20",  # 125000/625000 = 20%
        "mortgage_balance": "80",  # 100% - 20% = 80%
        "credit_score": "740",
        "fha": "1",
        "va": "1",
        "property_type": "single_family",
        "property_use": "primary"
    }
    
    # Test 3: Try with different parameter combinations
    test_params_3 = {
        "purpose": "purchase",
        "zipcode": "94949",
        "property_value": 625000,  # As number
        "down_payment": 20,        # As number
        "mortgage_balance": 80,    # As number
        "credit_score": 740,       # As number
        "fha": 1,                  # As number
        "va": 1,                   # As number
        "property_type": "single_family",
        "property_use": "primary"
    }
    
    # Test 4: Minimal parameters
    minimal_params = {
        "purpose": "purchase",
        "zipcode": "94949",
        "property_value": "625000",
        "down_payment": "20",
        "mortgage_balance": "80",
        "credit_score": "740"
    }
    
    # Run tests
    results = []
    results.append(test_api_call(working_params, "Known working parameters (all strings)"))
    results.append(test_api_call(mcp_params, "MCP server parameters (strings)"))
    results.append(test_api_call(test_params_3, "Mixed types (numbers and strings)"))
    results.append(test_api_call(minimal_params, "Minimal parameters"))
    
    print("\n" + "=" * 60)
    print("🎯 SUMMARY:")
    test_names = [
        "Known working (strings)",
        "MCP server (strings)", 
        "Mixed types",
        "Minimal parameters"
    ]
    
    for i, (name, result) in enumerate(zip(test_names, results)):
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {i+1}. {name}: {status}")

if __name__ == "__main__":
    main()
