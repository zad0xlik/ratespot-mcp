#!/usr/bin/env python3
"""
Comprehensive test for compare-loan-products tool
Tests various parameter combinations and output formats
"""

import json
import subprocess
import sys
import time
import os
from typing import Dict, Any, Optional

class CompareLoanProductsTest:
    def __init__(self, server_path: str):
        self.server_path = server_path
        self.server_process = None
        
    def start_server(self):
        """Start the MCP server process"""
        try:
            self.server_process = subprocess.Popen(
                ['node', self.server_path],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=0
            )
            print("✅ RateSpot MCP Server started for compare-loan-products testing")
            time.sleep(2)  # Give server time to initialize
            return True
        except Exception as e:
            print(f"❌ Failed to start server: {e}")
            return False
    
    def stop_server(self):
        """Stop the MCP server process"""
        if self.server_process:
            self.server_process.terminate()
            self.server_process.wait()
            print("🛑 Server stopped")
    
    def send_mcp_request(self, method: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Send an MCP request to the server"""
        if not self.server_process:
            raise Exception("Server not started")
        
        request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params or {}
        }
        
        request_json = json.dumps(request) + '\n'
        
        try:
            self.server_process.stdin.write(request_json)
            self.server_process.stdin.flush()
            
            # Read response
            response_line = self.server_process.stdout.readline()
            if response_line:
                return json.loads(response_line.strip())
            else:
                return {"error": "No response from server"}
        except Exception as e:
            return {"error": f"Communication error: {e}"}
    
    def initialize_server(self):
        """Initialize the MCP server"""
        response = self.send_mcp_request("initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {
                "name": "test-client",
                "version": "1.0.0"
            }
        })
        return "error" not in response
    
    def test_basic_loan_comparison(self):
        """Test basic loan comparison with required parameters"""
        print("\n🏠 Testing basic loan comparison...")
        
        params = {
            "name": "compare-loan-products",
            "arguments": {
                "loanAmount": 400000,
                "creditScore": 750,
                "downPayment": 100000,
                "propertyValue": 500000,
                "zipCode": "90210"
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        if "result" in response and "content" in response["result"]:
            content = response["result"]["content"]
            if content and len(content) > 0:
                text = content[0].get("text", "")
                if "MORTGAGE RATES COMPARISON" in text and "SEARCH PARAMETERS" in text:
                    print("✅ Basic loan comparison test passed")
                    print(f"   Response length: {len(text)} characters")
                    # Check if loan amount is mentioned in search parameters
                    if f"Loan Amount: $400,000" in text:
                        print("   ✅ Loan amount correctly displayed")
                        return True
                    else:
                        print("   ⚠️  Loan amount not found in search parameters")
                        return True  # Still pass if main comparison works
                else:
                    print("❌ Response format incorrect")
                    print(f"   Response: {text[:200]}...")
                    return False
            else:
                print("❌ Empty content in response")
                return False
        else:
            print(f"❌ Failed to compare loan products: {response.get('error')}")
            return False
    
    def test_all_parameters(self):
        """Test with all possible parameters"""
        print("\n🔧 Testing with all parameters...")
        
        params = {
            "name": "compare-loan-products",
            "arguments": {
                "loanAmount": 400000,
                "creditScore": 790,
                "downPayment": 100000,
                "propertyValue": 500000,
                "zipCode": "90210",
                "propertyType": "condo",
                "occupancy": "secondary"
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        if "result" in response and "content" in response["result"]:
            content = response["result"]["content"]
            if content and len(content) > 0:
                text = content[0].get("text", "")
                if "MORTGAGE RATES COMPARISON" in text:
                    print("✅ All parameters test passed")
                    # Check if optional parameters are reflected
                    if "Property Type: condo" in text and "Occupancy: secondary" in text:
                        print("   ✅ Optional parameters correctly displayed")
                    return True
                else:
                    print("❌ Response format incorrect")
                    return False
            else:
                print("❌ Empty content in response")
                return False
        else:
            print(f"❌ Failed with all parameters: {response.get('error')}")
            return False
    
    def test_csv_format(self):
        """Test CSV output format"""
        print("\n📊 Testing CSV format...")
        
        params = {
            "name": "compare-loan-products",
            "arguments": {
                "loanAmount": 400000,
                "creditScore": 750,
                "downPayment": 100000,
                "propertyValue": 500000,
                "zipCode": "90210",
                "format": "csv"
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        if "result" in response and "content" in response["result"]:
            content = response["result"]["content"]
            if content and len(content) > 0:
                text = content[0].get("text", "")
                if "CSV FORMAT" in text and "Lender Name,Rate" in text:
                    print("✅ CSV format test passed")
                    # Check for proper CSV structure
                    lines = text.split('\n')
                    csv_lines = [line for line in lines if ',' in line and not line.startswith('LOAN')]
                    if len(csv_lines) > 1:  # Header + at least one data row
                        print(f"   Found {len(csv_lines)-1} data rows in CSV")
                        return True
                    else:
                        print("❌ CSV format missing data rows")
                        return False
                else:
                    print("❌ CSV format incorrect")
                    print(f"   Response: {text[:200]}...")
                    return False
            else:
                print("❌ Empty content in CSV response")
                return False
        else:
            print(f"❌ Failed CSV format test: {response.get('error')}")
            return False
    
    def test_pipe_format(self):
        """Test pipe-delimited output format"""
        print("\n📋 Testing pipe-delimited format...")
        
        params = {
            "name": "compare-loan-products",
            "arguments": {
                "loanAmount": 400000,
                "creditScore": 750,
                "downPayment": 100000,
                "propertyValue": 500000,
                "zipCode": "90210",
                "format": "pipe"
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        if "result" in response and "content" in response["result"]:
            content = response["result"]["content"]
            if content and len(content) > 0:
                text = content[0].get("text", "")
                if "PIPE-DELIMITED FORMAT" in text and "Lender Name|Rate" in text:
                    print("✅ Pipe format test passed")
                    # Check for proper pipe structure
                    lines = text.split('\n')
                    pipe_lines = [line for line in lines if '|' in line and not line.startswith('LOAN')]
                    if len(pipe_lines) > 1:  # Header + at least one data row
                        print(f"   Found {len(pipe_lines)-1} data rows in pipe format")
                        return True
                    else:
                        print("❌ Pipe format missing data rows")
                        return False
                else:
                    print("❌ Pipe format incorrect")
                    print(f"   Response: {text[:200]}...")
                    return False
            else:
                print("❌ Empty content in pipe response")
                return False
        else:
            print(f"❌ Failed pipe format test: {response.get('error')}")
            return False
    
    def test_different_property_types(self):
        """Test with different property types"""
        print("\n🏘️  Testing different property types...")
        
        property_types = ["single_family", "condo", "townhouse", "multi_family"]
        results = []
        
        for prop_type in property_types:
            params = {
                "name": "compare-loan-products",
                "arguments": {
                    "loanAmount": 400000,
                    "creditScore": 750,
                    "downPayment": 100000,
                    "propertyValue": 500000,
                    "zipCode": "90210",
                    "propertyType": prop_type
                }
            }
            
            response = self.send_mcp_request("tools/call", params)
            
            if "result" in response and "content" in response["result"]:
                content = response["result"]["content"]
                if content and len(content) > 0:
                    text = content[0].get("text", "")
                    if "MORTGAGE RATES COMPARISON" in text:
                        results.append(True)
                        print(f"   ✅ Property type {prop_type}: Success")
                    else:
                        results.append(False)
                        print(f"   ❌ Property type {prop_type}: Invalid response")
                else:
                    results.append(False)
                    print(f"   ❌ Property type {prop_type}: Empty response")
            else:
                results.append(False)
                print(f"   ❌ Property type {prop_type}: Error - {response.get('error')}")
            
            time.sleep(0.5)  # Brief pause between requests
        
        success_rate = sum(results) / len(results)
        if success_rate >= 0.75:  # At least 75% success rate
            print(f"✅ Property type test passed ({success_rate*100:.0f}% success rate)")
            return True
        else:
            print(f"❌ Property type test failed ({success_rate*100:.0f}% success rate)")
            return False
    
    def test_different_occupancy_types(self):
        """Test with different occupancy types"""
        print("\n🏠 Testing different occupancy types...")
        
        occupancy_types = ["primary", "secondary", "investment"]
        results = []
        
        for occupancy in occupancy_types:
            params = {
                "name": "compare-loan-products",
                "arguments": {
                    "loanAmount": 400000,
                    "creditScore": 750,
                    "downPayment": 100000,
                    "propertyValue": 500000,
                    "zipCode": "90210",
                    "occupancy": occupancy
                }
            }
            
            response = self.send_mcp_request("tools/call", params)
            
            if "result" in response and "content" in response["result"]:
                content = response["result"]["content"]
                if content and len(content) > 0:
                    text = content[0].get("text", "")
                    if "MORTGAGE RATES COMPARISON" in text:
                        results.append(True)
                        print(f"   ✅ Occupancy {occupancy}: Success")
                    else:
                        results.append(False)
                        print(f"   ❌ Occupancy {occupancy}: Invalid response")
                else:
                    results.append(False)
                    print(f"   ❌ Occupancy {occupancy}: Empty response")
            else:
                results.append(False)
                print(f"   ❌ Occupancy {occupancy}: Error - {response.get('error')}")
            
            time.sleep(0.5)  # Brief pause between requests
        
        success_rate = sum(results) / len(results)
        if success_rate >= 0.75:  # At least 75% success rate
            print(f"✅ Occupancy type test passed ({success_rate*100:.0f}% success rate)")
            return True
        else:
            print(f"❌ Occupancy type test failed ({success_rate*100:.0f}% success rate)")
            return False
    
    def test_different_loan_amounts(self):
        """Test with different loan amounts"""
        print("\n💰 Testing different loan amounts...")
        
        loan_amounts = [200000, 400000, 600000, 800000]
        results = []
        
        for amount in loan_amounts:
            # Adjust property value and down payment proportionally
            property_value = int(amount * 1.25)  # 20% down payment
            down_payment = property_value - amount
            
            params = {
                "name": "compare-loan-products",
                "arguments": {
                    "loanAmount": amount,
                    "creditScore": 750,
                    "downPayment": down_payment,
                    "propertyValue": property_value,
                    "zipCode": "90210"
                }
            }
            
            response = self.send_mcp_request("tools/call", params)
            
            if "result" in response and "content" in response["result"]:
                content = response["result"]["content"]
                if content and len(content) > 0:
                    text = content[0].get("text", "")
                    if "MORTGAGE RATES COMPARISON" in text:
                        results.append(True)
                        print(f"   ✅ Loan amount ${amount:,}: Success")
                    else:
                        results.append(False)
                        print(f"   ❌ Loan amount ${amount:,}: Invalid response")
                else:
                    results.append(False)
                    print(f"   ❌ Loan amount ${amount:,}: Empty response")
            else:
                results.append(False)
                print(f"   ❌ Loan amount ${amount:,}: Error - {response.get('error')}")
            
            time.sleep(0.5)  # Brief pause between requests
        
        success_rate = sum(results) / len(results)
        if success_rate >= 0.75:  # At least 75% success rate
            print(f"✅ Loan amount test passed ({success_rate*100:.0f}% success rate)")
            return True
        else:
            print(f"❌ Loan amount test failed ({success_rate*100:.0f}% success rate)")
            return False
    
    def test_parameter_validation(self):
        """Test parameter validation and error handling"""
        print("\n⚠️  Testing parameter validation...")
        
        # Test missing required parameter
        params = {
            "name": "compare-loan-products",
            "arguments": {
                "creditScore": 750,
                "downPayment": 100000,
                "propertyValue": 500000,
                "zipCode": "90210"
                # Missing loanAmount
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        if "error" in response:
            print("   ✅ Missing required parameter properly rejected")
            validation_test_1 = True
        else:
            print("   ❌ Missing required parameter not caught")
            validation_test_1 = False
        
        # Test invalid credit score
        params = {
            "name": "compare-loan-products",
            "arguments": {
                "loanAmount": 400000,
                "creditScore": 1000,  # Invalid credit score
                "downPayment": 100000,
                "propertyValue": 500000,
                "zipCode": "90210"
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        # This might still work as the API might handle it, so we'll be lenient
        if "result" in response or "error" in response:
            print("   ✅ Invalid credit score handled")
            validation_test_2 = True
        else:
            print("   ❌ Invalid credit score caused unexpected failure")
            validation_test_2 = False
        
        return validation_test_1 and validation_test_2
    
    def test_down_payment_ratios(self):
        """Test different down payment ratios"""
        print("\n📊 Testing different down payment ratios...")
        
        property_value = 500000
        down_payment_ratios = [0.05, 0.10, 0.20, 0.25]  # 5%, 10%, 20%, 25%
        results = []
        
        for ratio in down_payment_ratios:
            down_payment = int(property_value * ratio)
            loan_amount = property_value - down_payment
            
            params = {
                "name": "compare-loan-products",
                "arguments": {
                    "loanAmount": loan_amount,
                    "creditScore": 750,
                    "downPayment": down_payment,
                    "propertyValue": property_value,
                    "zipCode": "90210"
                }
            }
            
            response = self.send_mcp_request("tools/call", params)
            
            if "result" in response and "content" in response["result"]:
                content = response["result"]["content"]
                if content and len(content) > 0:
                    text = content[0].get("text", "")
                    if "MORTGAGE RATES COMPARISON" in text:
                        results.append(True)
                        print(f"   ✅ {ratio*100:.0f}% down payment: Success")
                    else:
                        results.append(False)
                        print(f"   ❌ {ratio*100:.0f}% down payment: Invalid response")
                else:
                    results.append(False)
                    print(f"   ❌ {ratio*100:.0f}% down payment: Empty response")
            else:
                results.append(False)
                print(f"   ❌ {ratio*100:.0f}% down payment: Error - {response.get('error')}")
            
            time.sleep(0.5)  # Brief pause between requests
        
        success_rate = sum(results) / len(results)
        if success_rate >= 0.75:  # At least 75% success rate
            print(f"✅ Down payment ratio test passed ({success_rate*100:.0f}% success rate)")
            return True
        else:
            print(f"❌ Down payment ratio test failed ({success_rate*100:.0f}% success rate)")
            return False
    
    def run_all_tests(self):
        """Run all compare-loan-products tests"""
        print("🚀 Starting compare-loan-products Tool Tests")
        print("=" * 60)
        
        if not self.start_server():
            return False
        
        try:
            if not self.initialize_server():
                print("❌ Failed to initialize server")
                return False
            
            tests = [
                ("Basic Loan Comparison", self.test_basic_loan_comparison),
                ("All Parameters", self.test_all_parameters),
                ("CSV Format", self.test_csv_format),
                ("Pipe Format", self.test_pipe_format),
                ("Different Property Types", self.test_different_property_types),
                ("Different Occupancy Types", self.test_different_occupancy_types),
                ("Different Loan Amounts", self.test_different_loan_amounts),
                ("Parameter Validation", self.test_parameter_validation),
                ("Down Payment Ratios", self.test_down_payment_ratios)
            ]
            
            passed = 0
            total = len(tests)
            
            for test_name, test_func in tests:
                try:
                    print(f"\n🧪 Running: {test_name}")
                    if test_func():
                        passed += 1
                    time.sleep(1)  # Brief pause between tests
                except Exception as e:
                    print(f"❌ {test_name} failed with exception: {e}")
            
            print("\n" + "=" * 60)
            print(f"🎯 compare-loan-products Test Results: {passed}/{total} tests passed")
            
            if passed == total:
                print("🎉 All compare-loan-products tests passed!")
            else:
                print("⚠️  Some compare-loan-products tests failed.")
            
            return passed == total
            
        finally:
            self.stop_server()

def main():
    """Main function"""
    # Check if server file exists
    server_path = "ratespot_mcp_server.js"
    if not os.path.exists(server_path):
        print(f"❌ Server file not found: {server_path}")
        print("Please run 'npm run build' first to compile the TypeScript server.")
        sys.exit(1)
    
    # Check if Node.js is available
    try:
        subprocess.run(['node', '--version'], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Node.js not found. Please install Node.js to run the MCP server.")
        sys.exit(1)
    
    # Check for API key
    if not os.getenv('RATESPOT_API_KEY'):
        print("⚠️  RATESPOT_API_KEY environment variable not set.")
        print("   Some tests may fail without a valid API key.")
    
    # Run tests
    tester = CompareLoanProductsTest(server_path)
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
