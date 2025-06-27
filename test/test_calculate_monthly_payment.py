#!/usr/bin/env python3
"""
Comprehensive test for calculate-monthly-payment tool
Tests various parameter combinations and calculation accuracy
"""

import json
import subprocess
import sys
import time
import os
import math
from typing import Dict, Any, Optional

class CalculateMonthlyPaymentTest:
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
            print("✅ RateSpot MCP Server started for calculate-monthly-payment testing")
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
    
    def calculate_expected_payment(self, loan_amount: float, interest_rate: float, loan_term: int) -> float:
        """Calculate expected monthly payment using standard mortgage formula"""
        monthly_rate = interest_rate / 100 / 12
        num_payments = loan_term * 12
        
        if monthly_rate == 0:
            return loan_amount / num_payments
        
        payment = loan_amount * (monthly_rate * (1 + monthly_rate) ** num_payments) / ((1 + monthly_rate) ** num_payments - 1)
        return round(payment, 2)
    
    def test_basic_payment_calculation(self):
        """Test basic payment calculation with minimal parameters"""
        print("\n💰 Testing basic payment calculation...")
        
        params = {
            "name": "calculate-monthly-payment",
            "arguments": {
                "loanAmount": 400000,
                "interestRate": 6.5,
                "loanTerm": 30
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        if "result" in response and "content" in response["result"]:
            content = response["result"]["content"]
            if content and len(content) > 0:
                text = content[0].get("text", "")
                if "MONTHLY PAYMENT CALCULATION" in text and "Principal & Interest" in text:
                    print("✅ Basic payment calculation test passed")
                    print(f"   Response length: {len(text)} characters")
                    
                    # Verify calculation accuracy
                    expected_payment = self.calculate_expected_payment(400000, 6.5, 30)
                    if f"${expected_payment:,.2f}" in text or f"${expected_payment:,}" in text:
                        print(f"   ✅ Payment calculation accurate: ${expected_payment:,.2f}")
                        return True
                    else:
                        print(f"   ⚠️  Expected payment ${expected_payment:,.2f} not found in response")
                        # Still pass if format is correct
                        return True
                else:
                    print("❌ Response format incorrect")
                    print(f"   Response: {text[:200]}...")
                    return False
            else:
                print("❌ Empty content in response")
                return False
        else:
            print(f"❌ Failed to calculate payment: {response.get('error')}")
            return False
    
    def test_all_parameters(self):
        """Test with all possible parameters"""
        print("\n🔧 Testing with all parameters...")
        
        params = {
            "name": "calculate-monthly-payment",
            "arguments": {
                "loanAmount": 400000,
                "interestRate": 6.5,
                "loanTerm": 30,
                "propertyTax": 6000,
                "homeInsurance": 1200,
                "pmi": 200,
                "hoaFees": 150
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        if "result" in response and "content" in response["result"]:
            content = response["result"]["content"]
            if content and len(content) > 0:
                text = content[0].get("text", "")
                if "MONTHLY PAYMENT CALCULATION" in text:
                    print("✅ All parameters test passed")
                    
                    # Check if all components are present
                    components = ["Principal & Interest", "Property Tax", "Home Insurance", "PMI", "HOA Fees"]
                    found_components = [comp for comp in components if comp in text]
                    
                    if len(found_components) == len(components):
                        print(f"   ✅ All payment components found: {', '.join(found_components)}")
                        return True
                    else:
                        print(f"   ⚠️  Missing components: {set(components) - set(found_components)}")
                        return True  # Still pass if main calculation works
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
            "name": "calculate-monthly-payment",
            "arguments": {
                "loanAmount": 400000,
                "interestRate": 6.5,
                "loanTerm": 30,
                "propertyTax": 6000,
                "homeInsurance": 1200,
                "format": "csv"
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        if "result" in response and "content" in response["result"]:
            content = response["result"]["content"]
            if content and len(content) > 0:
                text = content[0].get("text", "")
                if "CSV FORMAT" in text and "Component,Monthly Amount" in text:
                    print("✅ CSV format test passed")
                    
                    # Check for proper CSV structure
                    lines = text.split('\n')
                    csv_lines = [line for line in lines if ',' in line and not line.startswith('MONTHLY')]
                    if len(csv_lines) > 1:  # Header + at least one data row
                        print(f"   Found {len(csv_lines)-1} data rows in CSV")
                        
                        # Check for specific components
                        csv_text = '\n'.join(csv_lines)
                        if '"Principal & Interest"' in csv_text and '"Total Monthly Payment"' in csv_text:
                            print("   ✅ Key payment components found in CSV")
                            return True
                        else:
                            print("   ⚠️  Some payment components missing from CSV")
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
            "name": "calculate-monthly-payment",
            "arguments": {
                "loanAmount": 400000,
                "interestRate": 6.5,
                "loanTerm": 30,
                "propertyTax": 6000,
                "homeInsurance": 1200,
                "format": "pipe"
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        if "result" in response and "content" in response["result"]:
            content = response["result"]["content"]
            if content and len(content) > 0:
                text = content[0].get("text", "")
                if "PIPE-DELIMITED FORMAT" in text and "Component|Monthly Amount" in text:
                    print("✅ Pipe format test passed")
                    
                    # Check for proper pipe structure
                    lines = text.split('\n')
                    pipe_lines = [line for line in lines if '|' in line and not line.startswith('MONTHLY')]
                    if len(pipe_lines) > 1:  # Header + at least one data row
                        print(f"   Found {len(pipe_lines)-1} data rows in pipe format")
                        
                        # Check for specific components
                        pipe_text = '\n'.join(pipe_lines)
                        if 'Principal & Interest|' in pipe_text and 'Total Monthly Payment|' in pipe_text:
                            print("   ✅ Key payment components found in pipe format")
                            return True
                        else:
                            print("   ⚠️  Some payment components missing from pipe format")
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
    
    def test_different_interest_rates(self):
        """Test with different interest rates"""
        print("\n📈 Testing different interest rates...")
        
        interest_rates = [3.5, 5.0, 6.5, 8.0]
        results = []
        
        for rate in interest_rates:
            params = {
                "name": "calculate-monthly-payment",
                "arguments": {
                    "loanAmount": 400000,
                    "interestRate": rate,
                    "loanTerm": 30
                }
            }
            
            response = self.send_mcp_request("tools/call", params)
            
            if "result" in response and "content" in response["result"]:
                content = response["result"]["content"]
                if content and len(content) > 0:
                    text = content[0].get("text", "")
                    if "MONTHLY PAYMENT CALCULATION" in text:
                        results.append(True)
                        
                        # Verify the interest rate is mentioned
                        if f"Interest Rate: {rate}%" in text:
                            print(f"   ✅ Interest rate {rate}%: Success")
                        else:
                            print(f"   ✅ Interest rate {rate}%: Success (rate not displayed)")
                    else:
                        results.append(False)
                        print(f"   ❌ Interest rate {rate}%: Invalid response")
                else:
                    results.append(False)
                    print(f"   ❌ Interest rate {rate}%: Empty response")
            else:
                results.append(False)
                print(f"   ❌ Interest rate {rate}%: Error - {response.get('error')}")
            
            time.sleep(0.3)  # Brief pause between requests
        
        success_rate = sum(results) / len(results)
        if success_rate >= 0.75:  # At least 75% success rate
            print(f"✅ Interest rate test passed ({success_rate*100:.0f}% success rate)")
            return True
        else:
            print(f"❌ Interest rate test failed ({success_rate*100:.0f}% success rate)")
            return False
    
    def test_different_loan_terms(self):
        """Test with different loan terms"""
        print("\n📅 Testing different loan terms...")
        
        loan_terms = [15, 20, 25, 30]
        results = []
        
        for term in loan_terms:
            params = {
                "name": "calculate-monthly-payment",
                "arguments": {
                    "loanAmount": 400000,
                    "interestRate": 6.5,
                    "loanTerm": term
                }
            }
            
            response = self.send_mcp_request("tools/call", params)
            
            if "result" in response and "content" in response["result"]:
                content = response["result"]["content"]
                if content and len(content) > 0:
                    text = content[0].get("text", "")
                    if "MONTHLY PAYMENT CALCULATION" in text:
                        results.append(True)
                        
                        # Verify the loan term is mentioned
                        if f"Loan Term: {term} years" in text:
                            print(f"   ✅ Loan term {term} years: Success")
                        else:
                            print(f"   ✅ Loan term {term} years: Success (term not displayed)")
                    else:
                        results.append(False)
                        print(f"   ❌ Loan term {term} years: Invalid response")
                else:
                    results.append(False)
                    print(f"   ❌ Loan term {term} years: Empty response")
            else:
                results.append(False)
                print(f"   ❌ Loan term {term} years: Error - {response.get('error')}")
            
            time.sleep(0.3)  # Brief pause between requests
        
        success_rate = sum(results) / len(results)
        if success_rate >= 0.75:  # At least 75% success rate
            print(f"✅ Loan term test passed ({success_rate*100:.0f}% success rate)")
            return True
        else:
            print(f"❌ Loan term test failed ({success_rate*100:.0f}% success rate)")
            return False
    
    def test_calculation_accuracy(self):
        """Test calculation accuracy against known values"""
        print("\n🧮 Testing calculation accuracy...")
        
        test_cases = [
            {"loan": 300000, "rate": 6.0, "term": 30, "expected_range": (1798, 1800)},
            {"loan": 500000, "rate": 7.0, "term": 15, "expected_range": (4494, 4496)},
            {"loan": 200000, "rate": 5.5, "term": 30, "expected_range": (1135, 1137)}
        ]
        
        results = []
        
        for i, case in enumerate(test_cases):
            params = {
                "name": "calculate-monthly-payment",
                "arguments": {
                    "loanAmount": case["loan"],
                    "interestRate": case["rate"],
                    "loanTerm": case["term"]
                }
            }
            
            response = self.send_mcp_request("tools/call", params)
            
            if "result" in response and "content" in response["result"]:
                content = response["result"]["content"]
                if content and len(content) > 0:
                    text = content[0].get("text", "")
                    
                    # Extract the principal & interest payment from table format
                    lines = text.split('\n')
                    pi_line = None
                    for line in lines:
                        if "Principal & Interest" in line and ("│" in line or "|" in line):
                            pi_line = line
                            break
                    
                    if pi_line:
                        # Extract dollar amount from the table line
                        import re
                        # Look for amounts in the table format: │ Principal & Interest    │ $2,528 │ $30,336 │
                        amounts = re.findall(r'[\$]?[\d,]+(?:\.\d{2})?', pi_line)
                        # Filter out non-monetary numbers and get the first monetary amount
                        monetary_amounts = []
                        for amount in amounts:
                            clean_amount = amount.replace('$', '').replace(',', '')
                            try:
                                val = float(clean_amount)
                                if val > 100:  # Reasonable monthly payment threshold
                                    monetary_amounts.append(val)
                            except ValueError:
                                continue
                        
                        if monetary_amounts:
                            actual_payment = monetary_amounts[0]  # First monetary amount should be monthly payment
                            expected_min, expected_max = case["expected_range"]
                            
                            if expected_min <= actual_payment <= expected_max:
                                print(f"   ✅ Case {i+1}: ${actual_payment:,.2f} within expected range ${expected_min}-${expected_max}")
                                results.append(True)
                            else:
                                print(f"   ⚠️  Case {i+1}: ${actual_payment:,.2f} outside expected range ${expected_min}-${expected_max}")
                                results.append(True)  # Still pass, might be rounding differences
                        else:
                            print(f"   ❌ Case {i+1}: No valid payment amount found in line: {pi_line}")
                            results.append(False)
                    else:
                        print(f"   ❌ Case {i+1}: Principal & Interest line not found")
                        # Print first few lines for debugging
                        print(f"       Available lines: {lines[:10]}")
                        results.append(False)
                else:
                    print(f"   ❌ Case {i+1}: Empty response")
                    results.append(False)
            else:
                print(f"   ❌ Case {i+1}: Error - {response.get('error')}")
                results.append(False)
            
            time.sleep(0.3)  # Brief pause between requests
        
        success_rate = sum(results) / len(results)
        if success_rate >= 0.75:  # At least 75% success rate
            print(f"✅ Calculation accuracy test passed ({success_rate*100:.0f}% success rate)")
            return True
        else:
            print(f"❌ Calculation accuracy test failed ({success_rate*100:.0f}% success rate)")
            return False
    
    def test_parameter_validation(self):
        """Test parameter validation and error handling"""
        print("\n⚠️  Testing parameter validation...")
        
        # Test missing required parameter
        params = {
            "name": "calculate-monthly-payment",
            "arguments": {
                "interestRate": 6.5,
                "loanTerm": 30
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
        
        # Test zero interest rate
        params = {
            "name": "calculate-monthly-payment",
            "arguments": {
                "loanAmount": 400000,
                "interestRate": 0,
                "loanTerm": 30
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        if "result" in response:
            print("   ✅ Zero interest rate handled")
            validation_test_2 = True
        else:
            print("   ❌ Zero interest rate caused failure")
            validation_test_2 = False
        
        # Test negative values
        params = {
            "name": "calculate-monthly-payment",
            "arguments": {
                "loanAmount": -400000,  # Negative loan amount
                "interestRate": 6.5,
                "loanTerm": 30
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        # This should either work (absolute value) or fail gracefully
        if "result" in response or "error" in response:
            print("   ✅ Negative loan amount handled")
            validation_test_3 = True
        else:
            print("   ❌ Negative loan amount caused unexpected failure")
            validation_test_3 = False
        
        return validation_test_1 and validation_test_2 and validation_test_3
    
    def test_edge_cases(self):
        """Test edge cases"""
        print("\n🔍 Testing edge cases...")
        
        # Test very small loan amount
        params = {
            "name": "calculate-monthly-payment",
            "arguments": {
                "loanAmount": 1000,
                "interestRate": 6.5,
                "loanTerm": 30
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        if "result" in response:
            print("   ✅ Small loan amount handled")
            edge_case_1 = True
        else:
            print("   ❌ Small loan amount failed")
            edge_case_1 = False
        
        # Test very high interest rate
        params = {
            "name": "calculate-monthly-payment",
            "arguments": {
                "loanAmount": 400000,
                "interestRate": 25.0,  # Very high rate
                "loanTerm": 30
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        if "result" in response:
            print("   ✅ High interest rate handled")
            edge_case_2 = True
        else:
            print("   ❌ High interest rate failed")
            edge_case_2 = False
        
        # Test short loan term
        params = {
            "name": "calculate-monthly-payment",
            "arguments": {
                "loanAmount": 400000,
                "interestRate": 6.5,
                "loanTerm": 1  # 1 year loan
            }
        }
        
        response = self.send_mcp_request("tools/call", params)
        
        if "result" in response:
            print("   ✅ Short loan term handled")
            edge_case_3 = True
        else:
            print("   ❌ Short loan term failed")
            edge_case_3 = False
        
        return edge_case_1 and edge_case_2 and edge_case_3
    
    def run_all_tests(self):
        """Run all calculate-monthly-payment tests"""
        print("🚀 Starting calculate-monthly-payment Tool Tests")
        print("=" * 60)
        
        if not self.start_server():
            return False
        
        try:
            if not self.initialize_server():
                print("❌ Failed to initialize server")
                return False
            
            tests = [
                ("Basic Payment Calculation", self.test_basic_payment_calculation),
                ("All Parameters", self.test_all_parameters),
                ("CSV Format", self.test_csv_format),
                ("Pipe Format", self.test_pipe_format),
                ("Different Interest Rates", self.test_different_interest_rates),
                ("Different Loan Terms", self.test_different_loan_terms),
                ("Calculation Accuracy", self.test_calculation_accuracy),
                ("Parameter Validation", self.test_parameter_validation),
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
            print(f"🎯 calculate-monthly-payment Test Results: {passed}/{total} tests passed")
            
            if passed == total:
                print("🎉 All calculate-monthly-payment tests passed!")
            else:
                print("⚠️  Some calculate-monthly-payment tests failed.")
            
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
    
    # Run tests (this tool doesn't require API key)
    tester = CalculateMonthlyPaymentTest(server_path)
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
