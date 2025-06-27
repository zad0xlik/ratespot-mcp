#!/usr/bin/env python3

import os
import sys
sys.path.append('examples')

# Import the existing test framework
from test_implemented_tools import test_get_mortgage_rates_csv

def main():
    print("Testing CSV Format with Quote Type Field")
    print("=" * 50)
    
    # Set API key
    # Get API key from environment or .env file
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
    
    # Set API key in environment for the server
    os.environ['RATESPOT_API_KEY'] = api_key
    
    try:
        # Test CSV format
        print("\n🔍 Testing CSV format...")
        result = test_get_mortgage_rates_csv()
        
        if result:
            print("✅ CSV format test passed!")
            
            # Check if Quote Type is in the output
            if "Quote Type" in result:
                print("✅ Quote Type column found in CSV header!")
                
                # Check for wholesale/retail values
                if "Wholesale" in result or "Retail" in result:
                    print("✅ Wholesale/Retail values found in CSV data!")
                    
                    # Show a sample of the CSV
                    lines = result.split('\n')
                    print(f"\n📋 CSV Sample (first 5 lines):")
                    for i, line in enumerate(lines[:5]):
                        if line.strip():
                            print(f"   {i+1}: {line}")
                    
                    # Show header specifically
                    header = lines[2] if len(lines) > 2 else ""  # Skip title lines
                    if "Lender Name" in header:
                        print(f"\n📊 CSV Header:")
                        print(f"   {header}")
                        
                        # Count columns
                        columns = header.split(',')
                        print(f"\n📈 Column count: {len(columns)}")
                        
                        # Find Quote Type position
                        for i, col in enumerate(columns):
                            if "Quote Type" in col:
                                print(f"✅ Quote Type found at column {i+1}: '{col.strip()}'")
                                break
                else:
                    print("❌ No Wholesale/Retail values found in CSV data")
            else:
                print("❌ Quote Type column not found in CSV header")
                print("📋 Available columns:")
                lines = result.split('\n')
                for line in lines[:5]:
                    if "Lender Name" in line:
                        columns = line.split(',')
                        for i, col in enumerate(columns):
                            print(f"   {i+1}: {col.strip()}")
                        break
        else:
            print("❌ CSV format test failed - no result returned")
            
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 50)
    print("CSV Format Test Complete!")

if __name__ == "__main__":
    main()
