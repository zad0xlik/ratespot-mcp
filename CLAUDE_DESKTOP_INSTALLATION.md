# RateSpot MCP Server - Claude Desktop Installation Guide

This guide will help you install and configure the RateSpot MCP Server for use with Claude Desktop.

## Prerequisites

- Node.js (version 14 or higher)
- Claude Desktop application
- RateSpot API key

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the TypeScript Server

```bash
npm run build
```

### 3. Get Your RateSpot API Key

You'll need a valid RateSpot API key to use this MCP server. Contact RateSpot to obtain your API key.

### 4. Configure Claude Desktop

#### Option A: Using the Configuration File

1. Open your Claude Desktop configuration file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the RateSpot MCP server configuration:

```json
{
  "mcpServers": {
    "ratespot": {
      "command": "node",
      "args": ["/path/to/your/ratespot-mcp/ratespot_mcp_server.js"],
      "env": {
        "RATESPOT_API_KEY": "your_actual_api_key_here"
      }
    }
  }
}
```

**Important**: Replace `/path/to/your/ratespot-mcp/` with the actual path to your project directory, and replace `your_actual_api_key_here` with your actual RateSpot API key.

#### Option B: Using Environment Variables

1. Set the environment variable on your system:

**macOS/Linux**:
```bash
export RATESPOT_API_KEY="your_actual_api_key_here"
```

**Windows**:
```cmd
set RATESPOT_API_KEY=your_actual_api_key_here
```

2. Add the server configuration without the env section:

```json
{
  "mcpServers": {
    "ratespot": {
      "command": "node",
      "args": ["/path/to/your/ratespot-mcp/ratespot_mcp_server.js"]
    }
  }
}
```

### 5. Restart Claude Desktop

After updating the configuration file, restart Claude Desktop for the changes to take effect.

## Available Tools

Once installed, you'll have access to these tools in Claude Desktop:

### 1. Get Mortgage Rates
Get current mortgage rates based on loan parameters.

**Parameters:**
- `loanAmount`: Loan amount in dollars
- `creditScore`: Credit score (300-850)
- `downPayment`: Down payment amount in dollars
- `propertyValue`: Property value in dollars
- `loanType`: Loan type (conventional, fha, va, usda)
- `propertyType`: Property type (single_family, condo, townhouse, multi_family)
- `occupancy`: Occupancy type (primary, secondary, investment)
- `state`: State abbreviation (e.g., CA, TX, NY)
- `zipCode`: ZIP code
- `loanTerm`: Loan term in years (15, 30, etc.)
- `rateType`: Rate type (fixed, arm)

### 2. Compare Loan Products
Compare different loan products for the same borrower profile.

**Parameters:**
- `loanAmount`: Loan amount in dollars
- `creditScore`: Credit score (300-850)
- `downPayment`: Down payment amount in dollars
- `propertyValue`: Property value in dollars
- `zipCode`: ZIP code
- `propertyType`: Property type (default: single_family)
- `occupancy`: Property use (default: primary)

### 3. Calculate Monthly Payment
Calculate monthly mortgage payment including principal, interest, taxes, and insurance.

**Parameters:**
- `loanAmount`: Loan amount in dollars
- `interestRate`: Annual interest rate as percentage (e.g., 6.5)
- `loanTerm`: Loan term in years
- `propertyTax`: Annual property tax in dollars (optional)
- `homeInsurance`: Annual home insurance in dollars (optional)
- `pmi`: Monthly PMI amount in dollars (optional)
- `hoaFees`: Monthly HOA fees in dollars (optional)

## Example Usage

Once configured, you can ask Claude questions like:

- "What are the current mortgage rates for a $400,000 loan with 20% down in California?"
- "Compare loan products for a $300,000 loan with a 750 credit score"
- "Calculate the monthly payment for a $500,000 loan at 6.5% interest for 30 years"

## Troubleshooting

### Common Issues

1. **"Server not found" error**
   - Verify the path to `ratespot_mcp_server.js` is correct
   - Ensure Node.js is installed and accessible

2. **"API key not found" error**
   - Check that your API key is correctly set in the environment variable or config file
   - Verify the API key is valid and active

3. **"Permission denied" error**
   - Ensure the server file has execute permissions
   - Check that Claude Desktop has permission to run Node.js

### Verification

To verify the installation is working:

1. Restart Claude Desktop
2. Look for the RateSpot tools in the available tools list
3. Try a simple query like getting mortgage rates

### Getting Help

If you encounter issues:

1. Check the Claude Desktop logs for error messages
2. Verify your API key is valid by testing it directly with the RateSpot API
3. Ensure all file paths in the configuration are absolute and correct

## Security Notes

- Never commit your API key to version control
- Store your API key securely using environment variables or secure configuration management
- Regularly rotate your API keys as per your organization's security policies
- The API key should be kept confidential and not shared

## Updates

To update the MCP server:

1. Pull the latest changes from the repository
2. Run `npm install` to update dependencies
3. Run `npm run build` to rebuild the server
4. Restart Claude Desktop

Your configuration and API key settings will remain unchanged during updates.
