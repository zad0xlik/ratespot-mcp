import * as http from 'http';
import * as net from 'net';

// First create a server on port 3001 to simulate it being in use
const blockingServer = http.createServer();

// Function to try ports (same as in ratespot_mcp_server_streaming.ts)
function tryPort(port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} in use, trying ${port + 1}`);
        resolve(tryPort(port + 1));
      } else {
        reject(err);
      }
    });
    server.once('listening', () => {
      const actualPort = (server.address() as net.AddressInfo).port;
      console.log(`Found available port: ${actualPort}`);
      server.close();
      resolve(actualPort);
    });
    server.listen(port);
  });
}

// Test the port finding logic
async function testPortIncrement() {
  console.log('Starting port increment test...');
  
  const initialPort = 4001;  // Use a different port range
  console.log(`Testing with initial port: ${initialPort}`);
  
  // Start blocking server and wait for it to be ready
  await new Promise<void>((resolve) => {
    blockingServer.listen(initialPort, () => {
      console.log(`Blocking server running on port ${initialPort}`);
      resolve();
    });
  });
  
  try {
    const availablePort = await tryPort(initialPort);
    console.log(`Final available port: ${availablePort}`);
    
    // Create a test server on the available port
    const testServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`Server running on port ${availablePort}`);
    });
    
    testServer.listen(availablePort, () => {
      console.log(`Test server running on http://localhost:${availablePort}`);
    });
    
    // Keep the script running for a few seconds to check the port
    setTimeout(() => {
      testServer.close();
      blockingServer.close();
      console.log('Test complete - servers closed');
      process.exit(0);
    }, 5000);
    
  } catch (error) {
    console.error('Error during test:', error);
    blockingServer.close();
    process.exit(1);
  }
}

// Run the test
testPortIncrement();
