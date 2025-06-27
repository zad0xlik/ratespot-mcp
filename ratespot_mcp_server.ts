import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Environment variable for API key
const RATESPOT_API_KEY = process.env.RATESPOT_API_KEY;
const RATESPOT_BASE_URL = "https://api.ratespot.io";

if (!RATESPOT_API_KEY) {
  console.error("RATESPOT_API_KEY environment variable is required");
  process.exit(1);
}

// Create MCP server
const server = new McpServer({
  name: "RateSpot Mortgage Server",
  version: "1.0.0"
});

// Helper function to format mortgage products as a table
function formatMortgageProductsAsTable(events: any[], maxResults: number = 20): string {
  // Filter to only mortgage product events
  const mortgageProducts = events.filter(e => e.event === 'mortgage_product');
  
  if (mortgageProducts.length === 0) {
    return "No mortgage products found.";
  }

  // Sort by rate (lowest first)
  mortgageProducts.sort((a, b) => (a.data.rate || 999) - (b.data.rate || 999));
  
  // Limit results
  const limitedProducts = mortgageProducts.slice(0, maxResults);
  
  // Create table header
  let table = "MORTGAGE RATES COMPARISON\n";
  table += "=".repeat(80) + "\n\n";
  
  // Add summary
  table += `Found ${mortgageProducts.length} mortgage products (showing top ${limitedProducts.length})\n\n`;
  
  // Table headers
  table += "┌─────────────────────────────────┬──────┬──────┬───────────┬────────┬─────────────┬──────────┬──────────┐\n";
  table += "│ Lender                          │ Rate │ APR  │ Payment   │ Points │ Upfront     │ Type     │ Quote    │\n";
  table += "├─────────────────────────────────┼──────┼──────┼───────────┼────────┼─────────────┼──────────┼──────────┤\n";
  
  // Add rows
  for (const product of limitedProducts) {
    const data = product.data;
    const lender = (data.lender_name || 'Unknown').substring(0, 30).padEnd(31);
    const rate = (data.rate ? data.rate.toFixed(3) + '%' : 'N/A').padStart(6);
    const apr = (data.apr ? data.apr.toFixed(3) + '%' : 'N/A').padStart(6);
    const payment = (data.mo_payment ? '$' + data.mo_payment.toLocaleString() : 'N/A').padStart(11);
    const points = (data.points ? data.points.toFixed(2) : '0.00').padStart(8);
    const upfront = (data.upfront_costs ? '$' + data.upfront_costs.toLocaleString() : 'N/A').padStart(13);
    const loanType = (data.loan_type || 'Conv').substring(0, 8).padEnd(10);
    const quoteType = (data.quote_type === 'ws' ? 'Wholesale' : 'Retail').substring(0, 8).padEnd(10);
    
    table += `│ ${lender}│ ${rate}│ ${apr}│ ${payment}│ ${points}│ ${upfront}│ ${loanType}│ ${quoteType}│\n`;
  }
  
  table += "└─────────────────────────────────┴──────┴──────┴───────────┴────────┴─────────────┴──────────┴──────────┘\n\n";
  
  // Add best rate summary
  if (limitedProducts.length > 0) {
    const bestRate = limitedProducts[0].data;
    table += "BEST RATE DETAILS:\n";
    table += `-----------------\n`;
    table += `Lender: ${bestRate.lender_name || 'Unknown'}\n`;
    table += `Rate: ${bestRate.rate ? bestRate.rate.toFixed(3) + '%' : 'N/A'}\n`;
    table += `APR: ${bestRate.apr ? bestRate.apr.toFixed(3) + '%' : 'N/A'}\n`;
    table += `Monthly Payment: ${bestRate.mo_payment ? '$' + bestRate.mo_payment.toLocaleString() : 'N/A'}\n`;
    table += `Points: ${bestRate.points || 0}\n`;
    table += `Upfront Costs: ${bestRate.upfront_costs ? '$' + bestRate.upfront_costs.toLocaleString() : 'N/A'}\n`;
    table += `Loan Type: ${bestRate.loan_type || 'Conventional'}\n`;
    table += `Rate Lock: ${bestRate.rate_lock_used || 'N/A'} days\n`;
  }
  
  return table;
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

// Helper function to make API requests for RateSpot SSE API
async function makeRateSpotRequest(params: any) {
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

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed: ${response.status} ${response.statusText}`);
      console.error(`Error details: ${errorText}`);
      throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`);
    }

    // Parse Server-Sent Events response
    const text = await response.text();
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
        }
      }
    }
    
    return events;
  } catch (error) {
    console.error('Error in makeRateSpotRequest:', error);
    throw error;
  }
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
    format: z.string().optional().default("table").describe("Output format: 'table' for formatted table view, 'csv' for CSV download, or 'pipe' for pipe-delimited format")
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

      // Format the response based on the requested format
      let formattedResponse: string;
      if (params.format === "csv") {
        formattedResponse = "MORTGAGE RATES DATA (CSV FORMAT)\n";
        formattedResponse += "Copy the data below and save as .csv file:\n\n";
        formattedResponse += formatMortgageProductsAsCSV(result);
      } else if (params.format === "pipe") {
        formattedResponse = "MORTGAGE RATES DATA (PIPE-DELIMITED FORMAT)\n";
        formattedResponse += "Copy the data below and save as .txt file:\n\n";
        formattedResponse += formatMortgageProductsAsPipe(result);
      } else {
        // Default to table format
        formattedResponse = formatMortgageProductsAsTable(result);
        
        // Add search parameters for context
        formattedResponse += "\nSEARCH PARAMETERS:\n";
        formattedResponse += "-".repeat(20) + "\n";
        formattedResponse += `Property Value: $${propertyValue.toLocaleString()}\n`;
        formattedResponse += `Down Payment: $${downPaymentAmount.toLocaleString()} (${downPaymentPercent}%)\n`;
        formattedResponse += `Credit Score: ${params.creditScore || 790}\n`;
        formattedResponse += `ZIP Code: ${params.zipCode || "90210"}\n`;
        formattedResponse += `Property Type: ${params.propertyType || "single_family"}\n`;
        formattedResponse += `Occupancy: ${params.occupancy || "primary"}\n`;
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
server.tool(
  "compare-loan-products",
  {
    loanAmount: z.number().describe("Loan amount in dollars"),
    creditScore: z.number().describe("Credit score (300-850)"),
    downPayment: z.number().describe("Down payment amount in dollars"),
    propertyValue: z.number().describe("Property value in dollars"),
    zipCode: z.string().describe("ZIP code"),
    propertyType: z.string().optional().default("single_family").describe("Property type"),
    occupancy: z.string().optional().default("primary").describe("Property use (primary, secondary, investment)"),
    format: z.string().optional().default("table").describe("Output format: 'table' for formatted table view, 'csv' for CSV download, or 'pipe' for pipe-delimited format")
  },
  async ({ loanAmount, creditScore, downPayment, propertyValue, zipCode, propertyType, occupancy, format }) => {
    try {
      // Calculate down payment percentage
      const downPaymentPercent = Math.round((downPayment / propertyValue) * 100);
      const mortgageBalancePercent = 100 - downPaymentPercent;

      const queryParams = {
        purpose: "purchase",
        zipcode: zipCode,
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

      // Format the response based on the requested format
      let formattedResponse: string;
      if (format === "csv") {
        formattedResponse = "LOAN PRODUCT COMPARISON DATA (CSV FORMAT)\n";
        formattedResponse += "Copy the data below and save as .csv file:\n\n";
        formattedResponse += formatMortgageProductsAsCSV(result);
      } else if (format === "pipe") {
        formattedResponse = "LOAN PRODUCT COMPARISON DATA (PIPE-DELIMITED FORMAT)\n";
        formattedResponse += "Copy the data below and save as .txt file:\n\n";
        formattedResponse += formatMortgageProductsAsPipe(result);
      } else {
        // Default to table format
        formattedResponse = formatMortgageProductsAsTable(result);
        
        // Add search parameters for context
        formattedResponse += "\nSEARCH PARAMETERS:\n";
        formattedResponse += "-".repeat(20) + "\n";
        formattedResponse += `Loan Amount: $${loanAmount.toLocaleString()}\n`;
        formattedResponse += `Property Value: $${propertyValue.toLocaleString()}\n`;
        formattedResponse += `Down Payment: $${downPayment.toLocaleString()} (${downPaymentPercent}%)\n`;
        formattedResponse += `Credit Score: ${creditScore}\n`;
        formattedResponse += `ZIP Code: ${zipCode}\n`;
        formattedResponse += `Property Type: ${propertyType}\n`;
        formattedResponse += `Occupancy: ${occupancy}\n`;
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
        formattedResponse = "MONTHLY PAYMENT CALCULATION (CSV FORMAT)\n";
        formattedResponse += "Copy the data below and save as .csv file:\n\n";
        formattedResponse += "Component,Monthly Amount ($),Annual Amount ($)\n";
        formattedResponse += `"Principal & Interest",${breakdown.principalAndInterest},${breakdown.principalAndInterest * 12}\n`;
        formattedResponse += `"Property Tax",${breakdown.propertyTax},${breakdown.propertyTax * 12}\n`;
        formattedResponse += `"Home Insurance",${breakdown.homeInsurance},${breakdown.homeInsurance * 12}\n`;
        formattedResponse += `"PMI",${breakdown.pmi},${breakdown.pmi * 12}\n`;
        formattedResponse += `"HOA Fees",${breakdown.hoaFees},${breakdown.hoaFees * 12}\n`;
        formattedResponse += `"Total Monthly Payment",${breakdown.totalMonthlyPayment},${breakdown.totalMonthlyPayment * 12}\n`;
        formattedResponse += `"Total Interest Paid (${loanTerm} years)",${breakdown.totalInterestPaid},\n`;
        formattedResponse += `"Total Amount Paid (${loanTerm} years)",${breakdown.totalAmountPaid},\n`;
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
