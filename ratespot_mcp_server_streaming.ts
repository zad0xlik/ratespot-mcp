import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { FileServerManager } from './src/FileServerManager.js';

// Initialize file server manager
const fileServerManager = FileServerManager.getInstance();

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
const DATA_DIR = path.join(process.cwd(), 'data');

// Add debugging information
console.error(`Current working directory: ${process.cwd()}`);
console.error(`Script directory: ${process.cwd()}`);
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

// Initialize file server manager with default port from environment
const defaultPort = process.env.FILE_SERVER_PORT ? parseInt(process.env.FILE_SERVER_PORT) : 3001;

// Streaming session interfaces
interface StreamSession {
  id: string;
  status: 'processing' | 'streaming' | 'complete' | 'error';
  data: MortgageProduct[];
  metadata: {
    searchParams: any;
    startTime: Date;
    lastUpdate: Date;
    totalProducts: number;
    previousCount: number;
    stableCount: number;
    pollCount: number;
    error?: string;
  };
}

interface MortgageProduct {
  lender: string;
  rate: number;
  apr: number;
  payment: number;
  points: number;
  upfrontCosts: number;
  loanType: string;
  quoteType: string;
  rateLockDays: number;
  rateDesc?: string;
}

// Active streaming sessions
const activeSessions = new Map<string, StreamSession>();

// Helper function to process SSE data
function processSSEData(data: string): MortgageProduct | null {
  try {
    const product = JSON.parse(data);
    return {
      lender: product.lender_name || '',
      rate: parseFloat(product.rate) || 0,
      apr: parseFloat(product.apr) || 0,
      payment: parseFloat(product.mo_payment) || 0,
      points: parseFloat(product.points) || 0,
      upfrontCosts: parseFloat(product.upfront_costs) || 0,
      loanType: product.loan_type || '',
      quoteType: product.quote_type === 'ws' ? 'Wholesale' : 'Retail',
      rateLockDays: parseInt(product.rate_lock_used) || 30,
      rateDesc: product.rate_desc
    };
  } catch (error) {
    console.error('Error parsing SSE data:', error);
    return null;
  }
}

// Helper function to stream mortgage rates
async function streamMortgageRates(params: any, sessionId: string, isPolling: boolean = false): Promise<void> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error('Invalid session ID');
  }

  try {
    const queryString = new URLSearchParams({
      apikey: RATESPOT_API_KEY!,
      ...params,
      offset: isPolling ? session.data.length.toString() : '0'
    }).toString();

    const url = `${RATESPOT_BASE_URL}/v1/mortgage_products?${queryString}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body available');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let newProducts = 0;

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        if (buffer.trim()) {
          newProducts += processBuffer(buffer, session);
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const product = processSSEData(line.substring(5).trim());
          if (product) {
            // Check for duplicates before adding
            const isDuplicate = session.data.some(p => 
              p.lender === product.lender && 
              p.rate === product.rate && 
              p.apr === product.apr
            );
            
            if (!isDuplicate) {
              session.data.push(product);
              session.metadata.totalProducts++;
              session.metadata.lastUpdate = new Date();
              session.status = 'streaming';
              newProducts++;
            }
          }
        }
      }
    }

    // Only mark as complete if no new products were found during polling
    if (isPolling && newProducts === 0) {
      session.status = 'complete';
      console.error(`No new products found after ${session.metadata.pollCount} polls. Marking as complete.`);
    }
  } catch (error) {
    session.status = 'error';
    session.metadata.error = error instanceof Error ? error.message : String(error);
    throw error;
  }
}

// Helper function to process buffer
function processBuffer(buffer: string, session: StreamSession): number {
  const lines = buffer.split('\n');
  let newProducts = 0;
  
  for (const line of lines) {
    if (line.startsWith('data:')) {
      const product = processSSEData(line.substring(5).trim());
      if (product) {
        // Check for duplicates before adding
        const isDuplicate = session.data.some(p => 
          p.lender === product.lender && 
          p.rate === product.rate && 
          p.apr === product.apr
        );
        
        if (!isDuplicate) {
          session.data.push(product);
          session.metadata.totalProducts++;
          session.metadata.lastUpdate = new Date();
          newProducts++;
        }
      }
    }
  }
  
  return newProducts;
}

// Helper function to format results
function formatResults(session: StreamSession, format: string = 'markdown'): string {
  const products = session.data;
  
  // Sort by rate
  products.sort((a, b) => a.rate - b.rate);
  
  if (format === 'markdown') {
    let output = `# Mortgage Rate Results\n\n`;
    output += `Found ${products.length} mortgage products\n\n`;
    
    output += `| Lender | Rate | APR | Payment | Points | Upfront Costs | Type | Quote |\n`;
    output += `|---------|------|-----|---------|--------|---------------|------|--------|\n`;
    
    for (const product of products) {
      output += `| ${product.lender} | ${product.rate.toFixed(3)}% | ${product.apr.toFixed(3)}% | $${product.payment.toLocaleString()} | ${product.points.toFixed(3)} | $${product.upfrontCosts.toLocaleString()} | ${product.loanType} | ${product.quoteType} |\n`;
    }
    
    return output;
  } else if (format === 'csv') {
    let output = 'Lender,Rate,APR,Payment,Points,Upfront_Costs,Loan_Type,Quote_Type\n';
    
    for (const product of products) {
      output += `${escapeCSV(product.lender)},${product.rate}%,${product.apr}%,$${product.payment},${product.points},$${product.upfrontCosts},${product.loanType},${product.quoteType}\n`;
    }
    
    return output;
  } else {
    return JSON.stringify(products, null, 2);
  }
}

