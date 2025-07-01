import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as http from "http";

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
// Use __dirname to ensure the data directory is created relative to the script location
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
const FILE_SERVER_PORT = 3001;

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
    startFileServer();
  }
  
  const downloadUrl = `http://localhost:${FILE_SERVER_PORT}/download/${fileName}`;
  
  return {
    filePath,
    fileName,
    downloadUrl
  };
}

// Start HTTP server for file downloads
function startFileServer(): void {
  if (fileServer) return;
  
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
  
  fileServer.listen(FILE_SERVER_PORT, () => {
    console.error(`File server running on http://localhost:${FILE_SERVER_PORT}`);
  });
}

// Create MCP server
const server = new McpServer({
  name: "RateSpot Mortgage Server",
  version: "1.0.0"
});

// Helper function to get all CSV files with metadata
function getAllCSVFiles(): Array<{name: string, path: string, size: number, created: Date, type: string}> {
  try {
    const files = fs.readdirSync(DATA_DIR)
      .filter(file => file.endsWith('.csv'))
      .map(file => {
        const filePath = path.join(DATA_DIR, file);
        const stats = fs.statSync(filePath);
        const type = file.split('_')[0]; // Extract type from filename
        return {
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          type: type
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime()); // Sort by newest first
    
    return files;
  } catch (error) {
    console.error('Error reading CSV files:', error);
    return [];
  }
}

// Helper function to parse CSV file content
function parseCSVFile(filePath: string): {headers: string[], rows: any[], metadata: any} {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Extract metadata from comment lines
    const metadata: any = {};
    const dataLines: string[] = [];
    
    for (const line of lines) {
      if (line.startsWith('#')) {
        if (line.includes('Generated on:')) {
          metadata.generated = line.split('Generated on:')[1].trim();
        } else if (line.includes('Search Parameters:')) {
          try {
            metadata.searchParams = JSON.parse(line.split('Search Parameters:')[1].trim());
          } catch (e) {
            metadata.searchParams = line.split('Search Parameters:')[1].trim();
          }
        } else if (line.includes('File Type:')) {
          metadata.fileType = line.split('File Type:')[1].trim();
        }
      } else if (line.trim()) {
        dataLines.push(line);
      }
    }
    
    if (dataLines.length === 0) {
      return { headers: [], rows: [], metadata };
    }
    
    // Parse CSV data
    const headers = dataLines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const rows = dataLines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });
    
    return { headers, rows, metadata };
  } catch (error) {
    console.error('Error parsing CSV file:', error);
    return { headers: [], rows: [], metadata: {} };
  }
}

// Note: MCP resources will be added in a future update once the SDK API is clarified
// For now, the enhanced tools below provide direct file access and analysis capabilities


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

// Helper function to format mortgage products as pipe-delimited
function formatMortgageProductsAsPipe(events: any[]): string {
  // Filter to only mortgage product events
  const mortgageProducts = events.filter(e => e.event === 'mortgage_product');
  
  if (mortgageProducts.length === 0) {
    return "No mortgage products found.";
  }

  // Sort by rate (lowest first)
  mortgageProducts.sort((a, b) => (a.data.rate || 999) - (b.data.rate || 999));
  
  // Pipe-delimited header
  let output = "Lender Name|Rate (%)|APR (%)|Monthly Payment ($)|Points|Upfront Costs ($)|Loan Type|Quote Type|Rate Description|Rate Lock (days)|Purchase Price ($)|Down Payment ($)|Mortgage Balance ($)|Credit Score|ZIP Code\n";
  
  // Add rows (pipes are rare in mortgage data, so minimal escaping needed)
  for (const product of mortgageProducts) {
    const data = product.data;
    const row = [
      (data.lender_name || '').replace(/\|/g, '-'), // Replace any pipes with dashes
      data.rate || '',
      data.apr || '',
      data.mo_payment || '',
      data.points || '',
      data.upfront_costs || '',
      (data.loan_type || '').replace(/\|/g, '-'),
      data.quote_type === 'ws' ? 'Wholesale' : 'Retail',
      (data.rate_desc || '').replace(/\|/g, '-'),
      data.rate_lock_used || '',
      data.purchase_price || '',
      data.down_payment || '',
      data.mortgage_balance || '',
      data.credit_score || '',
      (data.zipcode || '').replace(/\|/g, '-')
    ].join('|');
    
    output += row + '\n';
  }
  
  return output;
}

// Helper function to make API requests for RateSpot SSE API with timeout
async function makeRateSpotRequest(params: any, timeoutMs: number = 15000) {
  try {
    const queryParams = new URLSearchParams();
    
    // Add API key first
    queryParams.append('apikey', RATESPOT_API_KEY!);
    
    // Add all parameters to the query string, ensuring proper type conversion
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        // Ensure numbers are properly formatted
        const formattedValue = typeof value === 'number' ? value.toString() : String(value);
        queryParams.append(key, formattedValue);
      }
    }

    const url = `${RATESPOT_BASE_URL}/v1/mortgage_products?${queryParams.toString()}`;

    console.error(`Making request to: ${url}`);
    console.error(`With parameters: ${JSON.stringify(params, null, 2)}`);

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
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

