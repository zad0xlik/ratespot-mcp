#!/usr/bin/env python3
"""
Comprehensive test runner for all RateSpot MCP Server tools
Runs individual tests for each tool and provides a summary report
"""

import subprocess
import sys
import time
import os
from datetime import datetime

class RateSpotMCPTestRunner:
    def __init__(self):
        self.test_files = [
            ("get-mortgage-rates", "test/test_get_mortgage_rates.py"),
            ("compare-loan-products", "test/test_compare_loan_products.py"),
            ("calculate-monthly-payment", "test/test_calculate_monthly_payment.py")
        ]
        self.results = {}
        
    def check_prerequisites(self):
        """Check if all prerequisites are met"""
        print("🔍 Checking prerequisites...")
        
        # Check if server file exists
        server_path = "ratespot_mcp_server.js"
        if not os.path.exists(server_path):
            print(f"❌ Server file not found: {server_path}")
            print("Please run 'npm run build' first to compile the TypeScript server.")
            return False
        
        # Check if Node.js is available
        try:
            result = subprocess.run(['node', '--version'], capture_output=True, check=True, text=True)
            node_version = result.stdout.strip()
            print(f"✅ Node.js found: {node_version}")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("❌ Node.js not found. Please install Node.js to run the MCP server.")
            return False
        
        # Check if Python is available
        try:
            result = subprocess.run([sys.executable, '--version'], capture_output=True, check=True, text=True)
            python_version = result.stdout.strip()
            print(f"✅ Python found: {python_version}")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("❌ Python not found.")
            return False
        
        # Check for API key
        if not os.getenv('RATESPOT_API_KEY'):
            print("⚠️  RATESPOT_API_KEY environment variable not set.")
            print("   Tests requiring API access may fail without a valid API key.")
            print("   The calculate-monthly-payment tool will still work as it doesn't require API access.")
        else:
            print("✅ RATESPOT_API_KEY environment variable is set")
        
        # Check if test files exist
        missing_tests = []
        for tool_name, test_file in self.test_files:
            if not os.path.exists(test_file):
                missing_tests.append(test_file)
        
        if missing_tests:
            print(f"❌ Missing test files: {', '.join(missing_tests)}")
            return False
        else:
            print(f"✅ All {len(self.test_files)} test files found")
        
        return True
    
    def run_test(self, tool_name, test_file):
        """Run a single test file"""
        print(f"\n{'='*80}")
        print(f"🧪 Running {tool_name} tests...")
        print(f"📁 Test file: {test_file}")
        print(f"⏰ Started at: {datetime.now().strftime('%H:%M:%S')}")
        print(f"{'='*80}")
        
        start_time = time.time()
        
        try:
            # Run the test file
            result = subprocess.run(
                [sys.executable, test_file],
                capture_output=False,  # Let output go to console
                text=True,
                timeout=120  # 2 minute timeout per test
            )
            
            end_time = time.time()
            duration = end_time - start_time
            
            success = result.returncode == 0
            
            self.results[tool_name] = {
                'success': success,
                'duration': duration,
                'return_code': result.returncode
            }
            
            print(f"\n{'='*80}")
            if success:
                print(f"✅ {tool_name} tests PASSED in {duration:.1f} seconds")
            else:
                print(f"❌ {tool_name} tests FAILED in {duration:.1f} seconds (exit code: {result.returncode})")
            print(f"{'='*80}")
            
            return success
            
        except subprocess.TimeoutExpired:
            end_time = time.time()
            duration = end_time - start_time
            
            print(f"\n{'='*80}")
            print(f"⏰ {tool_name} tests TIMED OUT after {duration:.1f} seconds")
            print(f"{'='*80}")
            
            self.results[tool_name] = {
                'success': False,
                'duration': duration,
                'return_code': -1,
                'timeout': True
            }
            
            return False
            
        except Exception as e:
            end_time = time.time()
            duration = end_time - start_time
            
            print(f"\n{'='*80}")
            print(f"💥 {tool_name} tests CRASHED: {e}")
            print(f"{'='*80}")
            
            self.results[tool_name] = {
                'success': False,
                'duration': duration,
                'return_code': -2,
                'exception': str(e)
            }
            
            return False
    
    def print_summary(self):
        """Print a comprehensive test summary"""
        print(f"\n{'='*100}")
        print("📊 RATESPOT MCP SERVER - COMPREHENSIVE TEST SUMMARY")
        print(f"{'='*100}")
        print(f"🕐 Test run completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Overall statistics
        total_tests = len(self.results)
        passed_tests = sum(1 for result in self.results.values() if result['success'])
        failed_tests = total_tests - passed_tests
        total_duration = sum(result['duration'] for result in self.results.values())
        
        print("📈 OVERALL STATISTICS:")
        print(f"   Total Tools Tested: {total_tests}")
        print(f"   Tests Passed: {passed_tests}")
        print(f"   Tests Failed: {failed_tests}")
        print(f"   Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        print(f"   Total Test Duration: {total_duration:.1f} seconds")
        print()
        
        # Individual test results
        print("🔍 INDIVIDUAL TEST RESULTS:")
        print(f"{'Tool Name':<25} {'Status':<10} {'Duration':<12} {'Details'}")
        print("-" * 70)
        
        for tool_name, result in self.results.items():
            status = "✅ PASS" if result['success'] else "❌ FAIL"
            duration = f"{result['duration']:.1f}s"
            
            details = ""
            if not result['success']:
                if result.get('timeout'):
                    details = "TIMEOUT"
                elif result.get('exception'):
                    details = f"EXCEPTION: {result['exception'][:30]}..."
                else:
                    details = f"EXIT CODE: {result['return_code']}"
            
            print(f"{tool_name:<25} {status:<10} {duration:<12} {details}")
        
        print()
        
        # Recommendations
        print("💡 RECOMMENDATIONS:")
        if passed_tests == total_tests:
            print("   🎉 All tests passed! Your RateSpot MCP Server is working perfectly.")
            print("   ✅ The server is ready for production use.")
        else:
            print("   ⚠️  Some tests failed. Please review the detailed output above.")
            
            if not os.getenv('RATESPOT_API_KEY'):
                print("   🔑 Consider setting the RATESPOT_API_KEY environment variable.")
                print("      This is required for get-mortgage-rates and compare-loan-products tools.")
            
            failed_tools = [name for name, result in self.results.items() if not result['success']]
            print(f"   🔧 Failed tools: {', '.join(failed_tools)}")
            print("   📝 Check the detailed test output above for specific error messages.")
        
        print()
        print("📚 NEXT STEPS:")
        print("   1. If tests passed: Your MCP server is ready to use!")
        print("   2. If tests failed: Review error messages and fix issues")
        print("   3. Re-run tests after making changes: python test/run_all_tool_tests.py")
        print("   4. For individual tool testing, run the specific test file")
        
        print(f"\n{'='*100}")
        
        return passed_tests == total_tests
    
    def run_all_tests(self):
        """Run all tool tests"""
        print("🚀 RATESPOT MCP SERVER - COMPREHENSIVE TOOL TESTING")
        print(f"{'='*80}")
        print(f"⏰ Test run started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"🧪 Testing {len(self.test_files)} tools")
        print()
        
        # Check prerequisites
        if not self.check_prerequisites():
            print("\n❌ Prerequisites not met. Aborting test run.")
            return False
        
        print("\n✅ All prerequisites met. Starting tests...")
        
        # Run each test
        overall_success = True
        for tool_name, test_file in self.test_files:
            success = self.run_test(tool_name, test_file)
            if not success:
                overall_success = False
            
            # Brief pause between tests
            if tool_name != self.test_files[-1][0]:  # Not the last test
                print(f"\n⏸️  Pausing 2 seconds before next test...")
                time.sleep(2)
        
        # Print comprehensive summary
        final_success = self.print_summary()
        
        return final_success

def main():
    """Main function"""
    runner = RateSpotMCPTestRunner()
    success = runner.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