// Helper function to escape CSV fields
function escapeCSV(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

// Clean up old sessions periodically
setInterval(() => {
  const now = new Date();
  const maxAge = 30 * 60 * 1000; // 30 minutes
  
  Array.from(activeSessions.entries()).forEach(([id, session]) => {
    if (now.getTime() - session.metadata.lastUpdate.getTime() > maxAge) {
      activeSessions.delete(id);
    }
  });
}, 5 * 60 * 1000);

// Create MCP server
const server = new McpServer({
  name: "RateSpot Mortgage Server (Streaming)",
  version: "2.1.0"
});

// Get Mortgage Rates Tool
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
    format: z.enum(["structured", "markdown", "csv", "pipe"]).optional().default("markdown").describe("Output format")
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
        fha: params.loanType === 'fha' ? 1 : 0,
        va: params.loanType === 'va' ? 1 : 0,
        property_type: params.propertyType || "single_family",
        property_use: params.occupancy || "primary"
      };

      // Create new streaming session
      const sessionId = crypto.randomBytes(16).toString('hex');
      const session: StreamSession = {
        id: sessionId,
        status: 'processing',
        data: [],
        metadata: {
          searchParams: params,
          startTime: new Date(),
          lastUpdate: new Date(),
          totalProducts: 0,
          previousCount: 0,
          stableCount: 0,
          pollCount: 0
        }
      };
      
      activeSessions.set(sessionId, session);

      // Start streaming in background
      streamMortgageRates(queryParams, sessionId).catch(error => {
        console.error('Streaming error:', error);
        session.status = 'error';
        session.metadata.error = error instanceof Error ? error.message : String(error);
      });

      // Wait briefly for initial data
      await new Promise(resolve => setTimeout(resolve, 2000));

      let response = `🔄 **Streaming Session Started**\n\n`;
      response += `Session ID: ${sessionId}\n`;
      response += `Status: ${session.status}\n`;
      response += `Products received: ${session.data.length}\n\n`;

      if (session.data.length > 0) {
        response += formatResults(session, params.format);
      }

      response += `\n💡 **Note:** More results are being fetched in the background.\n`;
      response += `Use 'get-streaming-results' tool with sessionId="${sessionId}" to get updated results.\n`;

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
          text: `Error fetching mortgage rates: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// Get Streaming Results Tool
server.tool(
  "get-streaming-results",
  {
    sessionId: z.string().describe("Session ID from get-mortgage-rates"),
    format: z.enum(["markdown", "csv", "json"]).optional().default("markdown").describe("Output format"),
    pollInterval: z.number().optional().default(3000).describe("Polling interval in milliseconds"),
    maxAttempts: z.number().optional().default(10).describe("Maximum number of polling attempts"),
    stopOnStable: z.boolean().optional().default(true).describe("Stop polling when record count stabilizes")
  },
  async (params) => {
    try {
      const session = activeSessions.get(params.sessionId);
      
      if (!session) {
        return {
          content: [{
            type: "text",
            text: `Session ${params.sessionId} not found or expired`
          }],
          isError: true
        };
      }

      // Initialize polling metadata if not present
      if (!session.metadata.pollCount) {
        session.metadata.pollCount = 0;
        session.metadata.previousCount = 0;
        session.metadata.stableCount = 0;
      }

      // Update polling metadata
      session.metadata.pollCount++;
      const currentCount = session.data.length;
      const countChanged = currentCount !== session.metadata.previousCount;
      
      if (countChanged) {
        session.metadata.stableCount = 0;
      } else {
        session.metadata.stableCount++;
      }
      
      session.metadata.previousCount = currentCount;

      // Check if we should continue polling
      const shouldPoll = session.status === 'streaming' && 
                        session.metadata.pollCount < params.maxAttempts &&
                        (!params.stopOnStable || session.metadata.stableCount < 2);

      if (shouldPoll) {
        // Schedule next poll and wait for it
        await new Promise(resolve => setTimeout(resolve, params.pollInterval));
        
        try {
          // Fetch additional data with polling flag
          const queryParams = session.metadata.searchParams;
          await streamMortgageRates(queryParams, session.id, true);
          
          // Return early to trigger another poll if needed
          return {
            content: [{
              type: "text",
              text: `🔄 **Auto-polling (Attempt ${session.metadata.pollCount})**\n\n` +
                    `Current products: ${session.data.length}\n` +
                    `Previous count: ${session.metadata.previousCount}\n` +
                    `Status: ${session.status}\n\n` +
                    `⏳ Still receiving data. Polling will continue automatically...`
            }]
          };
        } catch (error) {
          console.error('Polling error:', error);
          session.status = 'error';
          session.metadata.error = error instanceof Error ? error.message : String(error);
        }
      }

      let response = `📊 **Streaming Results**\n\n`;
      response += `Status: ${session.status}\n`;
      response += `Products: ${session.data.length} (Previous: ${session.metadata.previousCount})\n`;
      response += `Poll Count: ${session.metadata.pollCount}\n`;
      response += `Stable Count: ${session.metadata.stableCount}\n`;
      response += `Last update: ${session.metadata.lastUpdate.toLocaleString()}\n\n`;

      if (session.status === 'error') {
        response += `❌ Error: ${session.metadata.error}\n\n`;
      }

      if (session.data.length > 0) {
        if (params.format === 'csv') {
          const csvData = formatResults(session, 'csv');
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const fileName = `mortgage_rates_${timestamp}.csv`;
          const filePath = path.join(DATA_DIR, fileName);
          
          await fs.promises.writeFile(filePath, csvData, 'utf8');
          await fileServerManager.ensureServerRunning(DATA_DIR);
          const downloadUrl = await fileServerManager.getDownloadUrl(fileName);
          
          response += `✅ CSV file saved\n`;
          response += `📁 File: ${fileName}\n`;
          response += `🔗 Download: ${downloadUrl}\n`;
        } else {
          response += formatResults(session, params.format);
        }
      }

      if (session.status === 'streaming') {
        response += `\n⏳ Still receiving data. Check again for more results.\n`;
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
          text: `Error getting results: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// File Management Tools
