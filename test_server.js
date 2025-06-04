#!/usr/bin/env node

/**
 * Simple test script to verify the RateSpot MCP server is working
 * This script tests the server's basic functionality without requiring an API key
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing RateSpot MCP Server...\n');

// Test if the compiled server exists
const serverPath = path.join(__dirname, 'ratespot_mcp_server.js');
const fs = require('fs');

if (!fs.existsSync(serverPath)) {
  console.error('❌ Server file not found. Please run "npm run build" first.');
  process.exit(1);
}

console.log('✅ Server file exists');

// Test if we can start the server (it should exit due to missing API key)
const serverProcess = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, RATESPOT_API_KEY: '' } // Intentionally empty to test validation
});

let stderr = '';
let stdout = '';

serverProcess.stdout.on('data', (data) => {
  stdout += data.toString();
});

serverProcess.stderr.on('data', (data) => {
  stderr += data.toString();
});

serverProcess.on('close', (code) => {
  if (code === 1 && stderr.includes('RATESPOT_API_KEY environment variable is required')) {
    console.log('✅ Server correctly validates API key requirement');
    console.log('✅ Server initialization logic is working');
    console.log('\n🎉 Basic server tests passed!');
    console.log('\n📝 Next steps:');
    console.log('1. Set your RATESPOT_API_KEY in the .env file');
    console.log('2. Add the server to your MCP client configuration');
    console.log('3. Test the tools with real API calls');
  } else {
    console.error('❌ Unexpected server behavior');
    console.error('Exit code:', code);
    console.error('STDERR:', stderr);
    console.error('STDOUT:', stdout);
    process.exit(1);
  }
});

// Timeout after 5 seconds
setTimeout(() => {
  serverProcess.kill();
  console.error('❌ Server test timed out');
  process.exit(1);
}, 5000);
