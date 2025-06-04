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

// Common headers for API requests
const getHeaders = () => ({
  "Authorization": `Bearer ${RATESPOT_API_KEY}`,
  "Content-Type": "application/json"
});

// Helper function to make API requests for RateSpot SSE API
async function makeRateSpotRequest(params: any) {
  const queryParams = new URLSearchParams();
  queryParams.append('apikey', RATESPOT_API_KEY!);
  
  // Add all parameters to the query string
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  }

  const url = `${RATESPOT_BASE_URL}/v1/mortgage_products?${queryParams.toString()}`;

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
    rateType: z.string().optional().describe("Rate type (fixed, arm)")
  },
  async (params) => {
    try {
      const queryParams: any = {};
      
      // Map parameters to RateSpot API format exactly like the curl example
      queryParams.purpose = "purchase";
      queryParams.zipcode = params.zipCode || "90210";
      queryParams.property_value = params.propertyValue || 500000;
      queryParams.down_payment = params.downPayment || 20; // Percentage
      queryParams.mortgage_balance = params.loanAmount || 80; // Percentage
      queryParams.credit_score = params.creditScore || 790;
      queryParams.fha = 1;
      queryParams.va = 1;
      queryParams.property_type = params.propertyType || "single_family";
      queryParams.property_use = params.occupancy || "primary";

      const result = await makeRateSpotRequest(queryParams);

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
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
    occupancy: z.string().optional().default("primary").describe("Property use (primary, secondary, investment)")
  },
  async ({ loanAmount, creditScore, downPayment, propertyValue, zipCode, propertyType, occupancy }) => {
    try {
      const queryParams: any = {
        purpose: "purchase",
        zipcode: zipCode,
        property_value: propertyValue,
        down_payment: 20, // Percentage
        mortgage_balance: 80, // Percentage  
        credit_score: creditScore,
        fha: 1,
        va: 1,
        property_type: propertyType,
        property_use: occupancy
      };

      const result = await makeRateSpotRequest(queryParams);

      return {
        content: [{
          type: "text",
          text: `Loan Product Comparison Results:\n\n${JSON.stringify(result, null, 2)}`
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
    hoaFees: z.number().optional().describe("Monthly HOA fees in dollars")
  },
  async ({ loanAmount, interestRate, loanTerm, propertyTax, homeInsurance, pmi, hoaFees }) => {
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

      return {
        content: [{
          type: "text",
          text: `Monthly Payment Calculation:\n\n${JSON.stringify(breakdown, null, 2)}`
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
