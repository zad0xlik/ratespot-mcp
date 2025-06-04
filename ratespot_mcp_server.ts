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

// Helper function to make API requests
async function makeApiRequest(endpoint: string, method: string = "GET", data?: any) {
  const config: RequestInit = {
    method,
    headers: getHeaders()
  };

  if (data && method !== "GET") {
    config.body = JSON.stringify(data);
  }

  const url = data && method === "GET" 
    ? `${RATESPOT_BASE_URL}${endpoint}?${new URLSearchParams(data).toString()}`
    : `${RATESPOT_BASE_URL}${endpoint}`;

  const response = await fetch(url, config);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
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
      
      if (params.loanAmount) queryParams.loan_amount = params.loanAmount;
      if (params.creditScore) queryParams.credit_score = params.creditScore;
      if (params.downPayment) queryParams.down_payment = params.downPayment;
      if (params.propertyValue) queryParams.property_value = params.propertyValue;
      if (params.loanType) queryParams.loan_type = params.loanType;
      if (params.propertyType) queryParams.property_type = params.propertyType;
      if (params.occupancy) queryParams.occupancy = params.occupancy;
      if (params.state) queryParams.state = params.state;
      if (params.zipCode) queryParams.zip_code = params.zipCode;
      if (params.loanTerm) queryParams.loan_term = params.loanTerm;
      if (params.rateType) queryParams.rate_type = params.rateType;

      const result = await makeApiRequest("/v1/rates", "GET", queryParams);

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

// Get Lender Information Tool
server.tool(
  "get-lender-info",
  {
    lenderId: z.string().optional().describe("Specific lender ID"),
    state: z.string().optional().describe("State abbreviation to filter lenders"),
    loanType: z.string().optional().describe("Loan type to filter lenders"),
    minRating: z.number().optional().describe("Minimum lender rating (1-5)"),
    limit: z.number().optional().default(20).describe("Number of lenders to return")
  },
  async ({ lenderId, state, loanType, minRating, limit }) => {
    try {
      let endpoint = "/v1/lenders";
      const queryParams: any = {};

      if (lenderId) {
        endpoint = `/v1/lenders/${lenderId}`;
      } else {
        if (state) queryParams.state = state;
        if (loanType) queryParams.loan_type = loanType;
        if (minRating) queryParams.min_rating = minRating;
        if (limit) queryParams.limit = limit;
      }

      const result = await makeApiRequest(endpoint, "GET", Object.keys(queryParams).length > 0 ? queryParams : undefined);

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
          text: `Error fetching lender information: ${error instanceof Error ? error.message : String(error)}`
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
    state: z.string().describe("State abbreviation (e.g., CA, TX, NY)"),
    loanTypes: z.array(z.string()).optional().default(["conventional", "fha", "va"]).describe("Loan types to compare"),
    loanTerms: z.array(z.number()).optional().default([15, 30]).describe("Loan terms to compare (in years)"),
    maxResults: z.number().optional().default(10).describe("Maximum number of results per loan type")
  },
  async ({ loanAmount, creditScore, downPayment, propertyValue, state, loanTypes, loanTerms, maxResults }) => {
    try {
      const comparisons = [];

      for (const loanType of loanTypes) {
        for (const loanTerm of loanTerms) {
          const queryParams = {
            loan_amount: loanAmount,
            credit_score: creditScore,
            down_payment: downPayment,
            property_value: propertyValue,
            state: state,
            loan_type: loanType,
            loan_term: loanTerm,
            limit: maxResults
          };

          try {
            const result = await makeApiRequest("/v1/rates", "GET", queryParams);
            comparisons.push({
              loanType,
              loanTerm,
              results: result
            });
          } catch (error) {
            comparisons.push({
              loanType,
              loanTerm,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }

      return {
        content: [{
          type: "text",
          text: `Loan Product Comparison Results:\n\n${JSON.stringify(comparisons, null, 2)}`
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

// Get Market Trends Tool
server.tool(
  "get-market-trends",
  {
    state: z.string().optional().describe("State abbreviation (e.g., CA, TX, NY)"),
    zipCode: z.string().optional().describe("ZIP code for local trends"),
    loanType: z.string().optional().describe("Loan type (conventional, fha, va, usda)"),
    timeframe: z.string().optional().default("30d").describe("Timeframe for trends (7d, 30d, 90d, 1y)"),
    rateType: z.string().optional().describe("Rate type (fixed, arm)")
  },
  async ({ state, zipCode, loanType, timeframe, rateType }) => {
    try {
      const queryParams: any = {};
      
      if (state) queryParams.state = state;
      if (zipCode) queryParams.zip_code = zipCode;
      if (loanType) queryParams.loan_type = loanType;
      if (timeframe) queryParams.timeframe = timeframe;
      if (rateType) queryParams.rate_type = rateType;

      const result = await makeApiRequest("/v1/trends", "GET", queryParams);

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
          text: `Error fetching market trends: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// Get Loan Requirements Tool
server.tool(
  "get-loan-requirements",
  {
    loanType: z.string().describe("Loan type (conventional, fha, va, usda)"),
    state: z.string().optional().describe("State abbreviation for state-specific requirements"),
    propertyType: z.string().optional().describe("Property type (single_family, condo, townhouse, multi_family)"),
    occupancy: z.string().optional().describe("Occupancy type (primary, secondary, investment)")
  },
  async ({ loanType, state, propertyType, occupancy }) => {
    try {
      const queryParams: any = {
        loan_type: loanType
      };
      
      if (state) queryParams.state = state;
      if (propertyType) queryParams.property_type = propertyType;
      if (occupancy) queryParams.occupancy = occupancy;

      const result = await makeApiRequest("/v1/requirements", "GET", queryParams);

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
          text: `Error fetching loan requirements: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// Pre-qualification Tool
server.tool(
  "prequalify-borrower",
  {
    annualIncome: z.number().describe("Annual gross income in dollars"),
    monthlyDebts: z.number().describe("Total monthly debt payments in dollars"),
    creditScore: z.number().describe("Credit score (300-850)"),
    downPayment: z.number().describe("Available down payment in dollars"),
    employmentYears: z.number().describe("Years of employment history"),
    loanType: z.string().optional().default("conventional").describe("Desired loan type"),
    state: z.string().describe("State abbreviation where property will be located")
  },
  async ({ annualIncome, monthlyDebts, creditScore, downPayment, employmentYears, loanType, state }) => {
    try {
      const requestData = {
        annual_income: annualIncome,
        monthly_debts: monthlyDebts,
        credit_score: creditScore,
        down_payment: downPayment,
        employment_years: employmentYears,
        loan_type: loanType,
        state: state
      };

      const result = await makeApiRequest("/v1/prequalify", "POST", requestData);

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
          text: `Error with pre-qualification: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// Get Rate History Tool
server.tool(
  "get-rate-history",
  {
    loanType: z.string().optional().default("conventional").describe("Loan type (conventional, fha, va, usda)"),
    loanTerm: z.number().optional().default(30).describe("Loan term in years"),
    rateType: z.string().optional().default("fixed").describe("Rate type (fixed, arm)"),
    startDate: z.string().optional().describe("Start date for history (YYYY-MM-DD)"),
    endDate: z.string().optional().describe("End date for history (YYYY-MM-DD)"),
    state: z.string().optional().describe("State abbreviation for regional rates")
  },
  async ({ loanType, loanTerm, rateType, startDate, endDate, state }) => {
    try {
      const queryParams: any = {
        loan_type: loanType,
        loan_term: loanTerm,
        rate_type: rateType
      };
      
      if (startDate) queryParams.start_date = startDate;
      if (endDate) queryParams.end_date = endDate;
      if (state) queryParams.state = state;

      const result = await makeApiRequest("/v1/rates/history", "GET", queryParams);

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
          text: `Error fetching rate history: ${error instanceof Error ? error.message : String(error)}`
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
