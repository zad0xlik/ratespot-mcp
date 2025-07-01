# Enhanced File Access System for RateSpot MCP

## Overview

The RateSpot MCP server now includes a comprehensive enhanced file access system that provides Claude with seamless access to analyze, compare, and manage CSV files containing mortgage rate data. This system solves the previous issue where Claude couldn't access downloaded files.

## Key Features

### 🔧 **Core Enhancements**

1. **Direct File Access Tools** - Claude can now directly read, analyze, and compare CSV files
2. **Built-in HTTP File Server** - Automatic file server on port 3001 for easy downloads
3. **Intelligent CSV Parsing** - Advanced parsing with metadata extraction
4. **Multiple Analysis Types** - Summary, detailed, rates-focused, and comparison analysis
5. **File Management** - List, delete, and organize saved files
6. **Search Parameter Tracking** - Files include metadata about the original search parameters

### 📊 **New MCP Tools Available**

#### File Management Tools
- `list-saved-files` - List all CSV files with metadata and download links
- `get-download-link` - Generate download links for specific files
- `delete-csv-file` - Remove files from the data folder
- `get-file-summary` - Quick overview of file(s) with key statistics

#### Analysis Tools
- `analyze-csv-file` - Deep analysis of CSV files with multiple analysis types:
  - **summary** - Basic overview with key metrics
  - **detailed** - Column-by-column analysis
  - **rates** - Focus on mortgage rate analysis with best rates and statistics
  - **comparison** - Sample data view for understanding structure

#### Comparison Tools
- `compare-csv-files` - Compare two CSV files by:
  - **rates** - Rate comparison and statistics
  - **lenders** - Lender overlap and differences
  - **structure** - Column structure comparison
  - **all** - Comprehensive comparison

## How It Works

### 1. **Automatic File Saving**
When you use mortgage tools with `format='csv'`, files are automatically saved to the `data/` folder with:
- Timestamped filenames
- Metadata headers with search parameters
- Proper CSV formatting

### 2. **HTTP File Server**
- Automatically starts on port 3001 when files are saved
- Provides direct download links
- JSON API at `http://localhost:3001/list` for file listings

### 3. **Intelligent Parsing**
- Extracts metadata from comment headers
- Parses CSV data with proper type detection
- Handles various CSV formats and escaping

### 4. **Analysis Engine**
- Automatically detects rate and lender columns
- Calculates statistics (min, max, average, range)
- Provides insights into data quality and structure

## Usage Examples

### Basic File Management
```
# List all saved files
Use tool: list-saved-files

# Get summary of all files
Use tool: get-file-summary

# Get summary of specific file
Use tool: get-file-summary with fileName: "mortgage_rates_2025-06-27_2243.csv"
```

### File Analysis
```
# Basic analysis
Use tool: analyze-csv-file with fileName: "mortgage_rates_2025-06-27_2243.csv"

# Detailed column analysis
Use tool: analyze-csv-file with fileName: "mortgage_rates_2025-06-27_2243.csv", analysisType: "detailed"

# Focus on rates
Use tool: analyze-csv-file with fileName: "mortgage_rates_2025-06-27_2243.csv", analysisType: "rates"
```

### File Comparison
```
# Compare rates between two files
Use tool: compare-csv-files with file1: "mortgage_rates_2025-06-27_2243.csv", file2: "mortgage_rates_2025-06-27_2231.csv"

# Compare lenders
Use tool: compare-csv-files with file1: "file1.csv", file2: "file2.csv", compareBy: "lenders"

# Full comparison
Use tool: compare-csv-files with file1: "file1.csv", file2: "file2.csv", compareBy: "all"
```

## File Structure

### Data Directory
```
data/
├── mortgage_rates_2025-06-27_2243.csv
├── mortgage_rates_2025-06-27_2231.csv
├── loan_comparison_2025-06-27_1234.csv
└── payment_calculation_2025-06-27_5678.csv
```

### CSV File Format
```csv
# Generated on: 2025-06-27T23:43:06.123Z
# Search Parameters: {"propertyValue":500000,"downPayment":250000,...}
# File Type: mortgage_rates

Lender,Rate,APR,Payment,Points,Upfront_Costs,Loan_Type,Quote_Type
"Bank of America",4.250%,4.350%,"$2,456",0,"$3,200","Conventional","Retail"
"Wells Fargo",4.375%,4.475%,"$2,518",0.5,"$2,800","Conventional","Retail"
...
```

## Benefits for Claude

### 🎯 **Seamless Analysis**
- No more "Failed to fetch" errors
- Direct access to file contents and metadata
- Rich analysis capabilities built-in

### 📈 **Intelligent Insights**
- Automatic rate analysis and ranking
- Lender comparison and overlap detection
- Statistical summaries and trends

### 🔄 **Easy Comparisons**
- Compare multiple rate searches
- Track rate changes over time
- Analyze different loan scenarios

### 📁 **File Management**
- Organized file storage with timestamps
- Easy cleanup and maintenance
- Download links for external use

## Technical Implementation

### Enhanced Tools Added
1. **File Management**: 4 new tools for listing, downloading, deleting, and summarizing
2. **Analysis Engine**: Advanced CSV parsing with metadata extraction
3. **Comparison System**: Multi-dimensional file comparison capabilities
4. **HTTP Server**: Built-in file server for easy access

### Key Functions
- `parseCSVFile()` - Intelligent CSV parsing with metadata
- `getAllCSVFiles()` - File discovery and metadata collection
- `startFileServer()` - HTTP server for file downloads
- Analysis functions for rates, lenders, and structure comparison

### Error Handling
- File existence validation
- Graceful error messages
- Fallback options for missing data

## Future Enhancements

### Planned Features
- **MCP Resources** - Direct file content access via MCP resource protocol
- **Advanced Filtering** - Filter files by date, type, or search parameters
- **Export Options** - Additional export formats (JSON, Excel)
- **Visualization** - Chart generation for rate trends

### Extensibility
The system is designed to be easily extensible for:
- Additional file formats
- More analysis types
- Custom comparison metrics
- Integration with external tools

## Troubleshooting

### Common Issues
1. **Port 3001 in use** - The file server will handle this gracefully
2. **File not found** - Use `list-saved-files` to see available files
3. **Empty analysis** - Check if file has data rows beyond headers

### Debug Information
- File server logs to stderr
- Detailed error messages in tool responses
- File metadata includes creation timestamps and search parameters

## Conclusion

The enhanced file access system transforms how Claude interacts with mortgage rate data, providing:
- **Seamless file access** without fetch errors
- **Rich analysis capabilities** for data insights
- **Easy file management** and organization
- **Powerful comparison tools** for decision making

This system ensures that Claude can now effectively analyze and compare mortgage rate data, making the RateSpot MCP server a powerful tool for mortgage analysis and comparison.
