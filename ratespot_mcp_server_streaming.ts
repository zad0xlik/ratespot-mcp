import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import * as net from "net";
import * as crypto from "crypto";

// Load environment variables
dotenv.config();

// Environment variable for API key
const RATESPOT_API_KEY = process.env.RATESPOT_API_KEY;
const RATESPOT_BASE_URL = "https://api.ratespot.io";

if (!RATESPOT_API_KEY) {
  console.error("RATESPOT_API_KEY environment variable is required");
  process.exit(1);
}

// Create data directory if it doesn't exist
const DATA_DIR = path.join(__dirname, 'data');

// Add debugging information
console.error(`Current working directory: ${process.cwd()}`);
console.error(`Script directory: ${__dirname}`);
console.error(`Data directory will be: ${DATA_DIR}`);

// Create directory with improved error handling
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.error(`Created data directory: ${DATA_DIR}`);
  } else {
    console.error(`Data directory already exists: ${DATA_DIR}`);
  }
} catch (error) {
  console.error(`Failed to create data directory: ${error instanceof Error ? error.message : String(error)}`);
  console.error(`Attempted path: ${DATA_DIR}`);
  console.error(`This error suggests a permissions issue or invalid path.`);
  process.exit(1);
}

// Simple HTTP server for file downloads
let fileServer: http.Server | null = null;

// Get port from environment or use default
const FILE_SERVER_PORT = process.env.FILE_SERVER_PORT ? parseInt(process.env.FILE_SERVER_PORT) : 3001;

// Active streaming sessions storage
interface StreamingSession {
  id: string;
  status: 'processing' | 'partial' | 'complete' | 'error';
  data: any[];
  metadata: any;
  createdAt: Date;
  lastAccessed: Date;
  error?: string;
  totalExpected?: number;
  receivedCount: number;
}

const activeStreams = new Map<string, StreamingSession>();

// Clean up old sessions periodically (every 5 minutes)
setInterval(() => {
  const now = new Date();
  const maxAge = 30 * 60 * 1000; // 30 minutes
  
  Array.from(activeStreams.entries()).forEach(([id, session]) => {
    if (now.getTime() - session.lastAccessed.getTime() > maxAge) {
      console.error(`Cleaning up old streaming session: ${id}`);
      activeStreams.delete(id);
    }
  });
}, 5 * 60 * 1000);

// Helper function to save CSV file
async function saveCSVFile(csvData: string, fileType: string, searchParams?: any): Promise<{ filePath: string, fileName: string, downloadUrl: string }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T');
  const dateStr = timestamp[0];
  const timeStr = timestamp[1].split('-')[0] + timestamp[1].split('-')[1];
  
  const fileName = `${fileType}_${dateStr}_${timeStr}.csv`;
  const filePath = path.join(DATA_DIR, fileName);
  
  // Add metadata header to CSV
  let csvWithMetadata = '';
  if (searchParams) {
    csvWithMetadata += `# Generated on: ${new Date().toISOString()}\n`;
    csvWithMetadata += `# Search Parameters: ${JSON.stringify(searchParams)}\n`;
    csvWithMetadata += `# File Type: ${fileType}\n`;
    csvWithMetadata += '\n';
  }
  csvWithMetadata += csvData;
  
  // Write file
  await fs.promises.writeFile(filePath, csvWithMetadata, 'utf8');
  
  // Start file server if not already running
  if (!fileServer) {
    await startFileServer();
  }
  
  // Get the actual port the server is running on
  const address = fileServer?.address();
  if (!address) {
    throw new Error('File server not running');
  }
  const port = typeof address === 'string' ? parseInt(address) : (address as net.AddressInfo).port;
  if (!port) {
    throw new Error('File server port not available');
  }
  console.error(`File server running on port ${port}`);
  const downloadUrl = `http://localhost:${port}/download/${fileName}`;
  
  return {
    filePath,
    fileName,
    downloadUrl
  };
}