// Helper function to format as structured JSON
function formatStructuredJson(data: any): string {
  return JSON.stringify(data, null, 2);
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
    format: z.enum(["structured", "markdown", "csv", "pipe"]).optional().default("markdown").describe("Output format: 'structured' for JSON, 'markdown' for markdown table, 'csv' for CSV, or 'pipe' for pipe-delimited")
  },
  async (params) => {
    try {
      const propertyValue = params.propertyValue || 500000;
      const downPaymentAmount = params.downPayment || 100000;
      const downPaymentPercent = Math.round((downPaymentAmount / propertyValue) * 100);
      const mortgageBalancePercent = 100 - downPaymentPercent;

      const queryParams = {
        purpose: "purchase",
        zipcode: params.zipCode || "90210",
        property_value: propertyValue,
        down_payment: downPaymentPercent,
        mortgage_balance: mortgageBalancePercent,
        credit_score: params.creditScore || 790,
      
        // These parameters are REQUIRED by the API
        fha: 1,
        va: 1,
        property_type: params.propertyType || "single_family",
        property_use: params.occupancy || "primary"
      };

      const result = await makeRateSpotRequest(queryParams);

      // Create search parameters object for structured formats
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

      // Format the response based on the requested format
      let formattedResponse: string;
      if (params.format === "structured") {
        // Parse into structured format and return as JSON
        const structuredData = parseMortgageResults(result, searchParams);
        formattedResponse = formatStructuredJson(structuredData);
      } else if (params.format === "csv") {
        // Save CSV file and provide download link
        const structuredData = parseMortgageResults(result, searchParams);
        const csvData = formatStructuredCSV(structuredData);
        const fileInfo = await saveCSVFile(csvData, "mortgage_rates", searchParams);
        
        formattedResponse = `✅ **CSV FILE SAVED SUCCESSFULLY**\n\n`;
        formattedResponse += `📁 **File:** ${fileInfo.fileName}\n`;
        formattedResponse += `📍 **Location:** ${fileInfo.filePath}\n`;
        formattedResponse += `🔗 **Download Link:** ${fileInfo.downloadUrl}\n\n`;
        formattedResponse += `📊 **Summary:** Found ${structuredData.total_products} mortgage products\n`;
        formattedResponse += `🏆 **Best Rate:** ${structuredData.best_rate?.rate || 'N/A'} from ${structuredData.best_rate?.lender || 'N/A'}\n\n`;
        formattedResponse += `💡 **How to access:**\n`;
        formattedResponse += `• Click the download link above\n`;
        formattedResponse += `• Or visit: http://localhost:3001/list to see all saved files\n`;
        formattedResponse += `• File is also available in the local 'data' folder\n`;
      } else if (params.format === "pipe") {
        // Use new structured pipe format
        const structuredData = parseMortgageResults(result, searchParams);
        formattedResponse = "MORTGAGE RATES DATA (PIPE-DELIMITED FORMAT)\n";
        formattedResponse += "Copy the data below and save as .txt file:\n\n";
        formattedResponse += formatStructuredPipe(structuredData);
      } else {
        // Default to markdown format
        const structuredData = parseMortgageResults(result, searchParams);
        formattedResponse = formatMarkdownTable(structuredData);
      }

      return {
        content: [{
          type: "text",
          text: formattedResponse
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

// Compare Loan Products Tool
// IMPORTANT: RateSpot API does NOT support multiple ZIP codes in a single request
// This tool handles multi-ZIP comparisons by making separate API calls for each ZIP code
// When users ask to compare "ZIP1 vs ZIP2", Claude should understand this requires multiple calls
server.tool(
  "compare-loan-products",
  {
    loanAmount: z.number().describe("Loan amount in dollars"),
    creditScore: z.number().describe("Credit score (300-850)"),
    downPayment: z.number().describe("Down payment amount in dollars"),
    propertyValue: z.number().describe("Property value in dollars"),
    zipCode: z.string().describe("ZIP code (single ZIP) or comma-separated ZIP codes for multi-location comparison. NOTE: Each ZIP code requires a separate API call."),
    zipCodes: z.array(z.string()).optional().describe("Array of ZIP codes for multi-location comparison (alternative to comma-separated zipCode). Each ZIP will be processed with a separate API call."),
    propertyType: z.string().optional().default("single_family").describe("Property type"),
    occupancy: z.string().optional().default("primary").describe("Property use (primary, secondary, investment)"),
    format: z.enum(["markdown", "csv", "pipe", "auto"]).optional().default("auto").describe("Output format: 'markdown' for markdown table, 'csv' for CSV download, 'pipe' for pipe-delimited format, or 'auto' for automatic selection based on data size")
  },
  async ({ loanAmount, creditScore, downPayment, propertyValue, zipCode, zipCodes, propertyType, occupancy, format }) => {
    try {
      // Determine which ZIP codes to process
      let zipCodesToProcess: string[] = [];
      
      if (zipCodes && zipCodes.length > 0) {
        // Use the zipCodes array if provided
        zipCodesToProcess = zipCodes;
      } else if (zipCode) {
        // Check if zipCode contains comma-separated values
        if (zipCode.includes(',')) {
          zipCodesToProcess = zipCode.split(',').map(zip => zip.trim());
        } else {
          zipCodesToProcess = [zipCode];
        }
      } else {
        throw new Error("Either zipCode or zipCodes parameter is required");
      }

      // Auto-detect if we should use CSV format for multiple ZIP codes
      let finalFormat = format;
      let autoSelectedCSV = false;
      
      if (format === "auto") {
        if (zipCodesToProcess.length > 1) {
          finalFormat = "csv";
          autoSelectedCSV = true;
        } else {
          finalFormat = "markdown";
        }
      } else if (zipCodesToProcess.length > 2 && format !== "csv") {
        // Force CSV for more than 2 ZIP codes to prevent memory issues
        finalFormat = "csv";
        autoSelectedCSV = true;
      }

      // Calculate down payment percentage
      const downPaymentPercent = Math.round((downPayment / propertyValue) * 100);
      const mortgageBalancePercent = 100 - downPaymentPercent;

      // Process multiple ZIP codes if needed
      let allResults: any[] = [];
      let processedZipCodes: string[] = [];

      for (const currentZip of zipCodesToProcess) {
        try {
          const queryParams = {
            purpose: "purchase",
            zipcode: currentZip.trim(),
            property_value: propertyValue,
            down_payment: downPaymentPercent,
            mortgage_balance: mortgageBalancePercent,
            credit_score: creditScore,
            fha: 1,
            va: 1,
            property_type: propertyType,
            property_use: occupancy
          };

          const result = await makeRateSpotRequest(queryParams);
          
          // Add ZIP code info to each result for tracking
          const resultsWithZip = result.map((event: any) => ({
            ...event,
            zipCode: currentZip.trim()
          }));
          
          allResults = allResults.concat(resultsWithZip);
          processedZipCodes.push(currentZip.trim());
          
          // Add a small delay between requests to be respectful to the API
          if (zipCodesToProcess.length > 1 && currentZip !== zipCodesToProcess[zipCodesToProcess.length - 1]) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error(`Error processing ZIP code ${currentZip}:`, error);
          // Continue with other ZIP codes even if one fails
        }
      }

      const result = allResults;

      // Create search parameters object for structured formats
      const searchParams = {
        propertyValue: propertyValue,
        downPayment: downPayment,
        loanAmount: loanAmount,
        creditScore: creditScore,
        loanType: undefined,
        propertyType: propertyType,
        occupancy: occupancy,
        zipCode: zipCodesToProcess.length === 1 ? zipCodesToProcess[0] : zipCodesToProcess.join(', '),
        zipCodes: zipCodesToProcess,
        processedZipCodes: processedZipCodes,
        loanTerm: undefined,
        rateType: undefined,
        state: undefined,
        multiZipRequest: zipCodesToProcess.length > 1,
        autoSelectedCSV: autoSelectedCSV
      };

      // Format the response based on the requested format
      let formattedResponse: string;
      if (finalFormat === "csv") {
        // Save CSV file and provide download link
        const csvData = formatMortgageProductsAsCSV(result);
        const fileInfo = await saveCSVFile(csvData, "loan_comparison", searchParams);
        
        formattedResponse = `✅ **CSV FILE SAVED SUCCESSFULLY**\n\n`;
        
        // Add auto-selection message if applicable
        if (autoSelectedCSV) {
          if (zipCodesToProcess.length > 1) {
            formattedResponse += `🤖 **Auto-Selected CSV Format:** Detected ${zipCodesToProcess.length} ZIP codes - automatically using CSV format to prevent memory issues\n`;
            formattedResponse += `📍 **ZIP Codes Processed:** ${processedZipCodes.join(', ')}\n\n`;
          } else {
            formattedResponse += `🤖 **Auto-Selected CSV Format:** Large dataset detected - automatically using CSV format to prevent memory issues\n\n`;
          }
        }
        
        formattedResponse += `📁 **File:** ${fileInfo.fileName}\n`;
        formattedResponse += `📍 **Location:** ${fileInfo.filePath}\n`;
        formattedResponse += `🔗 **Download Link:** ${fileInfo.downloadUrl}\n\n`;
        formattedResponse += `📊 **Summary:** Found ${result.filter(e => e.event === 'mortgage_product').length} loan products\n`;
        formattedResponse += `💰 **Loan Amount:** $${loanAmount.toLocaleString()}\n`;
        formattedResponse += `🏠 **Property Value:** $${propertyValue.toLocaleString()}\n`;
        formattedResponse += `💵 **Down Payment:** $${downPayment.toLocaleString()} (${Math.round((downPayment / propertyValue) * 100)}%)\n`;
        
        if (zipCodesToProcess.length > 1) {
          formattedResponse += `🗺️ **Locations:** ${zipCodesToProcess.length} ZIP codes (${processedZipCodes.length} successfully processed)\n`;
        }
        
        formattedResponse += `\n💡 **How to access:**\n`;
        formattedResponse += `• Click the download link above\n`;
        formattedResponse += `• Or visit: http://localhost:3001/list to see all saved files\n`;
        formattedResponse += `• File is also available in the local 'data' folder\n`;
      } else if (format === "pipe") {
        formattedResponse = "LOAN PRODUCT COMPARISON DATA (PIPE-DELIMITED FORMAT)\n";
        formattedResponse += "Copy the data below and save as .txt file:\n\n";
        formattedResponse += formatMortgageProductsAsPipe(result);
      } else {
        // Default to markdown format
        const structuredData = parseMortgageResults(result, searchParams);
        formattedResponse = formatMarkdownTable(structuredData);
        
        // Add search parameters for context
        formattedResponse += "\n## Search Parameters\n\n";
        formattedResponse += `**Loan Amount:** $${loanAmount.toLocaleString()}\n`;
        formattedResponse += `**Property Value:** $${propertyValue.toLocaleString()}\n`;
        formattedResponse += `**Down Payment:** $${downPayment.toLocaleString()} (${downPaymentPercent}%)\n`;
        formattedResponse += `**Credit Score:** ${creditScore}\n`;
        formattedResponse += `**ZIP Code:** ${zipCode}\n`;
        formattedResponse += `**Property Type:** ${propertyType}\n`;
        formattedResponse += `**Occupancy:** ${occupancy}\n`;
      }

      return {
        content: [{
          type: "text",
          text: formattedResponse
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error comparing loan products: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// Calculate Monthly Payment Tool
server.tool(
  "calculate-monthly-payment",
  {
    loanAmount: z.number().describe("Loan amount in dollars"),
    interestRate: z.number().describe("Annual interest rate as percentage (e.g., 6.5)"),
    loanTerm: z.number().describe("Loan term in years"),
    propertyTax: z.number().optional().describe("Annual property tax in dollars"),
    homeInsurance: z.number().optional().describe("Annual home insurance in dollars"),
    pmi: z.number().optional().describe("Monthly PMI amount in dollars"),
    hoaFees: z.number().optional().describe("Monthly HOA fees in dollars"),
    format: z.string().optional().default("table").describe("Output format: 'table' for formatted view, 'csv' for CSV download, or 'pipe' for pipe-delimited format")
  },
  async ({ loanAmount, interestRate, loanTerm, propertyTax, homeInsurance, pmi, hoaFees, format }) => {
    try {
      // Calculate principal and interest
      const monthlyRate = interestRate / 100 / 12;
      const numPayments = loanTerm * 12;
      
      const principalAndInterest = loanAmount * 
        (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
        (Math.pow(1 + monthlyRate, numPayments) - 1);

      // Calculate other monthly costs
      const monthlyPropertyTax = propertyTax ? propertyTax / 12 : 0;
      const monthlyInsurance = homeInsurance ? homeInsurance / 12 : 0;
      const monthlyPmi = pmi || 0;
      const monthlyHoa = hoaFees || 0;

      const totalMonthlyPayment = principalAndInterest + monthlyPropertyTax + 
        monthlyInsurance + monthlyPmi + monthlyHoa;

      const breakdown = {
        principalAndInterest: Math.round(principalAndInterest * 100) / 100,
        propertyTax: Math.round(monthlyPropertyTax * 100) / 100,
        homeInsurance: Math.round(monthlyInsurance * 100) / 100,
        pmi: Math.round(monthlyPmi * 100) / 100,
        hoaFees: Math.round(monthlyHoa * 100) / 100,
        totalMonthlyPayment: Math.round(totalMonthlyPayment * 100) / 100,
        totalInterestPaid: Math.round((principalAndInterest * numPayments - loanAmount) * 100) / 100,
        totalAmountPaid: Math.round((totalMonthlyPayment * numPayments) * 100) / 100
      };

      let formattedResponse: string;
      if (format === "csv") {
        // Save CSV file and provide download link
        let csvData = "Component,Monthly Amount ($),Annual Amount ($)\n";
        csvData += `"Principal & Interest",${breakdown.principalAndInterest},${breakdown.principalAndInterest * 12}\n`;
        csvData += `"Property Tax",${breakdown.propertyTax},${breakdown.propertyTax * 12}\n`;
        csvData += `"Home Insurance",${breakdown.homeInsurance},${breakdown.homeInsurance * 12}\n`;
        csvData += `"PMI",${breakdown.pmi},${breakdown.pmi * 12}\n`;
        csvData += `"HOA Fees",${breakdown.hoaFees},${breakdown.hoaFees * 12}\n`;
        csvData += `"Total Monthly Payment",${breakdown.totalMonthlyPayment},${breakdown.totalMonthlyPayment * 12}\n`;
        csvData += `"Total Interest Paid (${loanTerm} years)",${breakdown.totalInterestPaid},\n`;
        csvData += `"Total Amount Paid (${loanTerm} years)",${breakdown.totalAmountPaid},\n`;
        
        const searchParams = {
          loanAmount,
          interestRate,
          loanTerm,
          propertyTax,
          homeInsurance,
          pmi,
          hoaFees
        };
        
        const fileInfo = await saveCSVFile(csvData, "payment_calculation", searchParams);
        
        formattedResponse = `✅ **CSV FILE SAVED SUCCESSFULLY**\n\n`;
        formattedResponse += `📁 **File:** ${fileInfo.fileName}\n`;
        formattedResponse += `📍 **Location:** ${fileInfo.filePath}\n`;
        formattedResponse += `🔗 **Download Link:** ${fileInfo.downloadUrl}\n\n`;
        formattedResponse += `📊 **Summary:** Monthly payment calculation for $${loanAmount.toLocaleString()} loan\n`;
        formattedResponse += `💰 **Total Monthly Payment:** $${breakdown.totalMonthlyPayment.toLocaleString()}\n`;
        formattedResponse += `📈 **Interest Rate:** ${interestRate}%\n`;
        formattedResponse += `⏰ **Loan Term:** ${loanTerm} years\n\n`;
        formattedResponse += `💡 **How to access:**\n`;
        formattedResponse += `• Click the download link above\n`;
        formattedResponse += `• Or visit: http://localhost:3001/list to see all saved files\n`;
        formattedResponse += `• File is also available in the local 'data' folder\n`;
      } else if (format === "pipe") {
        formattedResponse = "MONTHLY PAYMENT CALCULATION (PIPE-DELIMITED FORMAT)\n";
        formattedResponse += "Copy the data below and save as .txt file:\n\n";
        formattedResponse += "Component|Monthly Amount ($)|Annual Amount ($)\n";
        formattedResponse += `Principal & Interest|${breakdown.principalAndInterest}|${breakdown.principalAndInterest * 12}\n`;
        formattedResponse += `Property Tax|${breakdown.propertyTax}|${breakdown.propertyTax * 12}\n`;
        formattedResponse += `Home Insurance|${breakdown.homeInsurance}|${breakdown.homeInsurance * 12}\n`;
        formattedResponse += `PMI|${breakdown.pmi}|${breakdown.pmi * 12}\n`;
        formattedResponse += `HOA Fees|${breakdown.hoaFees}|${breakdown.hoaFees * 12}\n`;
        formattedResponse += `Total Monthly Payment|${breakdown.totalMonthlyPayment}|${breakdown.totalMonthlyPayment * 12}\n`;
        formattedResponse += `Total Interest Paid (${loanTerm} years)|${breakdown.totalInterestPaid}|\n`;
        formattedResponse += `Total Amount Paid (${loanTerm} years)|${breakdown.totalAmountPaid}|\n`;
      } else {
        // Default to table format
        formattedResponse = "MONTHLY PAYMENT CALCULATION\n";
        formattedResponse += "=".repeat(50) + "\n\n";
        
        formattedResponse += "┌─────────────────────────┬─────────────┬─────────────┐\n";
        formattedResponse += "│ Payment Component       │ Monthly ($) │ Annual ($)  │\n";
        formattedResponse += "├─────────────────────────┼─────────────┼─────────────┤\n";
        formattedResponse += `│ Principal & Interest    │ ${breakdown.principalAndInterest.toLocaleString().padStart(11)} │ ${(breakdown.principalAndInterest * 12).toLocaleString().padStart(11)} │\n`;
        formattedResponse += `│ Property Tax            │ ${breakdown.propertyTax.toLocaleString().padStart(11)} │ ${(breakdown.propertyTax * 12).toLocaleString().padStart(11)} │\n`;
        formattedResponse += `│ Home Insurance          │ ${breakdown.homeInsurance.toLocaleString().padStart(11)} │ ${(breakdown.homeInsurance * 12).toLocaleString().padStart(11)} │\n`;
        formattedResponse += `│ PMI                     │ ${breakdown.pmi.toLocaleString().padStart(11)} │ ${(breakdown.pmi * 12).toLocaleString().padStart(11)} │\n`;
        formattedResponse += `│ HOA Fees                │ ${breakdown.hoaFees.toLocaleString().padStart(11)} │ ${(breakdown.hoaFees * 12).toLocaleString().padStart(11)} │\n`;
        formattedResponse += "├─────────────────────────┼─────────────┼─────────────┤\n";
        formattedResponse += `│ TOTAL MONTHLY PAYMENT   │ ${breakdown.totalMonthlyPayment.toLocaleString().padStart(11)} │ ${(breakdown.totalMonthlyPayment * 12).toLocaleString().padStart(11)} │\n`;
        formattedResponse += "└─────────────────────────┴─────────────┴─────────────┘\n\n";
        
        formattedResponse += "LOAN SUMMARY:\n";
        formattedResponse += "-".repeat(15) + "\n";
        formattedResponse += `Loan Amount: $${loanAmount.toLocaleString()}\n`;
        formattedResponse += `Interest Rate: ${interestRate}%\n`;
        formattedResponse += `Loan Term: ${loanTerm} years (${numPayments} payments)\n`;
        formattedResponse += `Total Interest Paid: $${breakdown.totalInterestPaid.toLocaleString()}\n`;
        formattedResponse += `Total Amount Paid: $${breakdown.totalAmountPaid.toLocaleString()}\n`;
      }

      return {
        content: [{
          type: "text",
          text: formattedResponse
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error calculating monthly payment: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);


// List Saved Files Tool
server.tool(
  "list-saved-files",
  {
    fileType: z.string().optional().describe("Filter by file type (mortgage_rates, loan_comparison, payment_calculation)")
  },
  async ({ fileType }) => {
    try {
      const files = fs.readdirSync(DATA_DIR)
        .filter(file => file.endsWith('.csv'))
        .filter(file => fileType ? file.startsWith(fileType) : true)
        .map(file => {
          const filePath = path.join(DATA_DIR, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            size: stats.size,
            created: stats.birthtime.toISOString(),
            downloadUrl: `http://localhost:${FILE_SERVER_PORT}/download/${file}`,
            localPath: filePath
          };
        })
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

      let response = `📁 **SAVED CSV FILES** (${files.length} files)\n\n`;
      
      if (files.length === 0) {
        response += "No CSV files found. Generate some data first using the mortgage tools with format='csv'.\n";
      } else {
        response += `🌐 **File Server:** http://localhost:${FILE_SERVER_PORT}/list\n\n`;
        
        for (const file of files) {
          const sizeKB = Math.round(file.size / 1024 * 100) / 100;
          const createdDate = new Date(file.created).toLocaleString();
          
          response += `📄 **${file.name}**\n`;
          response += `   📊 Size: ${sizeKB} KB\n`;
          response += `   📅 Created: ${createdDate}\n`;
          response += `   🔗 Download: ${file.downloadUrl}\n`;
          response += `   📍 Local: ${file.localPath}\n\n`;
        }
        
        response += `💡 **Quick Actions:**\n`;
        response += `• Visit http://localhost:${FILE_SERVER_PORT}/list for JSON list\n`;
        response += `• Click any download link above to get the CSV file\n`;
        response += `• Files are also available in the local 'data' folder\n`;
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
          text: `Error listing files: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// Get Download Link Tool
server.tool(
  "get-download-link",
  {
    fileName: z.string().describe("Name of the CSV file to get download link for")
  },
  async ({ fileName }) => {
    try {
      const filePath = path.join(DATA_DIR, fileName);
      
      if (!fs.existsSync(filePath)) {
        return {
          content: [{
            type: "text",
            text: `❌ **File not found:** ${fileName}\n\nUse the 'list-saved-files' tool to see available files.`
          }],
          isError: true
        };
      }

      const stats = fs.statSync(filePath);
      const downloadUrl = `http://localhost:${FILE_SERVER_PORT}/download/${fileName}`;
      
      // Start file server if not already running
      if (!fileServer) {
        startFileServer();
      }

      const response = `✅ **Download Link Generated**\n\n`;
      const sizeKB = Math.round(stats.size / 1024 * 100) / 100;
      
      return {
        content: [{
          type: "text",
          text: response + 
            `📁 **File:** ${fileName}\n` +
            `📊 **Size:** ${sizeKB} KB\n` +
            `📅 **Created:** ${stats.birthtime.toLocaleString()}\n` +
            `🔗 **Download Link:** ${downloadUrl}\n\n` +
            `💡 **How to use:**\n` +
            `• Click the link above to download\n` +
            `• Or copy the URL to your browser\n` +
            `• File will download automatically\n`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error generating download link: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// Delete CSV File Tool
server.tool(
  "delete-csv-file",
  {
    fileName: z.string().describe("Name of the CSV file to delete")
  },
  async ({ fileName }) => {
    try {
      const filePath = path.join(DATA_DIR, fileName);
      
      if (!fs.existsSync(filePath)) {
        return {
          content: [{
            type: "text",
            text: `❌ **File not found:** ${fileName}\n\nUse the 'list-saved-files' tool to see available files.`
          }],
          isError: true
        };
      }

      // Get file info before deletion
      const stats = fs.statSync(filePath);
      const sizeKB = Math.round(stats.size / 1024 * 100) / 100;
      
      // Delete the file
      fs.unlinkSync(filePath);

      const response = `✅ **File Deleted Successfully**\n\n`;
      
      return {
        content: [{
          type: "text",
          text: response + 
            `📁 **Deleted:** ${fileName}\n` +
            `📊 **Size:** ${sizeKB} KB\n` +
            `📅 **Was Created:** ${stats.birthtime.toLocaleString()}\n\n` +
            `💡 **Note:** File has been permanently removed from the data folder.\n`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error deleting file: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// Analyze CSV File Tool
server.tool(
  "analyze-csv-file",
  {
    fileName: z.string().describe("Name of the CSV file to analyze"),
    analysisType: z.enum(["summary", "detailed", "rates", "comparison"]).optional().default("summary").describe("Type of analysis to perform")
  },
  async ({ fileName, analysisType }) => {
    try {
      const filePath = path.join(DATA_DIR, fileName);
      
      if (!fs.existsSync(filePath)) {
        return {
          content: [{
            type: "text",
            text: `❌ **File not found:** ${fileName}\n\nUse the 'list-saved-files' tool to see available files.`
          }],
          isError: true
        };
      }

      const parsed = parseCSVFile(filePath);
      const stats = fs.statSync(filePath);
      
      if (parsed.rows.length === 0) {
        return {
          content: [{
            type: "text",
            text: `❌ **No data found in file:** ${fileName}`
          }],
          isError: true
        };
      }

      let response = `📊 **CSV FILE ANALYSIS: ${fileName}**\n\n`;
      
      // Basic file info
      response += `📁 **File Information:**\n`;
      response += `• Size: ${Math.round(stats.size / 1024 * 100) / 100} KB\n`;
      response += `• Created: ${stats.birthtime.toLocaleString()}\n`;
      response += `• Rows: ${parsed.rows.length}\n`;
      response += `• Columns: ${parsed.headers.length}\n\n`;
      
      // Metadata if available
      if (parsed.metadata.searchParams) {
        response += `🔍 **Search Parameters:**\n`;
        const params = parsed.metadata.searchParams;
        if (typeof params === 'object') {
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              response += `• ${key}: ${value}\n`;
            }
          });
        } else {
          response += `• ${params}\n`;
        }
        response += '\n';
      }
      
      response += `📋 **Columns:** ${parsed.headers.join(', ')}\n\n`;
      
      if (analysisType === "summary") {
        // Basic summary
        response += `📈 **Data Summary:**\n`;
        response += `• Total records: ${parsed.rows.length}\n`;
        
        // Try to identify rate data
        const rateColumn = parsed.headers.find(h => h.toLowerCase().includes('rate') && !h.toLowerCase().includes('apr'));
        if (rateColumn) {
          const rates = parsed.rows
            .map(row => parseFloat(row[rateColumn]?.toString().replace('%', '') || '0'))
            .filter(r => r > 0);
          
          if (rates.length > 0) {
            response += `• Rate range: ${Math.min(...rates).toFixed(3)}% - ${Math.max(...rates).toFixed(3)}%\n`;
            response += `• Average rate: ${(rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(3)}%\n`;
          }
        }
        
        // Try to identify lender data
        const lenderColumn = parsed.headers.find(h => h.toLowerCase().includes('lender'));
        if (lenderColumn) {
          const lenders = Array.from(new Set(parsed.rows.map(row => row[lenderColumn]).filter(l => l)));
          response += `• Unique lenders: ${lenders.length}\n`;
        }
        
      } else if (analysisType === "detailed") {
        // Detailed analysis
        response += `📊 **Detailed Analysis:**\n\n`;
        
        // Analyze each column
        for (const header of parsed.headers) {
          const values = parsed.rows.map(row => row[header]).filter(v => v && v !== '');
          const uniqueValues = Array.from(new Set(values));
          
          response += `**${header}:**\n`;
          response += `• Total values: ${values.length}\n`;
          response += `• Unique values: ${uniqueValues.length}\n`;
          
          // Try to parse as numbers
          const numericValues = values
            .map(v => parseFloat(v.toString().replace(/[$,%]/g, '')))
            .filter(n => !isNaN(n));
          
          if (numericValues.length > 0 && numericValues.length === values.length) {
            response += `• Range: ${Math.min(...numericValues)} - ${Math.max(...numericValues)}\n`;
            response += `• Average: ${(numericValues.reduce((a, b) => a + b, 0) / numericValues.length).toFixed(2)}\n`;
          } else if (uniqueValues.length <= 10) {
            response += `• Values: ${uniqueValues.slice(0, 5).join(', ')}${uniqueValues.length > 5 ? '...' : ''}\n`;
          }
          response += '\n';
        }
        
      } else if (analysisType === "rates") {
        // Focus on rate analysis
        response += `📈 **Rate Analysis:**\n\n`;
        
        const rateColumn = parsed.headers.find(h => h.toLowerCase().includes('rate') && !h.toLowerCase().includes('apr'));
        const aprColumn = parsed.headers.find(h => h.toLowerCase().includes('apr'));
        const lenderColumn = parsed.headers.find(h => h.toLowerCase().includes('lender'));
        
        if (rateColumn) {
          const rateData = parsed.rows
            .map(row => ({
              rate: parseFloat(row[rateColumn]?.toString().replace('%', '') || '0'),
              apr: aprColumn ? parseFloat(row[aprColumn]?.toString().replace('%', '') || '0') : 0,
              lender: lenderColumn ? row[lenderColumn] : 'Unknown',
              row: row
            }))
            .filter(d => d.rate > 0)
            .sort((a, b) => a.rate - b.rate);
          
          if (rateData.length > 0) {
            response += `🏆 **Best Rates (Top 5):**\n`;
            rateData.slice(0, 5).forEach((item, index) => {
              response += `${index + 1}. ${item.lender}: ${item.rate.toFixed(3)}%`;
              if (item.apr > 0) response += ` (APR: ${item.apr.toFixed(3)}%)`;
              response += '\n';
            });
            
            response += `\n📊 **Rate Statistics:**\n`;
            response += `• Best rate: ${rateData[0].rate.toFixed(3)}%\n`;
            response += `• Worst rate: ${rateData[rateData.length - 1].rate.toFixed(3)}%\n`;
            response += `• Average rate: ${(rateData.reduce((sum, item) => sum + item.rate, 0) / rateData.length).toFixed(3)}%\n`;
            response += `• Rate spread: ${(rateData[rateData.length - 1].rate - rateData[0].rate).toFixed(3)}%\n`;
          }
        } else {
          response += `❌ No rate column found in the data.\n`;
        }
        
      } else if (analysisType === "comparison") {
        // Comparison analysis
        response += `🔄 **Comparison Analysis:**\n\n`;
        
        // Show first few rows as sample
        response += `📋 **Sample Data (First 3 rows):**\n`;
        for (let i = 0; i < Math.min(3, parsed.rows.length); i++) {
          response += `\n**Row ${i + 1}:**\n`;
          Object.entries(parsed.rows[i]).forEach(([key, value]) => {
            response += `• ${key}: ${value}\n`;
          });
        }
      }
      
      response += `\n💡 **Available Actions:**\n`;
      response += `• Use 'get-download-link' to download this file\n`;
      response += `• Use 'analyze-csv-file' with different analysisType for other views\n`;
      response += `• Use MCP resources to access raw file content\n`;

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
          text: `Error analyzing file: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// Compare CSV Files Tool
server.tool(
  "compare-csv-files",
  {
    file1: z.string().describe("Name of the first CSV file to compare"),
    file2: z.string().describe("Name of the second CSV file to compare"),
    compareBy: z.enum(["rates", "lenders", "structure", "all"]).optional().default("rates").describe("What to compare between the files")
  },
  async ({ file1, file2, compareBy }) => {
    try {
      const filePath1 = path.join(DATA_DIR, file1);
      const filePath2 = path.join(DATA_DIR, file2);
      
      if (!fs.existsSync(filePath1)) {
        return {
          content: [{
            type: "text",
            text: `❌ **File not found:** ${file1}`
          }],
          isError: true
        };
      }
      
      if (!fs.existsSync(filePath2)) {
        return {
          content: [{
            type: "text",
            text: `❌ **File not found:** ${file2}`
          }],
          isError: true
        };
      }

      const parsed1 = parseCSVFile(filePath1);
      const parsed2 = parseCSVFile(filePath2);
      
      let response = `🔄 **CSV FILES COMPARISON**\n\n`;
      response += `📁 **File 1:** ${file1} (${parsed1.rows.length} rows)\n`;
      response += `📁 **File 2:** ${file2} (${parsed2.rows.length} rows)\n\n`;
      
      if (compareBy === "structure" || compareBy === "all") {
        response += `📋 **Structure Comparison:**\n`;
        response += `• File 1 columns: ${parsed1.headers.length}\n`;
        response += `• File 2 columns: ${parsed2.headers.length}\n`;
        
        const commonHeaders = parsed1.headers.filter(h => parsed2.headers.includes(h));
        const uniqueToFile1 = parsed1.headers.filter(h => !parsed2.headers.includes(h));
        const uniqueToFile2 = parsed2.headers.filter(h => !parsed1.headers.includes(h));
        
        response += `• Common columns: ${commonHeaders.length} (${commonHeaders.join(', ')})\n`;
        if (uniqueToFile1.length > 0) {
          response += `• Only in File 1: ${uniqueToFile1.join(', ')}\n`;
        }
        if (uniqueToFile2.length > 0) {
          response += `• Only in File 2: ${uniqueToFile2.join(', ')}\n`;
        }
        response += '\n';
      }
      
      if (compareBy === "rates" || compareBy === "all") {
        const rateColumn1 = parsed1.headers.find(h => h.toLowerCase().includes('rate') && !h.toLowerCase().includes('apr'));
        const rateColumn2 = parsed2.headers.find(h => h.toLowerCase().includes('rate') && !h.toLowerCase().includes('apr'));
        
        if (rateColumn1 && rateColumn2) {
          const rates1 = parsed1.rows
            .map(row => parseFloat(row[rateColumn1]?.toString().replace('%', '') || '0'))
            .filter(r => r > 0);
          const rates2 = parsed2.rows
            .map(row => parseFloat(row[rateColumn2]?.toString().replace('%', '') || '0'))
            .filter(r => r > 0);
          
          response += `📈 **Rate Comparison:**\n`;
          response += `• File 1 - Best: ${Math.min(...rates1).toFixed(3)}%, Average: ${(rates1.reduce((a, b) => a + b, 0) / rates1.length).toFixed(3)}%\n`;
          response += `• File 2 - Best: ${Math.min(...rates2).toFixed(3)}%, Average: ${(rates2.reduce((a, b) => a + b, 0) / rates2.length).toFixed(3)}%\n`;
          response += `• Best rate difference: ${(Math.min(...rates2) - Math.min(...rates1)).toFixed(3)}%\n`;
          response += `• Average rate difference: ${((rates2.reduce((a, b) => a + b, 0) / rates2.length) - (rates1.reduce((a, b) => a + b, 0) / rates1.length)).toFixed(3)}%\n\n`;
        }
      }
      
      if (compareBy === "lenders" || compareBy === "all") {
        const lenderColumn1 = parsed1.headers.find(h => h.toLowerCase().includes('lender'));
        const lenderColumn2 = parsed2.headers.find(h => h.toLowerCase().includes('lender'));
        
        if (lenderColumn1 && lenderColumn2) {
          const lenders1 = Array.from(new Set(parsed1.rows.map(row => row[lenderColumn1]).filter(l => l)));
          const lenders2 = Array.from(new Set(parsed2.rows.map(row => row[lenderColumn2]).filter(l => l)));
          
          const commonLenders = lenders1.filter(l => lenders2.includes(l));
          const uniqueToFile1 = lenders1.filter(l => !lenders2.includes(l));
          const uniqueToFile2 = lenders2.filter(l => !lenders1.includes(l));
          
          response += `🏦 **Lender Comparison:**\n`;
          response += `• File 1 lenders: ${lenders1.length}\n`;
          response += `• File 2 lenders: ${lenders2.length}\n`;
          response += `• Common lenders: ${commonLenders.length}\n`;
          if (uniqueToFile1.length > 0) {
            response += `• Only in File 1: ${uniqueToFile1.slice(0, 5).join(', ')}${uniqueToFile1.length > 5 ? '...' : ''}\n`;
          }
          if (uniqueToFile2.length > 0) {
            response += `• Only in File 2: ${uniqueToFile2.slice(0, 5).join(', ')}${uniqueToFile2.length > 5 ? '...' : ''}\n`;
          }
        }
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
          text: `Error comparing files: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// Read CSV File Content Tool - Direct access to CSV data for Claude analysis
server.tool(
  "read-csv-file",
  {
    fileName: z.string().optional().describe("Name of the CSV file to read (leave empty to list available files)"),
    includeMetadata: z.boolean().optional().default(true).describe("Include file metadata and search parameters"),
    maxRows: z.number().optional().default(1000).describe("Maximum number of rows to return (default: 1000)")
  },
  async ({ fileName, includeMetadata, maxRows }) => {
    try {
      if (!fileName) {
        // List available CSV files
        const files = getAllCSVFiles();
        
        let response = `📁 **AVAILABLE CSV FILES** (${files.length} files)\n\n`;
        
        if (files.length === 0) {
          response += "No CSV files found. Generate some data first using the mortgage tools with format='csv'.\n\n";
          response += `💡 **To create CSV files:**\n`;
          response += `• Use get-mortgage-rates with format="csv"\n`;
          response += `• Use compare-loan-products with format="csv"\n`;
          response += `• Use calculate-monthly-payment with format="csv"\n`;
        } else {
          for (const file of files) {
            const parsed = parseCSVFile(file.path);
            response += `📄 **${file.name}**\n`;
            response += `   • ${Math.round(file.size / 1024 * 100) / 100} KB, ${parsed.rows.length} rows, ${parsed.headers.length} columns\n`;
            response += `   • Created: ${file.created.toLocaleString()}\n`;
            response += `   • Type: ${file.type}\n\n`;
          }
          
          response += `💡 **To read a file:**\n`;
          response += `• Use: read-csv-file with fileName="filename.csv"\n`;
          response += `• This will load the full CSV content into Claude for analysis\n`;
        }
        
        return {
          content: [{
            type: "text",
            text: response
          }]
        };
      }
      
      // Read specific file
      const filePath = path.join(DATA_DIR, fileName);
      
      if (!fs.existsSync(filePath)) {
        return {
          content: [{
            type: "text",
            text: `❌ **File not found:** ${fileName}\n\nUse 'read-csv-file' without fileName to see available files.`
          }],
          isError: true
        };
      }

      // Read the raw file content
      const rawContent = fs.readFileSync(filePath, 'utf8');
      const stats = fs.statSync(filePath);
      const parsed = parseCSVFile(filePath);
      
      let response = `📊 **CSV FILE LOADED: ${fileName}**\n\n`;
      
      if (includeMetadata) {
        response += `📁 **File Information:**\n`;
        response += `• Size: ${Math.round(stats.size / 1024 * 100) / 100} KB\n`;
        response += `• Created: ${stats.birthtime.toLocaleString()}\n`;
        response += `• Total Rows: ${parsed.rows.length}\n`;
        response += `• Columns: ${parsed.headers.length}\n\n`;
        
        if (parsed.metadata.generated) {
          response += `📅 **Generated:** ${parsed.metadata.generated}\n`;
        }
        
        if (parsed.metadata.searchParams) {
          response += `🔍 **Search Parameters:**\n`;
          const params = parsed.metadata.searchParams;
          if (typeof params === 'object') {
            Object.entries(params).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                response += `• ${key}: ${value}\n`;
              }
            });
          } else {
            response += `• ${params}\n`;
          }
          response += '\n';
        }
        
        response += `📋 **Columns:** ${parsed.headers.join(', ')}\n\n`;
      }
      
      // Limit rows if necessary
      const rowsToShow = Math.min(maxRows, parsed.rows.length);
      if (rowsToShow < parsed.rows.length) {
        response += `📊 **Showing first ${rowsToShow} of ${parsed.rows.length} rows:**\n\n`;
      } else {
        response += `📊 **Complete Dataset (${parsed.rows.length} rows):**\n\n`;
      }
      
      // Create clean CSV content for Claude analysis
      let csvForAnalysis = parsed.headers.join(',') + '\n';
      
      for (let i = 0; i < rowsToShow; i++) {
        const row = parsed.rows[i];
        const values = parsed.headers.map(header => {
          const value = row[header] || '';
          // Escape commas and quotes for proper CSV format
          if (value.toString().includes(',') || value.toString().includes('"')) {
            return `"${value.toString().replace(/"/g, '""')}"`;
          }
          return value;
        });
        csvForAnalysis += values.join(',') + '\n';
      }
      
      response += `\`\`\`csv\n${csvForAnalysis}\`\`\`\n\n`;
      
      // Add quick analysis
      const rateColumn = parsed.headers.find(h => h.toLowerCase().includes('rate') && !h.toLowerCase().includes('apr'));
      if (rateColumn && parsed.rows.length > 0) {
        const rates = parsed.rows
          .map(row => parseFloat(row[rateColumn]?.toString().replace('%', '') || '0'))
          .filter(r => r > 0);
        
        if (rates.length > 0) {
          response += `📈 **Quick Rate Analysis:**\n`;
          response += `• Best rate: ${Math.min(...rates).toFixed(3)}%\n`;
          response += `• Worst rate: ${Math.max(...rates).toFixed(3)}%\n`;
          response += `• Average rate: ${(rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(3)}%\n`;
          response += `• Rate spread: ${(Math.max(...rates) - Math.min(...rates)).toFixed(3)}%\n\n`;
        }
      }
      
      response += `✅ **CSV data is now loaded and ready for analysis in Claude!**\n\n`;
      response += `💡 **You can now:**\n`;
      response += `• Ask questions about the data\n`;
      response += `• Request specific analysis or comparisons\n`;
      response += `• Have Claude create charts or summaries\n`;
      response += `• Filter or sort the data as needed\n`;
      
      if (rowsToShow < parsed.rows.length) {
        response += `\n⚠️ **Note:** Only showing first ${rowsToShow} rows. Use maxRows parameter to see more data.\n`;
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
          text: `Error reading CSV file: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// Copy CSV to Desktop Tool - Alternative way to access files
server.tool(
  "copy-csv-to-desktop",
  {
    fileName: z.string().describe("Name of the CSV file to copy to Desktop"),
    newName: z.string().optional().describe("Optional new name for the copied file")
  },
  async ({ fileName, newName }) => {
    try {
      const filePath = path.join(DATA_DIR, fileName);
      
      if (!fs.existsSync(filePath)) {
        return {
          content: [{
            type: "text",
            text: `❌ **File not found:** ${fileName}\n\nUse 'list-saved-files' to see available files.`
          }],
          isError: true
        };
      }

      // Get user's home directory and Desktop path
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      const desktopPath = path.join(homeDir, 'Desktop');
      
      if (!fs.existsSync(desktopPath)) {
        return {
          content: [{
            type: "text",
            text: `❌ **Desktop folder not found at:** ${desktopPath}`
          }],
          isError: true
        };
      }

      const targetFileName = newName || fileName;
      const targetPath = path.join(desktopPath, targetFileName);
      
      // Copy the file
      fs.copyFileSync(filePath, targetPath);
      
      const stats = fs.statSync(targetPath);
      const sizeKB = Math.round(stats.size / 1024 * 100) / 100;
      
      let response = `✅ **FILE COPIED TO DESKTOP**\n\n`;
      response += `📁 **Source:** ${fileName}\n`;
      response += `📍 **Desktop Location:** ${targetPath}\n`;
      response += `📊 **Size:** ${sizeKB} KB\n\n`;
      response += `💡 **Now you can:**\n`;
      response += `• Drag and drop the file from Desktop into Claude Desktop\n`;
      response += `• Double-click to open in Excel or other CSV viewer\n`;
      response += `• Use the file in other applications\n`;

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
          text: `Error copying file to Desktop: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// Get File Summary Tool
server.tool(
  "get-file-summary",
  {
    fileName: z.string().optional().describe("Name of specific CSV file to summarize, or leave empty for all files")
  },
  async ({ fileName }) => {
    try {
      if (fileName) {
        // Summary for specific file
        const filePath = path.join(DATA_DIR, fileName);
        
        if (!fs.existsSync(filePath)) {
          return {
            content: [{
              type: "text",
              text: `❌ **File not found:** ${fileName}`
            }],
            isError: true
          };
        }

        const parsed = parseCSVFile(filePath);
        const stats = fs.statSync(filePath);
        
        let response = `📄 **FILE SUMMARY: ${fileName}**\n\n`;
        response += `📊 **Quick Stats:**\n`;
        response += `• Size: ${Math.round(stats.size / 1024 * 100) / 100} KB\n`;
        response += `• Created: ${stats.birthtime.toLocaleString()}\n`;
        response += `• Rows: ${parsed.rows.length}\n`;
        response += `• Columns: ${parsed.headers.length}\n`;
        
        // Quick rate info if available
        const rateColumn = parsed.headers.find(h => h.toLowerCase().includes('rate') && !h.toLowerCase().includes('apr'));
        if (rateColumn && parsed.rows.length > 0) {
          const rates = parsed.rows
            .map(row => parseFloat(row[rateColumn]?.toString().replace('%', '') || '0'))
            .filter(r => r > 0);
          
          if (rates.length > 0) {
            response += `• Best rate: ${Math.min(...rates).toFixed(3)}%\n`;
            response += `• Rate range: ${Math.min(...rates).toFixed(3)}% - ${Math.max(...rates).toFixed(3)}%\n`;
          }
        }
        
        if (parsed.metadata.searchParams) {
          response += `\n🔍 **Search Context:** ${JSON.stringify(parsed.metadata.searchParams)}\n`;
        }
        
        return {
          content: [{
            type: "text",
            text: response
          }]
        };
        
      } else {
        // Summary for all files
        const files = getAllCSVFiles();
        
        let response = `📁 **ALL FILES SUMMARY** (${files.length} files)\n\n`;
        
        if (files.length === 0) {
          response += "No CSV files found. Generate some data first using the mortgage tools with format='csv'.\n";
        } else {
          let totalSize = 0;
          let totalRows = 0;
          
          for (const file of files) {
            const parsed = parseCSVFile(file.path);
            totalSize += file.size;
            totalRows += parsed.rows.length;
            
            response += `📄 **${file.name}**\n`;
            response += `   • ${Math.round(file.size / 1024 * 100) / 100} KB, ${parsed.rows.length} rows\n`;
            response += `   • Created: ${file.created.toLocaleString()}\n`;
            
            // Quick rate info
            const rateColumn = parsed.headers.find(h => h.toLowerCase().includes('rate') && !h.toLowerCase().includes('apr'));
            if (rateColumn && parsed.rows.length > 0) {
              const rates = parsed.rows
                .map(row => parseFloat(row[rateColumn]?.toString().replace('%', '') || '0'))
                .filter(r => r > 0);
              
              if (rates.length > 0) {
                response += `   • Best rate: ${Math.min(...rates).toFixed(3)}%\n`;
              }
            }
            response += '\n';
          }
          
          response += `📊 **Totals:**\n`;
          response += `• Total size: ${Math.round(totalSize / 1024 * 100) / 100} KB\n`;
          response += `• Total rows: ${totalRows}\n`;
          response += `• File types: ${Array.from(new Set(files.map(f => f.type))).join(', ')}\n`;
        }
        
        return {
          content: [{
            type: "text",
            text: response
          }]
        };
      }
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error getting file summary: ${error instanceof Error ? error.message : String(error)}`
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
  console.error("RateSpot MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
