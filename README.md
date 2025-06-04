# RateSpot MCP Server

A Model Context Protocol (MCP) server that provides access to RateSpot.io mortgage rate APIs. This server enables AI assistants to fetch real-time mortgage rates, compare loan products, calculate payments, and access comprehensive lending information.

## Features

The RateSpot MCP Server provides the following tools:

### 🏠 Mortgage Rate Tools
- **get-mortgage-rates**: Fetch current mortgage rates based on loan criteria
- **get-rate-history**: Access historical rate data and trends
- **get-market-trends**: Analyze market trends by location and timeframe

### 🏦 Lender Information
- **get-lender-info**: Retrieve detailed lender information and ratings
- **get-loan-requirements**: Get specific requirements for different loan types

### 📊 Loan Analysis Tools
- **compare-loan-products**: Compare multiple loan types and terms side-by-side
- **calculate-monthly-payment**: Calculate detailed monthly payment breakdowns
- **prequalify-borrower**: Pre-qualify borrowers based on financial criteria

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- RateSpot API key (get yours at [https://app.ratespot.io/account-settings](https://app.ratespot.io/account-settings) or create a free account at [https://app.ratespot.io](https://app.ratespot.io))

### Setup

1. **Clone or download this repository**
   ```bash
   git clone https://github.com/zad0xlik/ratespot-mcp.git
   cd ratespot-mcp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Get your RateSpot API key**
   - If you have an existing account: Visit [https://app.ratespot.io/account-settings](https://app.ratespot.io/account-settings) to find your API key
   - If you need an account: Sign up for free at [https://app.ratespot.io](https://app.ratespot.io) (no charge for initial plan with moderate volume of requests)

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file and add your RateSpot API key:
   ```
   RATESPOT_API_KEY=your_actual_api_key_here
   ```

5. **Build the server**
   ```bash
   npm run build
   ```

6. **Test the server**
   ```bash
   npm run dev
   ```

## Configuration

### MCP Client Configuration

To use this server with an MCP client (like Claude Desktop), add the following configuration:

#### For Claude Desktop (macOS)
Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ratespot": {
      "command": "node",
      "args": ["/path/to/ratespot-mcp-server/ratespot_mcp_server.js"],
      "env": {
        "RATESPOT_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

#### For Claude Desktop (Windows)
Add to `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ratespot": {
      "command": "node",
      "args": ["C:\\path\\to\\ratespot-mcp-server\\ratespot_mcp_server.js"],
      "env": {
        "RATESPOT_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Available Tools

### get-mortgage-rates
Fetch current mortgage rates based on specific criteria.

**Parameters:**
- `loanAmount` (optional): Loan amount in dollars
- `creditScore` (optional): Credit score (300-850)
- `downPayment` (optional): Down payment amount in dollars
- `propertyValue` (optional): Property value in dollars
- `loanType` (optional): Loan type (conventional, fha, va, usda)
- `propertyType` (optional): Property type (single_family, condo, townhouse, multi_family)
- `occupancy` (optional): Occupancy type (primary, secondary, investment)
- `state` (optional): State abbreviation (e.g., CA, TX, NY)
- `zipCode` (optional): ZIP code
- `loanTerm` (optional): Loan term in years (15, 30, etc.)
- `rateType` (optional): Rate type (fixed, arm)

### get-lender-info
Retrieve information about mortgage lenders.

**Parameters:**
- `lenderId` (optional): Specific lender ID
- `state` (optional): State abbreviation to filter lenders
- `loanType` (optional): Loan type to filter lenders
- `minRating` (optional): Minimum lender rating (1-5)
- `limit` (optional): Number of lenders to return (default: 20)

### compare-loan-products
Compare multiple loan products side-by-side.

**Parameters:**
- `loanAmount` (required): Loan amount in dollars
- `creditScore` (required): Credit score (300-850)
- `downPayment` (required): Down payment amount in dollars
- `propertyValue` (required): Property value in dollars
- `state` (required): State abbreviation
- `loanTypes` (optional): Array of loan types to compare (default: ["conventional", "fha", "va"])
- `loanTerms` (optional): Array of loan terms to compare (default: [15, 30])
- `maxResults` (optional): Maximum results per loan type (default: 10)

### calculate-monthly-payment
Calculate detailed monthly payment breakdown.

**Parameters:**
- `loanAmount` (required): Loan amount in dollars
- `interestRate` (required): Annual interest rate as percentage
- `loanTerm` (required): Loan term in years
- `propertyTax` (optional): Annual property tax in dollars
- `homeInsurance` (optional): Annual home insurance in dollars
- `pmi` (optional): Monthly PMI amount in dollars
- `hoaFees` (optional): Monthly HOA fees in dollars

### get-market-trends
Analyze mortgage rate trends by location and timeframe.

**Parameters:**
- `state` (optional): State abbreviation
- `zipCode` (optional): ZIP code for local trends
- `loanType` (optional): Loan type
- `timeframe` (optional): Timeframe (7d, 30d, 90d, 1y) (default: "30d")
- `rateType` (optional): Rate type (fixed, arm)

### get-loan-requirements
Get specific requirements for different loan types.

**Parameters:**
- `loanType` (required): Loan type (conventional, fha, va, usda)
- `state` (optional): State abbreviation for state-specific requirements
- `propertyType` (optional): Property type
- `occupancy` (optional): Occupancy type

### prequalify-borrower
Pre-qualify borrowers based on financial criteria.

**Parameters:**
- `annualIncome` (required): Annual gross income in dollars
- `monthlyDebts` (required): Total monthly debt payments in dollars
- `creditScore` (required): Credit score (300-850)
- `downPayment` (required): Available down payment in dollars
- `employmentYears` (required): Years of employment history
- `loanType` (optional): Desired loan type (default: "conventional")
- `state` (required): State abbreviation where property will be located

### get-rate-history
Access historical mortgage rate data.

**Parameters:**
- `loanType` (optional): Loan type (default: "conventional")
- `loanTerm` (optional): Loan term in years (default: 30)
- `rateType` (optional): Rate type (default: "fixed")
- `startDate` (optional): Start date for history (YYYY-MM-DD)
- `endDate` (optional): End date for history (YYYY-MM-DD)
- `state` (optional): State abbreviation for regional rates

## Development

### Scripts
- `npm run build`: Compile TypeScript to JavaScript
- `npm run dev`: Build and run the server
- `npm run clean`: Remove compiled JavaScript files
- `npm run check`: Type-check without emitting files

### Project Structure
```
ratespot-mcp-server/
├── package.json              # Project configuration and dependencies
├── tsconfig.json            # TypeScript configuration
├── ratespot_mcp_server.ts   # Main server implementation
├── .env.example             # Environment variable template
└── README.md               # This file
```

## API Integration

This server integrates with the RateSpot.io API to provide:
- Real-time mortgage rate data
- Lender information and ratings
- Loan product comparisons
- Market trend analysis
- Pre-qualification services

## Error Handling

The server includes comprehensive error handling for:
- API authentication failures
- Network connectivity issues
- Invalid parameter validation
- Rate limiting and quota management

## Security

- API keys are managed through environment variables
- All API requests use secure HTTPS connections
- Input validation using Zod schemas
- Error messages sanitized to prevent information leakage

## Support

For issues related to:
- **RateSpot API**: Contact RateSpot.io support
- **MCP Server**: Create an issue in this repository
- **MCP Protocol**: Refer to the [Model Context Protocol documentation](https://modelcontextprotocol.io/)

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Changelog

### v1.0.0
- Initial release
- Complete RateSpot API integration
- All core mortgage tools implemented
- Comprehensive error handling
- Full MCP protocol compliance