import { FileAnalyzer } from './src/FileAnalyzer.js';

// Save Streaming Results Tool
server.tool(
  "save-streaming-results",
  {
    sessionId: z.string().describe("Session ID from get-mortgage-rates"),
    format: z.enum(["csv", "json", "markdown"]).default("csv").describe("Output format"),
    fileName: z.string().optional().describe("Optional custom filename (without extension)")
  },
  async (params) => {
    try {
      const session = activeSessions.get(params.sessionId);
      
      if (!session) {
        return {
          content: [{
            type: "text",
            text: `Session ${params.sessionId} not found or expired`
          }],
          isError: true
        };
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultName = `mortgage_rates_${timestamp}`;
      const baseName = params.fileName || defaultName;
      const extension = params.format === 'json' ? 'json' : 
                       params.format === 'markdown' ? 'md' : 'csv';
      const fileName = `${baseName}.${extension}`;
      const filePath = path.join(DATA_DIR, fileName);

      // Format the data
      let content = '';
      if (params.format === 'json') {
        content = JSON.stringify({
          metadata: session.metadata,
          products: session.data
        }, null, 2);
      } else if (params.format === 'markdown') {
        content = formatResults(session, 'markdown');
      } else {
        content = formatResults(session, 'csv');
      }

      // Save the file
      await fs.promises.writeFile(filePath, content, 'utf8');
      await fileServerManager.ensureServerRunning(DATA_DIR);
      const downloadUrl = await fileServerManager.getDownloadUrl(fileName);

      let response = `✅ **Results Saved Successfully**\n\n`;
      response += `📊 **Summary:**\n`;
      response += `• Total Products: ${session.data.length}\n`;
      response += `• Status: ${session.status}\n`;
      response += `• Format: ${params.format.toUpperCase()}\n\n`;
      response += `📁 **File Details:**\n`;
      response += `• Name: ${fileName}\n`;
      response += `• Size: ${Math.round(content.length / 1024)} KB\n`;
      response += `• Path: ${filePath}\n`;
      response += `• Download: ${downloadUrl}\n\n`;
      response += `💡 Use 'list-saved-results' tool to see all saved files.`;

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
          text: `Error saving results: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// List Saved Results Tool
server.tool(
  "list-saved-results",
  {
    format: z.enum(["all", "csv", "json", "markdown"]).default("all").describe("Filter by file format"),
    sortBy: z.enum(["date", "name", "size"]).default("date").describe("Sort results by"),
    limit: z.number().optional().describe("Maximum number of files to list")
  },
  async (params) => {
    try {
      const files = fs.readdirSync(DATA_DIR)
        .filter(file => {
          if (params.format === 'all') return true;
          const ext = path.extname(file).toLowerCase();
          return (params.format === 'csv' && ext === '.csv') ||
                 (params.format === 'json' && ext === '.json') ||
                 (params.format === 'markdown' && ext === '.md');
        })
        .map(file => {
          const filePath = path.join(DATA_DIR, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            format: path.extname(file).slice(1).toLowerCase()
          };
        })
        .sort((a, b) => {
          if (params.sortBy === 'date') return b.created.getTime() - a.created.getTime();
          if (params.sortBy === 'name') return a.name.localeCompare(b.name);
          return b.size - a.size;
        });

      const limitedFiles = params.limit ? files.slice(0, params.limit) : files;

      let response = `📁 **Saved Results Files**\n\n`;
      response += `Found ${files.length} files`;
      if (params.format !== 'all') response += ` in ${params.format.toUpperCase()} format`;
      response += `\n\n`;

      for (const file of limitedFiles) {
        response += `📄 **${file.name}**\n`;
        response += `• Size: ${Math.round(file.size / 1024)} KB\n`;
        response += `• Created: ${file.created.toLocaleString()}\n`;
        response += `• Format: ${file.format.toUpperCase()}\n`;
        const downloadUrl = await fileServerManager.getDownloadUrl(file.name);
        response += `• Download: ${downloadUrl}\n\n`;
      }

      if (params.limit && files.length > params.limit) {
        response += `_Showing ${params.limit} of ${files.length} files. Adjust 'limit' parameter to see more._\n\n`;
      }

      response += `💡 **Tips:**\n`;
      response += `• Use 'save-streaming-results' to save new results\n`;
      response += `• Files are stored in: ${DATA_DIR}\n`;
      response += `• File server running at: http://localhost:${defaultPort}\n`;

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
          text: `Error listing saved results: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

server.tool(
  "analyze-file",
  {
    path: z.string().describe("Path to the file to analyze")
  },
  async (params) => {
    try {
      const info = await FileAnalyzer.getFileInfo(params.path);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(info, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error analyzing file: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

server.tool(
  "read-file",
  {
    path: z.string().describe("Path to the file to read")
  },
  async (params) => {
    try {
      const result = await FileAnalyzer.readFile(params.path);
      return {
        content: [{
          type: "text",
          text: result.content
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error reading file: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

server.tool(
  "list-directory",
  {
    path: z.string().describe("Path to the directory to list"),
    recursive: z.boolean().optional().default(false).describe("Whether to list files recursively")
  },
  async (params) => {
    try {
      const files: ReturnType<typeof FileAnalyzer.getFileInfo>[] = [];
      const listFiles = (dir: string) => {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          const stats = fs.statSync(fullPath);
          if (stats.isFile()) {
            files.push(FileAnalyzer.getFileInfo(fullPath));
          } else if (stats.isDirectory() && params.recursive) {
            listFiles(fullPath);
          }
        }
      };

      listFiles(params.path);
      const fileInfos = files;

      return {
        content: [{
          type: "text",
          text: JSON.stringify(fileInfos, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error listing directory: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  
  // Handle cleanup on exit
  const cleanup = async () => {
    console.error('Shutting down servers...');
    await fileServerManager.shutdown();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);

  await server.connect(transport);
  console.error("RateSpot MCP Server (Streaming) running on stdio");
}

main().catch(async (error) => {
  console.error("Failed to start server:", error);
  await fileServerManager.shutdown();
  process.exit(1);
});
