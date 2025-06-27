#!/usr/bin/env python3
"""
Test script for RateSpot MCP Server
This script demonstrates how to interact with the RateSpot MCP server
and test various mortgage rate tools.
"""

import json
import subprocess
import sys
import time
import os
from typing import Dict, Any, Optional

class RateSpotMCPTester:
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
            print("✅ RateSpot MCP Server started successfully")
            time.sleep(1)  # Give server time to initialize
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
    
    def test_server_initialization(self):
        """Test basic server initialization"""
        print("\n🔧 Testing server initialization...")
        
        # Test server info
        response = self.send_mcp_request("initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {
                "name": "test-client",
                "version": "1.0.0"
            }
        })
        
        if "error" not in response:
            print("✅ Server initialization successful")
            return True
        else:
            print(f"❌ Server initialization failed: {response.get('error')}")
            return False
    
    def test_list_tools(self):
        """Test listing available tools"""
        print("\n📋 Testing tool listing...")
        
        response = self.send_mcp_request("tools/list")
        
        if "result" in response and "tools" in response["result"]:
            tools = response["result"]["tools"]
            print(f"✅ Found {len(tools)} tools:")
            for tool in tools:
                print(f"   - {tool['name']}: {tool.get('description', 'No description')}")
            return True
        else:
            print(f"❌ Failed to list tools: {response.get('error')}")
            return False
    
    def test_mortgage_rates(self):
        """Test getting mortgage rates"""
        print("\n🏠 Testing mortgage rates tool...")
        
        params = {
            "name": "get-mortgage-rates",
            "arguments": {
                "loanAmount": 400000,
                "creditScore": 790,
                "downPayment": 100000,
                "propertyValue": 500000,
                "propertyType": "single_family",
                "occupancy": "primary",
                "zipCode": "90210"
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        if "result" in response:
            print("✅ Mortgage rates retrieved successfully")
            content = response["result"].get("content", [])
            if content and len(content) > 0:
                print("📊 Sample response:")
                # Parse and display first few lines of response
                text_content = content[0].get("text", "")
                lines = text_content.split('\n')[:10]  # First 10 lines
                for line in lines:
                    if line.strip():
                        print(f"   {line}")
                if len(text_content.split('\n')) > 10:
                    print("   ... (truncated)")
            return True
        else:
            print(f"❌ Failed to get mortgage rates: {response.get('error')}")
            return False
    
    def test_monthly_payment_calculator(self):
        """Test monthly payment calculation"""
        print("\n💰 Testing monthly payment calculator...")
        
        params = {
            "name": "calculate-monthly-payment",
            "arguments": {
                "loanAmount": 400000,
                "interestRate": 6.5,
                "loanTerm": 30,
                "propertyTax": 6000,
                "homeInsurance": 1200,
                "pmi": 200
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        if "result" in response:
            print("✅ Monthly payment calculated successfully")
            content = response["result"].get("content", [])
            if content and len(content) > 0:
                text_content = content[0].get("text", "")
                print("💵 Payment breakdown:")
                print(f"   {text_content}")
            return True
        else:
            print(f"❌ Failed to calculate monthly payment: {response.get('error')}")
            return False
    
    
    def test_loan_comparison(self):
        """Test loan product comparison"""
        print("\n📊 Testing loan comparison tool...")
        
        params = {
            "name": "compare-loan-products",
            "arguments": {
                "loanAmount": 400000,
                "creditScore": 790,
                "downPayment": 100000,
                "propertyValue": 500000,
                "zipCode": "90210",
                "propertyType": "single_family",
                "occupancy": "primary"
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        if "result" in response:
            print("✅ Loan comparison completed successfully")
            content = response["result"].get("content", [])
            if content and len(content) > 0:
                text_content = content[0].get("text", "")
                lines = text_content.split('\n')[:20]  # First 20 lines
                print("📈 Comparison results:")
                for line in lines:
                    if line.strip():
                        print(f"   {line}")
            return True
        else:
            print(f"❌ Failed to compare loan products: {response.get('error')}")
            return False
    
    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting RateSpot MCP Server Tests")
        print("=" * 50)
        
        if not self.start_server():
            return False
        
        try:
            tests = [
                self.test_server_initialization,
                self.test_list_tools,
                self.test_mortgage_rates,
                self.test_monthly_payment_calculator,
                self.test_loan_comparison
            ]
            
            passed = 0
            total = len(tests)
            
            for test in tests:
                try:
                    if test():
                        passed += 1
                    time.sleep(1)  # Brief pause between tests
                except Exception as e:
                    print(f"❌ Test failed with exception: {e}")
            
            print("\n" + "=" * 50)
            print(f"🎯 Test Results: {passed}/{total} tests passed")
            
            if passed == total:
                print("🎉 All tests passed! RateSpot MCP Server is working correctly.")
            else:
                print("⚠️  Some tests failed. Check the output above for details.")
            
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
    
    # Run tests
    tester = RateSpotMCPTester(server_path)
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
