#!/usr/bin/env python3

import os
import subprocess
import json
import time

def test_csv_with_quote_type():
    """Simple test to verify CSV format includes Quote Type field"""
    
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
    
    print("Testing CSV Format with Quote Type Field")
    print("=" * 50)
    
    # Start the MCP server
    print("🚀 Starting MCP server...")
    server_process = subprocess.Popen(
        ['node', 'ratespot_mcp_server.js'],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Give server time to start
    time.sleep(2)
    
    try:
        # Test CSV format request
        print("📊 Testing CSV format...")
        
        request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": "get-mortgage-rates",
                "arguments": {
                    "propertyValue": 500000,
                    "downPayment": 100000,
                    "creditScore": 750,
                    "zipCode": "90210",
                    "format": "csv"
                }
            }
        }
        
        # Send request
        stdout, stderr = server_process.communicate(json.dumps(request))
        
        if stdout:
            try:
                response = json.loads(stdout)
                if "result" in response and "content" in response["result"]:
                    csv_content = response["result"]["content"][0]["text"]
                    
                    print("✅ CSV response received!")
                    
                    # Check for Quote Type column
                    if "Quote Type" in csv_content:
                        print("✅ Quote Type column found in CSV!")
                        
                        # Check for wholesale/retail values
                        wholesale_count = csv_content.count("Wholesale")
                        retail_count = csv_content.count("Retail")
                        
                        print(f"📈 Found {wholesale_count} Wholesale loans")
                        print(f"📈 Found {retail_count} Retail loans")
                        
                        if wholesale_count > 0 or retail_count > 0:
                            print("✅ Quote Type values are working correctly!")
                        else:
                            print("❌ No Quote Type values found")
                        
                        # Show CSV header
                        lines = csv_content.split('\n')
                        for line in lines:
                            if "Lender Name" in line:
                                print(f"\n📋 CSV Header:")
                                print(f"   {line}")
                                
                                # Count columns
                                columns = line.split(',')
                                print(f"\n📊 Total columns: {len(columns)}")
                                
                                # Show Quote Type position
                                for i, col in enumerate(columns):
                                    if "Quote Type" in col:
                                        print(f"✅ Quote Type is column {i+1}")
                                        break
                                break
                        
                        # Show first few data rows
                        print(f"\n📋 Sample data rows:")
                        data_count = 0
                        for line in lines:
                            if line.strip() and "Lender Name" not in line and "MORTGAGE RATES" not in line and "Copy the data" not in line:
                                if data_count < 3:
                                    # Show just the first few fields to avoid clutter
                                    fields = line.split(',')
                                    if len(fields) >= 8:
                                        print(f"   Row {data_count+1}: {fields[0][:20]}... | Rate: {fields[1]} | Quote: {fields[7]}")
                                    data_count += 1
                                else:
                                    break
                        
                    else:
                        print("❌ Quote Type column not found in CSV")
                        print("📋 CSV content preview:")
                        lines = csv_content.split('\n')
                        for i, line in enumerate(lines[:5]):
                            print(f"   {i+1}: {line[:100]}...")
                else:
                    print("❌ No content in response")
                    print(f"Response: {response}")
            except json.JSONDecodeError as e:
                print(f"❌ JSON decode error: {e}")
                print(f"Raw stdout: {stdout[:200]}...")
        else:
            print("❌ No response from server")
            
        if stderr:
            print(f"\n📝 Server logs: {stderr[:200]}...")
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Clean up
        if server_process.poll() is None:
            server_process.terminate()
            server_process.wait()
    
    print("\n" + "=" * 50)
    print("CSV Test Complete!")

if __name__ == "__main__":
    test_csv_with_quote_type()