// Start HTTP server for file downloads
async function startFileServer(initialPort: number = FILE_SERVER_PORT): Promise<void> {
  if (fileServer) return;
  
  const tryPort = (port: number): Promise<number> => {
    return new Promise((resolve, reject) => {
      const server = http.createServer();
      server.once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`Port ${port} in use, trying ${port + 1}`);
          resolve(tryPort(port + 1));
        } else {
          reject(err);
        }
      });
      server.once('listening', () => {
        server.close();
        resolve(port);
      });
      server.listen(port);
    });
  };

  const availablePort = await tryPort(initialPort);
  console.error(`Starting file server on port ${availablePort}`);
  
  fileServer = http.createServer((req, res) => {
    const url = new URL(req.url!, `http://localhost:${FILE_SERVER_PORT}`);
    
    if (url.pathname.startsWith('/download/')) {
      const fileName = url.pathname.replace('/download/', '');
      const filePath = path.join(DATA_DIR, fileName);
      
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
      } else {
        res.statusCode = 404;
        res.end('File not found');
      }
    } else if (url.pathname === '/list') {
      // List available files
      try {
        const files = fs.readdirSync(DATA_DIR)
          .filter(file => file.endsWith('.csv'))
          .map(file => {
            const filePath = path.join(DATA_DIR, file);
            const stats = fs.statSync(filePath);
            return {
              name: file,
              size: stats.size,
              created: stats.birthtime,
              downloadUrl: `http://localhost:${FILE_SERVER_PORT}/download/${file}`
            };
          });
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify(files, null, 2));
      } catch (error) {
        res.statusCode = 500;
        res.end('Error listing files');
      }
    } else {
      res.statusCode = 404;
      res.end('Not found');
    }
  });
  
  fileServer.listen(availablePort, () => {
    console.error(`File server running on http://localhost:${availablePort}`);
  });
}

// Create MCP server
const server = new McpServer({
  name: "RateSpot Mortgage Server (Streaming)",
  version: "2.1.0"
});

// Helper function to format foreclosure listings as markdown
function formatForeclosuresMarkdown(listings: any[]): string {
  let markdown = "# Foreclosure Listings\n\n";
  
  if (listings.length === 0) {
    return markdown + "No foreclosure listings found.";
  }

  markdown += `Found ${listings.length} foreclosure listings:\n\n`;
  
  for (const listing of listings) {
    markdown += `## ${listing.address}\n`;
    markdown += `**Price:** $${listing.price.toLocaleString()}\n`;
    markdown += `**Status:** ${listing.status}\n`;
    markdown += `**Property Type:** ${listing.propertyType}\n`;
    markdown += `**Bedrooms:** ${listing.beds}\n`;
    markdown += `**Bathrooms:** ${listing.baths}\n`;
    markdown += `**Square Feet:** ${listing.sqft.toLocaleString()}\n`;
    markdown += `**Auction Date:** ${listing.auctionDate || 'Not scheduled'}\n`;
    markdown += `**Location:** [View on Map](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.address)})\n\n`;
  }

  return markdown;
}

// Helper function to format foreclosure listings as CSV
function formatForeclosuresCSV(listings: any[]): string {
  let csv = "Address,Price,Status,Property Type,Beds,Baths,Square Feet,Auction Date,Latitude,Longitude\n";
  
  for (const listing of listings) {
    const row = [
      escapeCSVField(listing.address),
      escapeCSVField(listing.price),
      escapeCSVField(listing.status),
      escapeCSVField(listing.propertyType),
      escapeCSVField(listing.beds),
      escapeCSVField(listing.baths),
      escapeCSVField(listing.sqft),
      escapeCSVField(listing.auctionDate || ''),
      escapeCSVField(listing.latitude),
      escapeCSVField(listing.longitude)
    ].join(',');
    
    csv += row + '\n';
  }
  
  return csv;
}

