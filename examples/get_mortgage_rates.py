#!/usr/bin/env python3
"""
Fixed example script for testing the get-mortgage-rates functionality
This version tests the API directly since MCP communication has issues
"""

import urllib.request
import urllib.parse
import json
import os
from datetime import datetime

class MortgageRatesTester:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.ratespot.io/v1/mortgage_products"
        
    def make_api_request(self, params):
        """Make a direct API request to RateSpot"""
        # Add API key to parameters
        api_params = dict(params)
        api_params["apikey"] = self.api_key
        
        # Build URL with parameters
        query_string = urllib.parse.urlencode(api_params)
        full_url = f"{self.base_url}?{query_string}"
        
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
            if response.getcode() == 200:
                # Read the response
                content = response.read().decode('utf-8')
                
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
                        except json.JSONDecodeError:
                            # Skip non-JSON data lines (like status messages)
                            pass
                
                return events
            else:
                raise Exception(f"API request failed with status {response.getcode()}")
    
    def test_get_mortgage_rates(self):
        """Test the get-mortgage-rates functionality with various scenarios"""
        print("\n🏠 Testing get-mortgage-rates functionality...")
        
        test_scenarios = [
            {
                "name": "Basic mortgage rate query",
                "params": {
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
            },
            {
                "name": "FHA loan query",
                "params": {
                    "purpose": "purchase",
                    "zipcode": "90210",
                    "property_value": "350000",
                    "down_payment": "5",  # Lower down payment for FHA
                    "mortgage_balance": "95",
                    "credit_score": "650",
                    "fha": "1",
                    "va": "0",
                    "property_type": "single_family",
                    "property_use": "primary"
                }
            },
            {
                "name": "VA loan query",
                "params": {
                    "purpose": "purchase",
                    "zipcode": "75201",  # Texas
                    "property_value": "500000",
                    "down_payment": "0",  # No down payment for VA
                    "mortgage_balance": "100",
                    "credit_score": "720",
                    "fha": "0",
                    "va": "1",
                    "property_type": "single_family",
                    "property_use": "primary"
                }
            },
            {
                "name": "High-end property query",
                "params": {
                    "purpose": "purchase",
                    "zipcode": "10001",  # New York
                    "property_value": "1000000",
                    "down_payment": "20",
                    "mortgage_balance": "80",
                    "credit_score": "800",
                    "fha": "1",
                    "va": "1",
                    "property_type": "condo",
                    "property_use": "primary"
                }
            },
            {
                "name": "Investment property query",
                "params": {
                    "purpose": "purchase",
                    "zipcode": "33101",  # Florida
                    "property_value": "750000",
                    "down_payment": "25",  # Higher down payment for investment
                    "mortgage_balance": "75",
                    "credit_score": "780",
                    "fha": "0",  # No FHA for investment
                    "va": "0",   # No VA for investment
                    "property_type": "single_family",
                    "property_use": "investment"
                }
            }
        ]
        
        results = []
        
        for i, scenario in enumerate(test_scenarios, 1):
            print(f"\n📊 Test {i}: {scenario['name']}")
            
            try:
                events = self.make_api_request(scenario["params"])
                
                # Filter to only mortgage product events
                mortgage_products = [e for e in events if e.get('event') == 'mortgage_product']
                
                print(f"✅ Success - Found {len(mortgage_products)} mortgage products")
                
                if mortgage_products:
                    # Show sample products
                    print("📋 Sample products:")
                    for j, product in enumerate(mortgage_products[:3]):
                        data = product['data']
                        print(f"   {j+1}. {data.get('lender_name', 'Unknown')} - {data.get('rate', 'N/A')}% APR: {data.get('apr', 'N/A')}% Payment: ${data.get('mo_payment', 'N/A')}")
                    
                    if len(mortgage_products) > 3:
                        print(f"   ... and {len(mortgage_products) - 3} more products")
                
                # Save detailed results
                result_data = {
                    "scenario": scenario["name"],
                    "params": scenario["params"],
                    "total_products": len(mortgage_products),
                    "sample_products": mortgage_products[:5],  # Save first 5 products
                    "timestamp": datetime.now().isoformat(),
                    "success": True
                }
                results.append(result_data)
                
            except Exception as e:
                error_msg = str(e)
                print(f"❌ Failed: {error_msg}")
                results.append({
                    "scenario": scenario["name"],
                    "params": scenario["params"],
                    "total_products": 0,
                    "sample_products": [],
                    "timestamp": datetime.now().isoformat(),
                    "success": False,
                    "error": error_msg
                })
        
        return results
    
    def save_results(self, results):
        """Save test results to JSON file"""
        output_file = "data/get_mortgage_rates_results.json"
        
        summary = {
            "tool_name": "get-mortgage-rates",
            "test_timestamp": datetime.now().isoformat(),
            "total_tests": len(results),
            "successful_tests": len([r for r in results if r["success"]]),
            "failed_tests": len([r for r in results if not r["success"]]),
            "results": results
        }
        
        with open(output_file, 'w') as f:
            json.dump(summary, f, indent=2)
        
        print(f"\n💾 Results saved to {output_file}")
        return summary
    
    def run_test(self):
        """Run the complete test"""
        print("🚀 Starting get-mortgage-rates functionality test")
        print("=" * 50)
        
        results = self.test_get_mortgage_rates()
        summary = self.save_results(results)
        
        print("\n" + "=" * 50)
        print(f"🎯 Test Summary:")
        print(f"   Total tests: {summary['total_tests']}")
        print(f"   Successful: {summary['successful_tests']}")
        print(f"   Failed: {summary['failed_tests']}")
        
        if summary['successful_tests'] == summary['total_tests']:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️ Some tests failed.")
            return False

def main():
    """Main function"""
    # Get API key from environment
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
        return False
    
    # Ensure data directory exists
    os.makedirs("data", exist_ok=True)
    
    tester = MortgageRatesTester(api_key)
    success = tester.run_test()
    
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
