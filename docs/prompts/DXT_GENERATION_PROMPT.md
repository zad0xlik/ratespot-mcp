# DXT Generation Process Guide

## Overview
This guide outlines the strict process for generating DXT packages for RateSpot MCP. Follow these steps precisely to ensure consistent and reliable package creation.

## Pre-Generation Checklist

1. **Version Update**
   - Update version in `package.json`
   - Update version in `dxt-extension/manifest.json`
   - Follow semantic versioning (MAJOR.MINOR.PATCH)

2. **Manifest Validation**
   - Ensure manifest.json is UTF-8 encoded
   - Validate all required fields are present
   - Check tool definitions are complete and accurate

3. **Dependencies**
   - Verify all required dependencies are listed in package.json
   - Ensure all dependencies are compatible with current version

## Generation Process

### 1. Clean Build Environment
```bash
# Clean up any existing build artifacts
rm -rf dist
rm -rf /tmp/dxt_clean_build
mkdir -p /tmp/dxt_clean_build

# Copy only necessary files
cp -r dxt-extension/* /tmp/dxt_clean_build/
```

### 2. Manifest Preparation
```typescript
import * as fs from 'fs';

function cleanAndValidateJson(filePath: string): void {
  // Read and parse JSON to validate
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  
  // Write back with consistent formatting
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
```

### 3. Pre-Pack Validation
- Run `dxt validate manifest.json`
- Fix any validation errors before proceeding
- Do not proceed if validation fails

### 4. Package Creation
```bash
# Pack the extension
dxt pack . ../ratespot-mcp-[VERSION].dxt

# Move to final location
cp /tmp/dxt_clean_build/../ratespot-mcp-[VERSION].dxt ./ratespot-mcp-[VERSION].dxt
```

### 5. Clean Up
```bash
# Remove temporary build directory
rm -rf /tmp/dxt_clean_build
```

## Important Notes

### JSON Handling
- Always use UTF-8 encoding
- Use Node.js fs module for consistent handling
- Validate JSON structure before and after modifications

### Version Management
- Increment version numbers consistently across all files
- Document version changes in CHANGELOG.md
- Tag releases in git repository

### File Structure
```
ratespot-mcp-[VERSION].dxt/
├── manifest.json
├── icon.svg
├── server/
│   ├── ratespot_mcp_server_streaming.js
│   ├── src/
│   │   ├── FileAnalyzer.js
│   │   └── FileServerManager.js
│   └── package.json
└── node_modules/
```

### Tool Schema Requirements

Each tool in the manifest.json must include:
1. **name**: Unique identifier for the tool
2. **description**: Clear description of what the tool does
3. **inputSchema**: JSON Schema defining the tool's input parameters
4. **outputSchema** (optional): JSON Schema defining the tool's output format

Example tool definition:
```json
{
  "name": "get-mortgage-rates",
  "description": "Get current mortgage rates with streaming support",
  "inputSchema": {
    "type": "object",
    "properties": {
      "zipCode": {
        "type": "string",
        "description": "ZIP code to search"
      },
      "loanAmount": {
        "type": "number",
        "description": "Loan amount in dollars"
      }
    },
    "required": ["zipCode"]
  }
}
```

### Common Issues
1. **Invalid Tool Schema**
   - Missing required fields (name, description, inputSchema)
   - Invalid JSON Schema syntax
   - Incorrect property types

2. **Manifest Validation Errors**
   - BOM characters in manifest.json
   - Invalid UTF-8 encoding
   - Malformed JSON structure

3. **Solutions**
   - Use UTF-8 encoding without BOM
   - Validate JSON Schema syntax
   - Test tool definitions with sample inputs
   - Use JSON Schema validators during development

### Available Tools

1. **Mortgage Rate Tools**
   - get-mortgage-rates: Get current mortgage rates
   - get-streaming-results: Get streaming rate updates

2. **File Management Tools**
   - analyze_file: Get detailed file information
   ```json
   {
     "name": "analyze_file",
     "description": "Get detailed file information including MIME type, encoding, and metadata",
     "inputSchema": {
       "type": "object",
       "properties": {
         "path": {
           "type": "string",
           "description": "Path to the file to analyze"
         }
       },
       "required": ["path"]
     }
   }
   ```

   - read_file: Read file contents with encoding detection
   ```json
   {
     "name": "read_file",
     "description": "Read file contents with automatic encoding detection",
     "inputSchema": {
       "type": "object",
       "properties": {
         "path": {
           "type": "string",
           "description": "Path to the file to read"
         }
       },
       "required": ["path"]
     }
   }
   ```

   - list_directory: List files with detailed information
   ```json
   {
     "name": "list_directory",
     "description": "List files with detailed information, optionally recursive",
     "inputSchema": {
       "type": "object",
       "properties": {
         "path": {
           "type": "string",
           "description": "Path to the directory to list"
         },
         "recursive": {
           "type": "boolean",
           "description": "Whether to list files recursively",
           "default": false
         }
       },
       "required": ["path"]
     }
   }
   ```

### Implementation Requirements
- Add tool definition to manifest.json
- Implement tool in server code
- Add tests for new tool
- Update documentation

### Port Handling
```typescript
async function findAvailablePort(startPort: number = 3001): Promise<number> {
  const tryPort = (port: number): Promise<number> => {
    return new Promise((resolve, reject) => {
      const server = createServer();
      server.once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          resolve(tryPort(port + 1));
        } else {
          reject(err);
        }
      });
      server.once('listening', () => {
        server.close();
        resolve(port);
      });
      server.listen(port);
    });
  };

  return tryPort(startPort);
}
```

## Testing Requirements

1. **Pre-Release Testing**
   - Verify manifest validation
   - Test all tools
   - Check port conflict handling
   - Validate file operations

2. **Installation Testing**
   - Fresh installation
   - Upgrade from previous version
   - Uninstallation cleanup

## Documentation Updates

When adding new tools or making significant changes:

1. Update the following files:
   - README.md
   - docs/installation/DXT_INSTALLATION_GUIDE.md
   - CHANGELOG.md

2. Include:
   - New tool documentation
   - Updated version information
   - Any new configuration options
   - Breaking changes

## Release Process

1. **Final Checks**
   - All tests pass
   - Documentation updated
   - Version numbers consistent
   - CHANGELOG.md updated

2. **Build Process**
   - Run `npm run build`
   - Follow generation steps exactly
   - Archive build artifacts

3. **Distribution**
   - Upload to GitHub releases
   - Update download links
   - Notify users of update

## Troubleshooting Guide

If issues occur during generation:

1. **Clean Build Environment**
   ```bash
   rm -rf dist
   rm -rf /tmp/dxt_clean_build
   rm -f ratespot-mcp-*.dxt
   ```

2. **Verify JSON**
   ```bash
   node -e "JSON.parse(require('fs').readFileSync('manifest.json'))"
   ```

3. **Check Permissions**
   ```bash
   chmod +x create_clean_dxt.sh
   ```

4. **Validate Manifest**
   ```bash
   dxt validate manifest.json
   ```

Remember: Always use this guide when generating new DXT packages or adding new tools to ensure consistency and reliability.