// Helper function to generate map HTML
function generateMapHTML(listings: any[]): string {
  const center = listings[0] || { latitude: 37.7749, longitude: -122.4194 }; // Default to SF
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Foreclosure Listings Map</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
  <style>
    #map { height: 600px; width: 100%; }
    .listing-popup { max-width: 300px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map').setView([${center.latitude}, ${center.longitude}], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    const listings = ${JSON.stringify(listings)};
    const bounds = L.latLngBounds();
    
    listings.forEach(listing => {
      const marker = L.marker([listing.latitude, listing.longitude])
        .bindPopup(\`
          <div class="listing-popup">
            <h3>\${listing.address}</h3>
            <p><strong>Price:</strong> $\${listing.price.toLocaleString()}</p>
            <p><strong>Status:</strong> \${listing.status}</p>
            <p><strong>Property:</strong> \${listing.propertyType}</p>
            <p><strong>Specs:</strong> \${listing.beds} beds, \${listing.baths} baths, \${listing.sqft.toLocaleString()} sqft</p>
            <p><strong>Auction:</strong> \${listing.auctionDate || 'Not scheduled'}</p>
          </div>
        \`);
      marker.addTo(map);
      bounds.extend([listing.latitude, listing.longitude]);
    });
    
    map.fitBounds(bounds);
  </script>
</body>
</html>
`;
}

// Helper function to properly escape CSV fields according to RFC 4180
function escapeCSVField(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If the field contains comma, quote, or newline, it must be quoted
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    // Escape internal quotes by doubling them, then wrap in quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

// Helper function to format mortgage products as CSV
function formatMortgageProductsAsCSV(events: any[]): string {
  // Filter to only mortgage product events
  const mortgageProducts = events.filter(e => e.event === 'mortgage_product');
  
  if (mortgageProducts.length === 0) {
    return "No mortgage products found.";
  }

  // Sort by rate (lowest first)
  mortgageProducts.sort((a, b) => (a.data.rate || 999) - (b.data.rate || 999));
  
  // CSV header
  let csv = "Lender Name,Rate (%),APR (%),Monthly Payment ($),Points,Upfront Costs ($),Loan Type,Quote Type,Rate Description,Rate Lock (days),Purchase Price ($),Down Payment ($),Mortgage Balance ($),Credit Score,ZIP Code\n";
  
  // Add rows with proper CSV escaping
  for (const product of mortgageProducts) {
    const data = product.data;
    const row = [
      escapeCSVField(data.lender_name || ''),
      escapeCSVField(data.rate || ''),
      escapeCSVField(data.apr || ''),
      escapeCSVField(data.mo_payment || ''),
      escapeCSVField(data.points || ''),
      escapeCSVField(data.upfront_costs || ''),
      escapeCSVField(data.loan_type || ''),
      escapeCSVField(data.quote_type === 'ws' ? 'Wholesale' : 'Retail'),
      escapeCSVField(data.rate_desc || ''),
      escapeCSVField(data.rate_lock_used || ''),
      escapeCSVField(data.purchase_price || ''),
      escapeCSVField(data.down_payment || ''),
      escapeCSVField(data.mortgage_balance || ''),
      escapeCSVField(data.credit_score || ''),
      escapeCSVField(data.zipcode || '')
    ].join(',');
    
    csv += row + '\n';
  }
  
  return csv;
}

// Helper function to make streaming API request
async function makeRateSpotStreamingRequest(params: any, sessionId: string) {
  const session = activeStreams.get(sessionId);
  if (!session) {
    throw new Error('Invalid session ID');
  }

  try {
    const queryParams = new URLSearchParams();
    
    // Add API key first
    queryParams.append('apikey', RATESPOT_API_KEY!);
    
    // Add all parameters to the query string
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        const formattedValue = typeof value === 'number' ? value.toString() : String(value);
        queryParams.append(key, formattedValue);
      }
    }

    const url = `${RATESPOT_BASE_URL}/v1/mortgage_products?${queryParams.toString()}`;
    console.error(`Making streaming request to: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`);
    }

    // Process the response in chunks
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body available');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let eventCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        // Process any remaining buffer
        if (buffer.trim()) {
          processEventBuffer(buffer, session);
        }
        session.status = 'complete';
        break;
      }

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete events in the buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.startsWith('event:') || line.startsWith('data:')) {
          processEventLine(line, session);
          eventCount++;
          
          // Update session periodically
          if (eventCount % 10 === 0) {
            session.lastAccessed = new Date();
          }
        }
      }
      
      // Mark as partial after receiving first chunk
      if (session.status === 'processing' && eventCount > 0) {
        session.status = 'partial';
      }
    }

    console.error(`Streaming complete. Received ${session.data.length} events`);
    
  } catch (error) {
    session.status = 'error';
    session.error = error instanceof Error ? error.message : String(error);
    throw error;
  }
}

