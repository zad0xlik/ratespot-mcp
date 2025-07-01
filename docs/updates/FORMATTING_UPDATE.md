# RateSpot MCP Server - Formatting Update

## Overview

The RateSpot MCP Server has been updated to provide better formatted responses for use in Claude Desktop. Instead of returning large JSON responses that are difficult to read, the tools now return formatted tables and offer CSV export functionality.

## New Features

### 1. Table Format (Default)
- Clean, readable table format with mortgage rate comparisons
- Shows top 20 results sorted by rate (lowest first)
- Includes best rate summary with detailed information
- Displays search parameters for context

### 2. CSV Export Format
- Complete data export in CSV format with RFC 4180 compliant escaping
- Includes all available mortgage products (not limited to 20)
- Ready to copy and save as .csv file
- Proper CSV escaping handles commas, quotes, and newlines in lender names
- Fixes issues with lender names containing commas (e.g., "SunnyHill Financial, Inc.")

### 3. Pipe-Delimited Format
- Alternative export format using pipe (|) delimiters
- Eliminates comma conflicts entirely
- Simple and robust for data with special characters
- Ready to copy and save as .txt file
- Easily importable into Excel/Google Sheets

## Updated Tools

### get-mortgage-rates
**New Parameter:**
- `format` (optional): "table" (default), "csv", or "pipe"

**Table Format Output:**
```
MORTGAGE RATES COMPARISON
================================================================================

Found 1782 mortgage products (showing top 20)

┌─────────────────────────────────┬──────┬──────┬───────────┬────────┬─────────────┬──────────┐
│ Lender                          │ Rate │ APR  │ Payment   │ Points │ Upfront     │ Type     │
├─────────────────────────────────┼──────┼──────┼───────────┼────────┼─────────────┼──────────┤
│ District Lending                │ 4.250%│ 4.674%│    $3,010│   2.38│     $11,500│ Conv     │
│ ...                             │ ...  │ ...  │       ... │    ... │         ... │ ...      │
└─────────────────────────────────┴──────┴──────┴───────────┴────────┴─────────────┴──────────┘

BEST RATE DETAILS:
-----------------
Lender: District Lending
Rate: 4.250%
APR: 4.674%
Monthly Payment: $3,010
Points: 2.375
Upfront Costs: $11,500
Loan Type: Conventional
Rate Lock: 30 days

SEARCH PARAMETERS:
--------------------
Property Value: $500,000
Down Payment: $100,000 (20%)
Credit Score: 750
ZIP Code: 90210
Property Type: single_family
Occupancy: primary
```

**CSV Format Output:**
```
MORTGAGE RATES DATA (CSV FORMAT)
Copy the data below and save as .csv file:

Lender Name,Rate (%),APR (%),Monthly Payment ($),Points,Upfront Costs ($),Loan Type,Rate Description,Rate Lock (days),Purchase Price ($),Down Payment ($),Mortgage Balance ($),Credit Score,ZIP Code
"District Lending",4.25,4.674,3010,2.375,11500,"Conventional","15-year fixed",30,500000,100000,400000,750,"90210"
...
```

**Pipe Format Output:**
```
MORTGAGE RATES DATA (PIPE-DELIMITED FORMAT)
Copy the data below and save as .txt file:

Lender Name|Rate (%)|APR (%)|Monthly Payment ($)|Points|Upfront Costs ($)|Loan Type|Rate Description|Rate Lock (days)|Purchase Price ($)|Down Payment ($)|Mortgage Balance ($)|Credit Score|ZIP Code
District Lending|4.25|4.674|3010|2.375|11500|Conventional|15-year fixed|30|500000|100000|400000|750|90210
...
```

### compare-loan-products
**New Parameter:**
- `format` (optional): "table" (default), "csv", or "pipe"

Same formatting options as get-mortgage-rates.

### calculate-monthly-payment
**New Parameter:**
- `format` (optional): "table" (default), "csv", or "pipe"

