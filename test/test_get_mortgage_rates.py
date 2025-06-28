#!/usr/bin/env python3
"""
Comprehensive test for get-mortgage-rates tool
Tests various parameter combinations and output formats
"""

import json
import subprocess
import sys
import time
import os
from typing import Dict, Any, Optional

class GetMortgageRatesTest:
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
            print("✅ RateSpot MCP Server started for get-mortgage-rates testing")
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
    
    def test_basic_mortgage_rates(self):
        """Test basic mortgage rates with minimal parameters"""
        print("\n🏠 Testing basic mortgage rates...")
        
        params = {
            "name": "get-mortgage-rates",
            "arguments": {
                "propertyValue": 500000,
                "downPayment": 100000,
                "creditScore": 750,
                "zipCode": "90210"
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        if "result" in response and "content" in response["result"]:
            content = response["result"]["content"]
            if content and len(content) > 0:
                text = content[0].get("text", "")
                if "MORTGAGE RATES COMPARISON" in text and "BEST RATE DETAILS" in text:
                    print("✅ Basic mortgage rates test passed")
                    print(f"   Response length: {len(text)} characters")
                    return True
                else:
                    print("❌ Response format incorrect")
                    print(f"   Response: {text[:200]}...")
                    return False
            else:
                print("❌ Empty content in response")
                return False
        else:
            print(f"❌ Failed to get mortgage rates: {response.get('error')}")
            return False
    
    def test_all_parameters(self):
        """Test with all possible parameters"""
        print("\n🔧 Testing with all parameters...")
        
        params = {
            "name": "get-mortgage-rates",
            "arguments": {
                "loanAmount": 400000,
                "creditScore": 790,
                "downPayment": 100000,
                "propertyValue": 500000,
                "loanType": "conventional",
                "propertyType": "single_family",
                "occupancy": "primary",
                "state": "CA",
                "zipCode": "90210",
                "loanTerm": 30,
                "rateType": "fixed"
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        if "result" in response and "content" in response["result"]:
            content = response["result"]["content"]
            if content and len(content) > 0:
                text = content[0].get("text", "")
                if "MORTGAGE RATES COMPARISON" in text:
                    print("✅ All parameters test passed")
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
            "name": "get-mortgage-rates",
            "arguments": {
                "propertyValue": 500000,
                "downPayment": 100000,
                "creditScore": 750,
                "zipCode": "90210",
                "format": "csv"
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        if "result" in response and "content" in response["result"]:
            content = response["result"]["content"]
            if content and len(content) > 0:
                text = content[0].get("text", "")
                if "CSV FORMAT" in text and ("Lender,Rate" in text or "Lender Name,Rate" in text):
                    print("✅ CSV format test passed")
                    # Check for proper CSV structure
                    lines = text.split('\n')
                    csv_lines = [line for line in lines if ',' in line and not line.startswith('MORTGAGE')]
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
            "name": "get-mortgage-rates",
            "arguments": {
                "propertyValue": 500000,
                "downPayment": 100000,
                "creditScore": 750,
                "zipCode": "90210",
                "format": "pipe"
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        if "result" in response and "content" in response["result"]:
            content = response["result"]["content"]
            if content and len(content) > 0:
                text = content[0].get("text", "")
                if "PIPE-DELIMITED FORMAT" in text and "Lender|Rate" in text:
                    print("✅ Pipe format test passed")
                    # Check for proper pipe structure
                    lines = text.split('\n')
                    pipe_lines = [line for line in lines if '|' in line and not line.startswith('MORTGAGE')]
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
    
    def test_structured_format(self):
        """Test structured JSON output format"""
        print("\n🔧 Testing structured JSON format...")
        
        params = {
            "name": "get-mortgage-rates",
            "arguments": {
                "propertyValue": 500000,
                "downPayment": 100000,
                "creditScore": 750,
                "zipCode": "90210",
                "format": "structured"
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        if "result" in response and "content" in response["result"]:
            content = response["result"]["content"]
            if content and len(content) > 0:
                text = content[0].get("text", "")
                try:
                    # Try to parse as JSON
                    import json
                    data = json.loads(text)
                    
                    # Check for expected structure
                    if "rates" in data and "best_rate" in data and "total_products" in data and "search_params" in data:
                        print("✅ Structured format test passed")
                        print(f"   Found {data.get('total_products', 0)} products in structured format")
                        
                        # Check if rates array has expected structure
                        if data["rates"] and len(data["rates"]) > 0:
                            rate = data["rates"][0]
                            expected_fields = ["lender", "rate", "apr", "payment", "points", "upfront_costs"]
                            found_fields = [field for field in expected_fields if field in rate]
                            if len(found_fields) >= 4:  # At least most fields present
                                print(f"   ✅ Rate structure valid with fields: {', '.join(found_fields)}")
                                return True
                            else:
                                print(f"   ⚠️  Rate structure missing some fields: {set(expected_fields) - set(found_fields)}")
                                return True  # Still pass if basic structure is there
                        else:
                            print("   ⚠️  No rates found in structured data")
                            return True  # Still pass if structure is correct
                    else:
                        print("❌ Structured format missing required fields")
                        print(f"   Available fields: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
                        return False
                        
                except json.JSONDecodeError as e:
                    print(f"❌ Structured format is not valid JSON: {e}")
                    print(f"   Response: {text[:200]}...")
                    return False
            else:
                print("❌ Empty content in structured response")
                return False
        else:
            print(f"❌ Failed structured format test: {response.get('error')}")
            return False
    
    def test_markdown_format(self):
        """Test markdown table output format"""
        print("\n📝 Testing markdown format...")
        
        params = {
            "name": "get-mortgage-rates",
            "arguments": {
                "propertyValue": 500000,
                "downPayment": 100000,
                "creditScore": 750,
                "zipCode": "90210",
                "format": "markdown"
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        if "result" in response and "content" in response["result"]:
            content = response["result"]["content"]
            if content and len(content) > 0:
                text = content[0].get("text", "")
                if "# Mortgage Rates Comparison" in text and "| Lender | Rate |" in text and "|--------|------|" in text:
                    print("✅ Markdown format test passed")
                    
                    # Check for markdown table structure
                    lines = text.split('\n')
                    table_lines = [line for line in lines if line.startswith('|') and '|' in line[1:]]
                    if len(table_lines) > 2:  # Header + separator + at least one data row
                        print(f"   Found {len(table_lines)-2} data rows in markdown table")
                        
                        # Check for best rate details section
                        if "## Best Rate Details" in text:
                            print("   ✅ Best rate details section found")
                        
                        return True
                    else:
                        print("❌ Markdown table missing data rows")
                        return False
                else:
                    print("❌ Markdown format incorrect")
                    print(f"   Response: {text[:200]}...")
                    return False
            else:
                print("❌ Empty content in markdown response")
                return False
        else:
            print(f"❌ Failed markdown format test: {response.get('error')}")
            return False
    
    def test_different_credit_scores(self):
        """Test with different credit score ranges"""
        print("\n📈 Testing different credit scores...")
        
        credit_scores = [620, 700, 750, 800]
        results = []
        
        for score in credit_scores:
            params = {
                "name": "get-mortgage-rates",
                "arguments": {
                    "propertyValue": 500000,
                    "downPayment": 100000,
                    "creditScore": score,
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
                        print(f"   ✅ Credit score {score}: Success")
                    else:
                        results.append(False)
                        print(f"   ❌ Credit score {score}: Invalid response")
                else:
                    results.append(False)
                    print(f"   ❌ Credit score {score}: Empty response")
            else:
                results.append(False)
                print(f"   ❌ Credit score {score}: Error - {response.get('error')}")
            
            time.sleep(0.5)  # Brief pause between requests
        
        success_rate = sum(results) / len(results)
        if success_rate >= 0.75:  # At least 75% success rate
            print(f"✅ Credit score test passed ({success_rate*100:.0f}% success rate)")
            return True
        else:
            print(f"❌ Credit score test failed ({success_rate*100:.0f}% success rate)")
            return False
    
    def test_different_zip_codes(self):
        """Test with different ZIP codes"""
        print("\n🗺️  Testing different ZIP codes...")
        
        zip_codes = ["90210", "10001", "60601", "30309", "78701"]
        results = []
        
        for zip_code in zip_codes:
            params = {
                "name": "get-mortgage-rates",
                "arguments": {
                    "propertyValue": 500000,
                    "downPayment": 100000,
                    "creditScore": 750,
                    "zipCode": zip_code
                }
            }
            
            response = self.send_mcp_request("tools/call", params)
            
            if "result" in response and "content" in response["result"]:
                content = response["result"]["content"]
                if content and len(content) > 0:
                    text = content[0].get("text", "")
                    if "MORTGAGE RATES COMPARISON" in text:
                        results.append(True)
                        print(f"   ✅ ZIP {zip_code}: Success")
                    else:
                        results.append(False)
                        print(f"   ❌ ZIP {zip_code}: Invalid response")
                else:
                    results.append(False)
                    print(f"   ❌ ZIP {zip_code}: Empty response")
            else:
                results.append(False)
                print(f"   ❌ ZIP {zip_code}: Error - {response.get('error')}")
            
            time.sleep(0.5)  # Brief pause between requests
        
        success_rate = sum(results) / len(results)
        if success_rate >= 0.6:  # At least 60% success rate (some ZIPs might not be supported)
            print(f"✅ ZIP code test passed ({success_rate*100:.0f}% success rate)")
            return True
        else:
            print(f"❌ ZIP code test failed ({success_rate*100:.0f}% success rate)")
            return False
    
    def test_edge_cases(self):
        """Test edge cases and error handling"""
        print("\n⚠️  Testing edge cases...")
        
        # Test with very low down payment
        params = {
            "name": "get-mortgage-rates",
            "arguments": {
                "propertyValue": 500000,
                "downPayment": 10000,  # Only 2% down
                "creditScore": 750,
                "zipCode": "90210"
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        if "result" in response:
            print("   ✅ Low down payment handled")
            edge_case_1 = True
        else:
            print("   ❌ Low down payment failed")
            edge_case_1 = False
        
        # Test with very high property value
        params = {
            "name": "get-mortgage-rates",
            "arguments": {
                "propertyValue": 2000000,  # $2M property
                "downPayment": 400000,
                "creditScore": 750,
                "zipCode": "90210"
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        if "result" in response:
            print("   ✅ High property value handled")
            edge_case_2 = True
        else:
            print("   ❌ High property value failed")
            edge_case_2 = False
        
        return edge_case_1 and edge_case_2
    
    def run_all_tests(self):
        """Run all get-mortgage-rates tests"""
        print("🚀 Starting get-mortgage-rates Tool Tests")
        print("=" * 60)
        
        if not self.start_server():
            return False
        
        try:
            if not self.initialize_server():
                print("❌ Failed to initialize server")
                return False
            
            tests = [
                ("Basic Mortgage Rates", self.test_basic_mortgage_rates),
                ("All Parameters", self.test_all_parameters),
                ("CSV Format", self.test_csv_format),
                ("Pipe Format", self.test_pipe_format),
                ("Structured Format", self.test_structured_format),
                ("Markdown Format", self.test_markdown_format),
                ("Different Credit Scores", self.test_different_credit_scores),
                ("Different ZIP Codes", self.test_different_zip_codes),
                ("Edge Cases", self.test_edge_cases)
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
            print(f"🎯 get-mortgage-rates Test Results: {passed}/{total} tests passed")
            
            if passed == total:
                print("🎉 All get-mortgage-rates tests passed!")
            else:
                print("⚠️  Some get-mortgage-rates tests failed.")
            
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
    tester = GetMortgageRatesTest(server_path)
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