// Helper to process event buffer
function processEventBuffer(buffer: string, session: StreamingSession) {
  const lines = buffer.split('\n');
  let currentEvent: any = {};
  
  for (const line of lines) {
    if (line.startsWith('event:')) {
      currentEvent.event = line.substring(6).trim();
    } else if (line.startsWith('data:')) {
      try {
        currentEvent.data = JSON.parse(line.substring(5).trim());
        session.data.push({ ...currentEvent });
        session.receivedCount++;
        currentEvent = {};
      } catch (e) {
        console.error(`Failed to parse JSON: ${line}`);
      }
    }
  }
}

// Helper to process a single event line
function processEventLine(line: string, session: StreamingSession) {
  if (!session.metadata.currentEvent) {
    session.metadata.currentEvent = {};
  }
  
  if (line.startsWith('event:')) {
    session.metadata.currentEvent.event = line.substring(6).trim();
  } else if (line.startsWith('data:')) {
    try {
      session.metadata.currentEvent.data = JSON.parse(line.substring(5).trim());
      session.data.push({ ...session.metadata.currentEvent });
      session.receivedCount++;
      session.metadata.currentEvent = {};
    } catch (e) {
      console.error(`Failed to parse JSON: ${line}`);
    }
  }
}

// Helper function to parse mortgage results into structured format
function parseMortgageResults(events: any[], searchParams: any): any {
  // Filter to only mortgage product events
  const mortgageProducts = events.filter(e => e.event === 'mortgage_product');
  
  if (mortgageProducts.length === 0) {
    return {
      rates: [],
      best_rate: null,
      total_products: 0,
      search_params: searchParams
    };
  }

  // Sort by rate (lowest first)
  mortgageProducts.sort((a, b) => (a.data.rate || 999) - (b.data.rate || 999));
  
  // Parse rates into structured format
  const rates = mortgageProducts.map(product => {
    const data = product.data;
    return {
      lender: data.lender_name || '',
      rate: data.rate ? `${data.rate.toFixed(3)}%` : 'N/A',
      apr: data.apr ? `${data.apr.toFixed(3)}%` : 'N/A',
      payment: data.mo_payment ? `$${data.mo_payment.toLocaleString()}` : 'N/A',
      points: data.points || 0,
      upfront_costs: data.upfront_costs ? `$${data.upfront_costs.toLocaleString()}` : 'N/A',
      loan_type: data.loan_type || '',
      quote_type: data.quote_type === 'ws' ? 'Wholesale' : 'Retail',
      rate_lock_days: data.rate_lock_used || 30,
      raw_payment: data.mo_payment || 0,
      raw_rate: data.rate || 0,
      raw_apr: data.apr || 0,
      raw_upfront: data.upfront_costs || 0
    };
  });

  const bestRate = rates.length > 0 ? rates[0] : null;

  return {
    rates: rates,
    best_rate: bestRate,
    total_products: rates.length,
    search_params: searchParams
  };
}

