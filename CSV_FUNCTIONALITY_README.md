# CSV File Saving and Download Functionality

This document describes the new CSV file saving and download functionality added to the RateSpot MCP Server.

## Overview

The RateSpot MCP Server now automatically saves CSV files locally when you request data in CSV format, and provides download links for easy access. This solves the previous issue where CSV data was only displayed as text in the response.

## New Features

### 1. Automatic CSV File Saving
- When you use `format="csv"` with any mortgage tool, the data is automatically saved as a CSV file
- Files are saved in the `data/` folder with timestamped names
- Each file includes metadata headers with search parameters and generation timestamp

### 2. HTTP Download Server
- A local HTTP server runs on port 3001 to serve CSV files
- Provides direct download links for all saved files
- Supports CORS for browser access

### 3. File Management Tools
- **`list-saved-files`** - View all saved CSV files with metadata
- **`get-download-link`** - Generate download links for specific files
- **`delete-csv-file`** - Remove unwanted CSV files

### 4. Enhanced User Experience
- Clear success messages with file information
- Download links that work immediately
- File size and creation date information
- Multiple access methods (download link, local folder, file server)

## Updated Tools

### Mortgage Rate Tools with CSV Support

All three main tools now support CSV file saving:

1. **`get-mortgage-rates`** - Saves mortgage rate comparisons
2. **`compare-loan-products`** - Saves detailed loan product data
3. **`calculate-monthly-payment`** - Saves payment breakdowns

### New File Management Tools

4. **`list-saved-files`** - List all saved CSV files
   ```json
   {
     "fileType": "mortgage_rates" // Optional filter
   }
   ```

5. **`get-download-link`** - Get download link for a specific file
   ```json
   {
     "fileName": "mortgage_rates_2025-01-15_143022.csv"
   }
   ```

6. **`delete-csv-file`** - Delete a specific CSV file
   ```json
   {
     "fileName": "mortgage_rates_2025-01-15_143022.csv"
   }
   ```

## File Naming Convention

CSV files are automatically named using this pattern:
```
{tool_type}_{YYYY-MM-DD}_{HHMMSS}.csv
```

Examples:
- `mortgage_rates_2025-01-15_143022.csv`
- `loan_comparison_2025-01-15_143045.csv`
- `payment_calculation_2025-01-15_143108.csv`

## File Structure

Each CSV file includes:

1. **Metadata Header** (commented lines starting with #)
   - Generation timestamp
   - Search parameters used
   - File type

2. **CSV Data**
   - Properly escaped according to RFC 4180
   - Headers and data rows
   - Sorted by relevance (e.g., lowest rates first)

## Usage Examples

### Getting Mortgage Rates as CSV
```json
{
  "zipCode": "44053",
  "propertyValue": 650000,
  "downPayment": 150000,
  "creditScore": 750,
  "format": "csv"
}
```

**Response:**
```
✅ CSV FILE SAVED SUCCESSFULLY

📁 File: mortgage_rates_2025-01-15_143022.csv
📍 Location: /path/to/project/data/mortgage_rates_2025-01-15_143022.csv
🔗 Download Link: http://localhost:3001/download/mortgage_rates_2025-01-15_143022.csv

📊 Summary: Found 45 mortgage products
🏆 Best Rate: 6.125% from Quicken Loans

💡 How to access:
• Click the download link above
• Or visit: http://localhost:3001/list to see all saved files
• File is also available in the local 'data' folder
```

### Listing Saved Files
```json
{
  "fileType": "mortgage_rates"  // Optional filter
}
```

**Response:**
```
📁 SAVED CSV FILES (3 files)

🌐 File Server: http://localhost:3001/list

📄 mortgage_rates_2025-01-15_143022.csv
   📊 Size: 12.5 KB
   📅 Created: 1/15/2025, 2:30:22 PM
   🔗 Download: http://localhost:3001/download/mortgage_rates_2025-01-15_143022.csv
   📍 Local: /path/to/project/data/mortgage_rates_2025-01-15_143022.csv

💡 Quick Actions:
• Visit http://localhost:3001/list for JSON list
• Click any download link above to get the CSV file
• Files are also available in the local 'data' folder
```

## HTTP Server Endpoints

The built-in HTTP server provides these endpoints:

- **`GET /download/{filename}`** - Download a specific CSV file
- **`GET /list`** - Get JSON list of all available files

### Example: List Files via HTTP
```bash
curl http://localhost:3001/list
```

```json
[
  {
    "name": "mortgage_rates_2025-01-15_143022.csv",
    "size": 12800,
    "created": "2025-01-15T21:30:22.000Z",
    "downloadUrl": "http://localhost:3001/download/mortgage_rates_2025-01-15_143022.csv"
  }
]
```

## Integration with Claude Desktop

The saved CSV files are automatically accessible to Claude Desktop through the MCP connection. Claude can:

1. **Read saved files** - Analyze the CSV data for insights
2. **Reference file paths** - Access files in the local data folder
3. **Use download links** - Direct users to download files

## Technical Implementation

### File Storage
- Files are stored in the `data/` directory (created automatically)
- UTF-8 encoding with proper CSV escaping
- Metadata headers for context and debugging

### HTTP Server
- Node.js HTTP server on port 3001
- CORS enabled for browser access
- Automatic file streaming for downloads
- JSON API for file listing

### Error Handling
- Graceful handling of file system errors
- Clear error messages for missing files
- Automatic server startup when needed

## Testing

Use the included test script to verify functionality:

```bash
node test_csv_functionality.js
```

This will:
1. Start the MCP server
2. Request mortgage rates in CSV format
3. Verify file creation and download links
4. Display results and file information

## Troubleshooting

### Common Issues

1. **Port 3001 already in use**
   - The file server will fail to start
   - Change `FILE_SERVER_PORT` in the code if needed

2. **Permission errors**
   - Ensure write permissions for the project directory
   - The `data/` folder is created automatically

3. **Files not appearing**
   - Check that the CSV format was requested (`format: "csv"`)
   - Verify the MCP server is running properly

### File Server Not Starting
If the download links don't work:
1. Check if port 3001 is available
2. Look for error messages in the server logs
3. Restart the MCP server

## Benefits

1. **No More Copy/Paste** - Files are automatically saved and ready to download
2. **Persistent Storage** - Data is saved locally for future reference
3. **Easy Sharing** - Download links make it easy to share data
4. **Claude Integration** - Files are accessible to Claude Desktop for analysis
5. **Organized Storage** - Timestamped files with clear naming convention
6. **Metadata Included** - Search parameters saved with each file for context

## Future Enhancements

Potential improvements for future versions:
- File compression for large datasets
- Export to other formats (Excel, JSON)
- Automatic cleanup of old files
- File encryption for sensitive data
- Cloud storage integration
