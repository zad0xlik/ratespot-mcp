#!/usr/bin/env python3

import json
import subprocess
import sys

def test_quote_type_field():
    """Test that the quote_type field is properly included in all output formats"""
    
    # Test parameters
    test_params = {
        "loanAmount": 958400,
        "creditScore": 710,
        "downPayment": 239600,
        "propertyValue": 1198000,
        "zipCode": "94583",
        "propertyType": "single_family",
        "occupancy": "primary"
    }
    
    print("Testing Quote Type Field Implementation")
    print("=" * 50)
    
    # Test CSV format
    print("\n1. Testing CSV Format...")
    csv_params = test_params.copy()
    csv_params["format"] = "csv"
    
    try:
        result = subprocess.run([
            "node", "ratespot_mcp_server.js"
        ], input=json.dumps({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": "get-mortgage-rates",
                "arguments": csv_params
            }
        }), text=True, capture_output=True, timeout=30)
        
        if result.returncode == 0:
            response = json.loads(result.stdout)
            if "result" in response and "content" in response["result"]:
                csv_output = response["result"]["content"][0]["text"]
                if "Quote Type" in csv_output:
                    print("✅ CSV format includes Quote Type column")
                    # Check for wholesale/retail values
                    if "Wholesale" in csv_output or "Retail" in csv_output:
                        print("✅ CSV format includes Wholesale/Retail values")
                    else:
                        print("❌ CSV format missing Wholesale/Retail values")
                else:
                    print("❌ CSV format missing Quote Type column")
            else:
                print("❌ CSV test failed - no content in response")
        else:
            print(f"❌ CSV test failed - exit code: {result.returncode}")
            print(f"Error: {result.stderr}")
            
    except Exception as e:
        print(f"❌ CSV test failed with exception: {e}")
    
    # Test Pipe format
    print("\n2. Testing Pipe-Delimited Format...")
    pipe_params = test_params.copy()
    pipe_params["format"] = "pipe"
    
    try:
        result = subprocess.run([
            "node", "ratespot_mcp_server.js"
        ], input=json.dumps({
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {
                "name": "get-mortgage-rates",
                "arguments": pipe_params
            }
        }), text=True, capture_output=True, timeout=30)
        
        if result.returncode == 0:
            response = json.loads(result.stdout)
            if "result" in response and "content" in response["result"]:
                pipe_output = response["result"]["content"][0]["text"]
                if "Quote Type" in pipe_output:
                    print("✅ Pipe format includes Quote Type column")
                    # Check for wholesale/retail values
                    if "Wholesale" in pipe_output or "Retail" in pipe_output:
                        print("✅ Pipe format includes Wholesale/Retail values")
                    else:
                        print("❌ Pipe format missing Wholesale/Retail values")
                else:
                    print("❌ Pipe format missing Quote Type column")
            else:
                print("❌ Pipe test failed - no content in response")
        else:
            print(f"❌ Pipe test failed - exit code: {result.returncode}")
            print(f"Error: {result.stderr}")
            
    except Exception as e:
        print(f"❌ Pipe test failed with exception: {e}")
    
    # Test Table format
    print("\n3. Testing Table Format...")
    table_params = test_params.copy()
    table_params["format"] = "table"
    
    try:
        result = subprocess.run([
            "node", "ratespot_mcp_server.js"
        ], input=json.dumps({
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {
                "name": "get-mortgage-rates",
                "arguments": table_params
            }
        }), text=True, capture_output=True, timeout=30)
        
        if result.returncode == 0:
            response = json.loads(result.stdout)
            if "result" in response and "content" in response["result"]:
                table_output = response["result"]["content"][0]["text"]
                if "Quote" in table_output:
                    print("✅ Table format includes Quote column")
                    # Check for wholesale/retail values
                    if "Wholesale" in table_output or "Retail" in table_output:
                        print("✅ Table format includes Wholesale/Retail values")
                    else:
                        print("❌ Table format missing Wholesale/Retail values")
                else:
                    print("❌ Table format missing Quote column")
            else:
                print("❌ Table test failed - no content in response")
        else:
            print(f"❌ Table test failed - exit code: {result.returncode}")
            print(f"Error: {result.stderr}")
            
    except Exception as e:
        print(f"❌ Table test failed with exception: {e}")
    
    print("\n" + "=" * 50)
    print("Quote Type Field Test Complete!")
    print("\nNow you can:")
    print("1. Use format='csv' to get CSV with Quote Type column")
    print("2. Use format='pipe' to get pipe-delimited with Quote Type column") 
    print("3. Use format='table' to see Quote Type in the table view")
    print("\nThe Quote Type will show:")
    print("- 'Wholesale' for quote_type='ws'")
    print("- 'Retail' for all other cases")

if __name__ == "__main__":
    test_quote_type_field()