// Helper function to format as markdown table
function formatMarkdownTable(data: any): string {
  const rates = data.rates.slice(0, 20); // Top 20
  
  let table = "# Mortgage Rates Comparison\n\n";
  table += `**Found ${data.total_products} mortgage products (showing top ${rates.length})**\n\n`;
  
  table += "| Lender | Rate | APR | Payment | Points | Upfront | Loan Type | Quote Type | Rate Lock |\n";
  table += "|--------|------|-----|---------|--------|---------|-----------|------------|----------|\n";
  
  for (const rate of rates) {
    table += `| ${rate.lender} | ${rate.rate} | ${rate.apr} | ${rate.payment} | ${rate.points} | ${rate.upfront_costs} | ${rate.loan_type} | ${rate.quote_type} | ${rate.rate_lock_days} days |\n`;
  }
  
  if (data.best_rate) {
    const best = data.best_rate;
    table += `\n## Best Rate Details\n\n`;
    table += `**Lender:** ${best.lender}\n`;
    table += `**Rate:** ${best.rate}\n`;
    table += `**APR:** ${best.apr}\n`;
    table += `**Monthly Payment:** ${best.payment}\n`;
    table += `**Points:** ${best.points}\n`;
    table += `**Upfront Costs:** ${best.upfront_costs}\n`;
    table += `**Loan Type:** ${best.loan_type}\n`;
    table += `**Quote Type:** ${best.quote_type}\n`;
    table += `**Rate Lock:** ${best.rate_lock_days} days\n`;
  }
  
  return table;
}