**Table Format Output:**
```
MONTHLY PAYMENT CALCULATION
==================================================

┌─────────────────────────┬─────────────┬─────────────┐
│ Payment Component       │ Monthly ($) │ Annual ($)  │
├─────────────────────────┼─────────────┼─────────────┤
│ Principal & Interest    │    2,528.27 │   30,339.24 │
│ Property Tax            │         500 │       6,000 │
│ Home Insurance          │         100 │       1,200 │
│ PMI                     │         200 │       2,400 │
│ HOA Fees                │           0 │           0 │
├─────────────────────────┼─────────────┼─────────────┤
│ TOTAL MONTHLY PAYMENT   │    3,328.27 │   39,939.24 │
└─────────────────────────┴─────────────┴─────────────┘

LOAN SUMMARY:
---------------
Loan Amount: $400,000
Interest Rate: 6.5%
Loan Term: 30 years (360 payments)
Total Interest Paid: $510,177.95
Total Amount Paid: $1,198,177.95
```

**CSV Format Output:**
```
MONTHLY PAYMENT CALCULATION (CSV FORMAT)
Copy the data below and save as .csv file:

Component,Monthly Amount ($),Annual Amount ($)
"Principal & Interest",2528.27,30339.24
"Property Tax",500,6000
"Home Insurance",100,1200
"PMI",200,2400
"HOA Fees",0,0
"Total Monthly Payment",3328.27,39939.24
"Total Interest Paid (30 years)",510177.95,
"Total Amount Paid (30 years)",1198177.95,
```

## Usage Examples

### In Claude Desktop:

**Get mortgage rates in table format (default):**
```
Get mortgage rates for a $500,000 property in 90210 with $100,000 down payment and 750 credit score
```

**Get mortgage rates in CSV format:**
```
Get mortgage rates for a $500,000 property in 90210 with $100,000 down payment and 750 credit score in CSV format
```

**Get mortgage rates in pipe format:**
```
Get mortgage rates for a $500,000 property in 90210 with $100,000 down payment and 750 credit score in pipe format
```

**Calculate monthly payment in table format:**
```
Calculate monthly payment for $400,000 loan at 6.5% for 30 years with $6,000 property tax and $1,200 insurance
```

**Calculate monthly payment in CSV format:**
```
Calculate monthly payment for $400,000 loan at 6.5% for 30 years with $6,000 property tax and $1,200 insurance in CSV format
```

**Calculate monthly payment in pipe format:**
```
Calculate monthly payment for $400,000 loan at 6.5% for 30 years with $6,000 property tax and $1,200 insurance in pipe format
```

## Benefits

1. **Improved Readability**: Table format is much easier to read than JSON
2. **Better Performance**: Limited results prevent Claude Desktop from being overwhelmed
3. **Data Export**: CSV format allows users to save and analyze data in spreadsheet applications
4. **Context Preservation**: Search parameters are included for reference
5. **Sorted Results**: Best rates are shown first for quick comparison

## Technical Implementation

- Added helper functions `formatMortgageProductsAsTable()`, `formatMortgageProductsAsCSV()`, and `formatMortgageProductsAsPipe()`
- Added `escapeCSVField()` function with RFC 4180 compliant CSV escaping
- Updated all three tools to accept a `format` parameter with options: "table", "csv", "pipe"
- Maintained backward compatibility (table format is default)
- Proper CSV escaping handles commas, quotes, newlines, and carriage returns in field data
- Pipe format uses minimal escaping (replaces pipes with dashes)
- Unicode box-drawing characters for clean table borders
- Fixed CSV comma conflicts in lender names like "SunnyHill Financial, Inc."

## Testing

Run the test script to verify functionality:
```bash
python3 test_new_formatting.py
```

This update significantly improves the user experience when using the RateSpot MCP tools in Claude Desktop by providing clean, readable output and flexible export options.
