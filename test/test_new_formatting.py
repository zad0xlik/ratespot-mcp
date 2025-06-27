#!/usr/bin/env python3
"""
Test script to verify the new table and CSV formatting functionality
"""

import json
import subprocess
import sys
import os

def test_mcp_tool(tool_name, params, format_type="table"):
    """Test an MCP tool with given parameters"""
    print(f"\n🧪 Testing {tool_name} with format='{format_type}'")
    print("=" * 60)
    
    # Add format parameter
    params["format"] = format_type
    
    # Create the MCP request
    request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": params
        }
    }
    
    try:
        # Start the MCP server process
        process = subprocess.Popen(
            ["node", "ratespot_mcp_server.js"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Send the request
        request_json = json.dumps(request) + "\n"
        stdout, stderr = process.communicate(input=request_json, timeout=30)
        
        if process.returncode == 0:
            try:
                response = json.loads(stdout.strip())
                if "result" in response and "content" in response["result"]:
                    content = response["result"]["content"][0]["text"]
                    print("✅ Success!")
                    print("\nResponse preview (first 500 chars):")
                    print("-" * 40)
                    print(content[:500])
                    if len(content) > 500:
                        print("... (truncated)")
                    print("-" * 40)
                    return True
                else:
                    print(f"❌ Unexpected response format: {response}")
                    return False
            except json.JSONDecodeError as e:
                print(f"❌ Failed to parse JSON response: {e}")
                print(f"Raw stdout: {stdout}")
                return False
        else:
            print(f"❌ Process failed with return code {process.returncode}")
            print(f"stderr: {stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("❌ Request timed out")
        process.kill()
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    """Run the tests"""
    print("🚀 Testing RateSpot MCP Server - New Formatting Features")
    print("=" * 70)
    
    # Check if the server is built
    if not os.path.exists("ratespot_mcp_server.js"):
        print("❌ Server not built. Run 'npm run build' first.")
        return False
    
    # Test parameters
    test_params = {
        "propertyValue": 500000,
        "downPayment": 100000,
        "creditScore": 750,
        "zipCode": "90210"
    }
    
    payment_params = {
        "loanAmount": 400000,
        "interestRate": 6.5,
        "loanTerm": 30,
        "propertyTax": 6000,
        "homeInsurance": 1200,
        "pmi": 200
    }
    
    results = []
    
    # Test 1: get-mortgage-rates with table format
    results.append(test_mcp_tool("get-mortgage-rates", test_params, "table"))
    
    # Test 2: get-mortgage-rates with CSV format
    results.append(test_mcp_tool("get-mortgage-rates", test_params, "csv"))
    
    # Test 3: calculate-monthly-payment with table format
    results.append(test_mcp_tool("calculate-monthly-payment", payment_params, "table"))
    
    # Test 4: calculate-monthly-payment with CSV format
    results.append(test_mcp_tool("calculate-monthly-payment", payment_params, "csv"))
    
    # Test 5: get-mortgage-rates with pipe format
    results.append(test_mcp_tool("get-mortgage-rates", test_params, "pipe"))
    
    # Test 6: calculate-monthly-payment with pipe format
    results.append(test_mcp_tool("calculate-monthly-payment", payment_params, "pipe"))
    
    # Summary
    print("\n" + "=" * 70)
    print("🎯 TEST SUMMARY")
    print("=" * 70)
    
    passed = sum(results)
    total = len(results)
    
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All tests passed! The new formatting is working correctly.")
        return True
    else:
        print("⚠️ Some tests failed. Check the output above for details.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