// Get Mortgage Rates Tool - Now with streaming support
server.tool(
  "get-mortgage-rates",
  {
    loanAmount: z.number().optional().describe("Loan amount in dollars"),
    creditScore: z.number().optional().describe("Credit score (300-850)"),
    downPayment: z.number().optional().describe("Down payment amount in dollars"),
    propertyValue: z.number().optional().describe("Property value in dollars"),
    loanType: z.string().optional().describe("Loan type (conventional, fha, va, usda)"),
    propertyType: z.string().optional().describe("Property type (single_family, condo, townhouse, multi_family)"),
    occupancy: z.string().optional().describe("Occupancy type (primary, secondary, investment)"),
    state: z.string().optional().describe("State abbreviation (e.g., CA, TX, NY)"),
    zipCode: z.string().optional().describe("ZIP code"),
    loanTerm: z.number().optional().describe("Loan term in years (15, 30, etc.)"),
    rateType: z.string().optional().describe("Rate type (fixed, arm)"),
    format: z.enum(["structured", "markdown", "csv", "pipe"]).optional().default("markdown").describe("Output format"),
    streaming: z.boolean().optional().default(true).describe("Use streaming mode for faster initial response")
  },
  async (params) => {
    try {
      const propertyValue = params.propertyValue || 500000;
      const downPaymentAmount = params.downPayment || 100000;
      const downPaymentPercent = Math.round((downPaymentAmount / propertyValue) * 100);

      const queryParams = {
        purpose: "purchase",
        zipcode: params.zipCode || "90210",
        property_value: propertyValue,
        down_payment: downPaymentPercent,
        credit_score: params.creditScore || 790,
        fha: 1,
        va: 1,
        property_type: params.propertyType || "single_family",
        property_use: params.occupancy || "primary"
      };

      const searchParams = {
        propertyValue: propertyValue,
        downPayment: downPaymentAmount,
        loanAmount: params.loanAmount,
        creditScore: params.creditScore || 790,
        loanType: params.loanType,
        propertyType: params.propertyType || "single_family",
        occupancy: params.occupancy || "primary",
        zipCode: params.zipCode || "90210",
        loanTerm: params.loanTerm,
        rateType: params.rateType,
        state: params.state
      };

      if (params.streaming) {
        // Create a new streaming session
        const sessionId = crypto.randomBytes(16).toString('hex');
        const session: StreamingSession = {
          id: sessionId,
          status: 'processing',
          data: [],
          metadata: { searchParams, queryParams },
          createdAt: new Date(),
          lastAccessed: new Date(),
          receivedCount: 0
        };
        
        activeStreams.set(sessionId, session);
        
        // Start the streaming request in the background
        makeRateSpotStreamingRequest(queryParams, sessionId).catch(error => {
          console.error('Streaming request error:', error);
        });
        
        // Wait a short time for initial data (max 10 seconds)
        const startTime = Date.now();
        while (session.status === 'processing' && Date.now() - startTime < 10000) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Return initial response with session ID
        let response = `🔄 **STREAMING MODE ACTIVE**\n\n`;
        response += `📊 **Session ID:** ${sessionId}\n`;
        response += `⏱️ **Status:** ${session.status}\n`;
        response += `📦 **Products Received:** ${session.receivedCount}\n\n`;
        
        if (session.data.length > 0) {
          const structuredData = parseMortgageResults(session.data, searchParams);
          response += `🏆 **Best Rate So Far:** ${structuredData.best_rate?.rate || 'N/A'} from ${structuredData.best_rate?.lender || 'N/A'}\n\n`;
          
          if (params.format === "markdown") {
            response += formatMarkdownTable(structuredData);
          }
        }
        
        response += `\n💡 **To get more results:**\n`;
        response += `• Use the 'get-streaming-results' tool with sessionId="${sessionId}"\n`;
        response += `• The API is still fetching data in the background\n`;
        response += `• Results will be available for 30 minutes\n`;
        
        return {
          content: [{
            type: "text",
            text: response
          }]
        };
        
      } else {
        // Original non-streaming implementation
        const result = await makeRateSpotRequest(queryParams);
        
        // Format the response based on the requested format
        let formattedResponse: string;
        if (params.format === "structured") {
          const structuredData = parseMortgageResults(result, searchParams);
          formattedResponse = JSON.stringify(structuredData, null, 2);
        } else if (params.format === "csv") {
          const structuredData = parseMortgageResults(result, searchParams);
          const csvData = formatStructuredCSV(structuredData);
          const fileInfo = await saveCSVFile(csvData, "mortgage_rates", searchParams);
          
          formattedResponse = `✅ **CSV FILE SAVED SUCCESSFULLY**\n\n`;
          formattedResponse += `📁 **File:** ${fileInfo.fileName}\n`;
          formattedResponse += `📍 **Location:** ${fileInfo.filePath}\n`;
          formattedResponse += `🔗 **Download Link:** ${fileInfo.downloadUrl}\n\n`;
          formattedResponse += `📊 **Summary:** Found ${structuredData.total_products} mortgage products\n`;
          formattedResponse += `🏆 **Best Rate:** ${structuredData.best_rate?.rate || 'N/A'} from ${structuredData.best_rate?.lender || 'N/A'}\n`;
        } else if (params.format === "pipe") {
          const structuredData = parseMortgageResults(result, searchParams);
          formattedResponse = "MORTGAGE RATES DATA (PIPE-DELIMITED FORMAT)\n";
          formattedResponse += "Copy the data below and save as .txt file:\n\n";
          formattedResponse += formatStructuredPipe(structuredData);
        } else {
          const structuredData = parseMortgageResults(result, searchParams);
          formattedResponse = formatMarkdownTable(structuredData);
        }

        return {
          content: [{
            type: "text",
            text: formattedResponse
          }]
        };
      }
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error fetching mortgage rates: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// New tool to get streaming results
server.tool(
  "get-streaming-results",
  {
    sessionId: z.string().describe("The session ID returned from a streaming request"),
    format: z.enum(["status", "markdown", "csv", "structured"]).optional().default("status").describe("Format for the results")
  },
  async ({ sessionId, format }) => {
    try {
      const session = activeStreams.get(sessionId);
      
      if (!session) {
        return {
          content: [{
            type: "text",
            text: `❌ **Session not found:** ${sessionId}\n\nThe session may have expired or the ID is incorrect.`
          }],
          isError: true
        };
      }
      
      // Update last accessed time
      session.lastAccessed = new Date();
      
      let response = `📊 **STREAMING SESSION STATUS**\n\n`;
      response += `🆔 **Session ID:** ${sessionId}\n`;
      response += `⏱️ **Status:** ${session.status}\n`;
      response += `📦 **Products Received:** ${session.receivedCount}\n`;
      response += `🕐 **Created:** ${session.createdAt.toLocaleString()}\n`;
      response += `🕐 **Last Accessed:** ${session.lastAccessed.toLocaleString()}\n\n`;
      
      if (session.error) {
        response += `❌ **Error:** ${session.error}\n\n`;
      }
      
      if (session.data.length > 0) {
        const structuredData = parseMortgageResults(session.data, session.metadata.searchParams);
        
        if (format === "status") {
          response += `📊 **Summary:**\n`;
          response += `• Total Products: ${structuredData.total_products}\n`;
          response += `• Best Rate: ${structuredData.best_rate?.rate || 'N/A'} from ${structuredData.best_rate?.lender || 'N/A'}\n`;
          response += `• Rate Range: ${structuredData.rates.length > 0 ? `${structuredData.rates[0].rate} - ${structuredData.rates[structuredData.rates.length - 1].rate}` : 'N/A'}\n\n`;
          
          if (session.status === 'partial') {
            response += `⏳ **Note:** Data is still being fetched. Check again for more results.\n`;
          } else if (session.status === 'complete') {
            response += `✅ **Complete:** All data has been fetched.\n`;
          }
        } else if (format === "markdown") {
          response += formatMarkdownTable(structuredData);
        } else if (format === "csv") {
          const csvData = formatStructuredCSV(structuredData);
          const fileInfo = await saveCSVFile(csvData, "mortgage_rates_streaming", session.metadata.searchParams);
          
          response = `✅ **CSV FILE SAVED SUCCESSFULLY**\n\n`;
          response += `📁 **File:** ${fileInfo.fileName}\n`;
          response += `📍 **Location:** ${fileInfo.filePath}\n`;
          response += `🔗 **Download Link:** ${fileInfo.downloadUrl}\n\n`;
          response += `📊 **Summary:** Found ${structuredData.total_products} mortgage products\n`;
          response += `🏆 **Best Rate:** ${structuredData.best_rate?.rate || 'N/A'} from ${structuredData.best_rate?.lender || 'N/A'}\n`;
        } else if (format === "structured") {
          response = JSON.stringify(structuredData, null, 2);
        }
      } else {
        response += `⏳ **No data yet.** The request is still being processed.\n`;
      }
      
      return {
        content: [{
          type: "text",
          text: response
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error getting streaming results: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// Helper function to format CSV from structured data
function formatStructuredCSV(data: any): string {
  const rates = data.rates;
  
  let csv = "Lender,Rate,APR,Payment,Points,Upfront_Costs,Loan_Type,Quote_Type\n";
  
  for (const rate of rates) {
    const row = [
      escapeCSVField(rate.lender),
      escapeCSVField(rate.rate),
      escapeCSVField(rate.apr),
      escapeCSVField(rate.payment),
      escapeCSVField(rate.points),
      escapeCSVField(rate.upfront_costs),
      escapeCSVField(rate.loan_type),
      escapeCSVField(rate.quote_type)
    ].join(',');
    
    csv += row + '\n';
  }
  
  return csv;
}

// Helper function to format pipe-delimited from structured data
function formatStructuredPipe(data: any): string {
  const rates = data.rates;
  
  let output = "Lender|Rate|APR|Payment|Points|Upfront_Costs|Loan_Type|Quote_Type\n";
  
  for (const rate of rates) {
    const row = [
      (rate.lender || '').replace(/\|/g, '-'),
      rate.rate || '',
      rate.apr || '',
      rate.payment || '',
      rate.points || '',
      rate.upfront_costs || '',
      (rate.loan_type || '').replace(/\|/g, '-'),
      (rate.quote_type || '').replace(/\|/g, '-')
    ].join('|');
    
    output += row + '\n';
  }
  
  return output;
}

// Helper function to make API requests (non-streaming version for fallback)
async function makeRateSpotRequest(params: any, timeoutMs: number = 30000) {
  try {
    const queryParams = new URLSearchParams();
    
    // Add API key first
    queryParams.append('apikey', RATESPOT_API_KEY!);
    
    // Add all parameters to the query string
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        const formattedValue = typeof value === 'number' ? value.toString() : String(value);
        queryParams.append(key, formattedValue);
      }
    }

    const url = `${RATESPOT_BASE_URL}/v1/mortgage_products?${queryParams.toString()}`;

    console.error(`Making request to: ${url}`);
    console.error(`With parameters: ${JSON.stringify(params, null, 2)}`);
    console.error(`Timeout set to: ${timeoutMs}ms`);

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms. The RateSpot API typically takes 15-25 seconds to respond.`)), timeoutMs);
    });

    // Create fetch promise
    const fetchPromise = fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });

    // Race between fetch and timeout
    const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed: ${response.status} ${response.statusText}`);
      console.error(`Error details: ${errorText}`);
      throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`);
    }

    // Parse Server-Sent Events response with timeout
    const textPromise = response.text();
    const text = await Promise.race([textPromise, timeoutPromise]) as string;
    
    console.error(`Received response (${text.length} characters)`);
    
    const events = [];
    const lines = text.split('\n');
    
    let currentEvent: any = {};
    
    for (const line of lines) {
      if (line.startsWith('event:')) {
        currentEvent.event = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        try {
          currentEvent.data = JSON.parse(line.substring(5).trim());
          events.push({ ...currentEvent });
          currentEvent = {};
        } catch (e) {
          // Skip malformed JSON
          console.error(`Failed to parse JSON: ${line}`);
        }
      }
    }
    
    console.error(`Parsed ${events.length} events`);
    return events;
  } catch (error) {
    console.error('Error in makeRateSpotRequest:', error);
    throw error;
  }
}

// Get Foreclosures Tool
server.tool(
  "get-foreclosures",
  {
    address: z.string().describe("ZIP code or full address to search around"),
    radius: z.number().optional().default(5).describe("Search radius in miles"),
    format: z.enum(["map", "list", "csv"]).optional().default("list").describe("Output format (map for interactive visualization)")
  },
  async (params) => {
    try {
      const queryParams = new URLSearchParams({
        apikey: RATESPOT_API_KEY!,
        address: params.address,
        radius: params.radius.toString()
      });

      const url = `${RATESPOT_BASE_URL}/real_estate/foreclosure_listings?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();
      const listings = data.listings || [];

      if (params.format === "map") {
        // Generate HTML with interactive map
        const mapHtml = generateMapHTML(listings);
        
        // Save map file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `foreclosures_map_${timestamp}.html`;
        const filePath = path.join(DATA_DIR, fileName);
        
        await fs.promises.writeFile(filePath, mapHtml, 'utf8');
        
        // Start file server if not running
        if (!fileServer) {
          startFileServer();
        }
        
        const mapUrl = `http://localhost:${FILE_SERVER_PORT}/download/${fileName}`;
        
        return {
          content: [{
            type: "text",
            text: `# Foreclosure Listings Map\n\n` +
                  `Found ${listings.length} foreclosure listings near ${params.address}\n\n` +
                  `🗺️ [View Interactive Map](${mapUrl})\n\n` +
                  `The map shows all listings with clickable markers for details.`
          }]
        };
      } else if (params.format === "csv") {
        const csvData = formatForeclosuresCSV(listings);
        const fileInfo = await saveCSVFile(csvData, "foreclosures", { address: params.address, radius: params.radius });
        
        return {
          content: [{
            type: "text",
            text: `✅ **CSV FILE SAVED SUCCESSFULLY**\n\n` +
                  `📁 **File:** ${fileInfo.fileName}\n` +
                  `📍 **Location:** ${fileInfo.filePath}\n` +
                  `🔗 **Download Link:** ${fileInfo.downloadUrl}\n\n` +
                  `📊 **Summary:** Found ${listings.length} foreclosure listings near ${params.address}`
          }]
        };
      } else {
        // Default list format in markdown
        return {
          content: [{
            type: "text",
            text: formatForeclosuresMarkdown(listings)
          }]
        };
      }
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error fetching foreclosure listings: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("RateSpot MCP Server (Streaming) running on stdio");
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
