#!/usr/bin/env python3
"""
Test the MCP server directly to see what parameters it's sending
"""

import subprocess
import json
import time

def test_mcp_server():
    """Test the MCP server directly"""
    print("🧪 Testing MCP Server directly")
    print("=" * 50)
    
    try:
        # Start the MCP server
        process = subprocess.Popen(
            ['node', 'ratespot_mcp_server.js'],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=0
        )
        
        print("✅ MCP Server started")
        time.sleep(2)  # Give server time to initialize
        
        # Initialize the server
        init_request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "test-client",
                    "version": "1.0.0"
                }
            }
        }
        
        print("📡 Sending initialize request...")
        process.stdin.write(json.dumps(init_request) + '\n')
        process.stdin.flush()
        
        # Read response
        response_line = process.stdout.readline()
        if response_line:
            init_response = json.loads(response_line.strip())
            print(f"✅ Initialize response: {init_response.get('result', {}).get('protocolVersion', 'Unknown')}")
        
        # Test the get-mortgage-rates tool
        tool_request = {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {
                "name": "get-mortgage-rates",
                "arguments": {
                    "state": "CA",
                    "zipCode": "94949",
                    "loanTerm": 30,
                    "loanType": "conventional",
                    "rateType": "fixed",
                    "occupancy": "primary",
                    "loanAmount": 500000,
                    "creditScore": 740,
                    "downPayment": 125000,
                    "propertyType": "single_family",
                    "propertyValue": 625000
                }
            }
        }
        
        print("📡 Sending tool request...")
        print(f"📋 Request: {json.dumps(tool_request, indent=2)}")
        
        process.stdin.write(json.dumps(tool_request) + '\n')
        process.stdin.flush()
        
        # Read response
        response_line = process.stdout.readline()
        if response_line:
            tool_response = json.loads(response_line.strip())
            print(f"📄 Tool response: {json.dumps(tool_response, indent=2)}")
            
            if "error" in tool_response:
                print(f"❌ Error: {tool_response['error']}")
            elif "result" in tool_response:
                content = tool_response["result"].get("content", [])
                if content:
                    text_content = content[0].get("text", "")
                    if "Error fetching mortgage rates" in text_content:
                        print(f"❌ API Error: {text_content}")
                    else:
                        print("✅ Success! Got mortgage data")
                        # Try to parse as JSON to see if it's valid
                        try:
                            data = json.loads(text_content)
                            print(f"📊 Found {len(data)} events")
                        except:
                            print(f"📄 Response length: {len(text_content)} characters")
        
        # Clean up
        process.terminate()
        process.wait()
        
    except Exception as e:
        print(f"💥 Error: {e}")
        if 'process' in locals():
            process.terminate()

if __name__ == "__main__":
    test_mcp_server()
