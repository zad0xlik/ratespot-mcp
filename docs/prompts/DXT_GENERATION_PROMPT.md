# DXT Generation Process Guide

## Overview
This guide outlines the strict process for generating DXT packages for RateSpot MCP. Follow these steps precisely to ensure consistent and reliable package creation.

## Pre-Generation Checklist

1. **Version Update**
   - Update version in `package.json`
   - Update version in `dxt-extension/manifest.json`
   - Follow semantic versioning (MAJOR.MINOR.PATCH)

2. **Manifest Validation**
   - Ensure manifest.json is UTF-8 encoded without BOM
   - Validate all required fields are present
   - Check tool definitions are complete and accurate

3. **Dependencies**
   - Verify all required dependencies are listed in package.json
   - Ensure all dependencies are compatible with current version

## Generation Process

### 1. Clean Build Environment
```bash
# Clean up any existing build artifacts
rm -rf /tmp/dxt_clean_build
mkdir -p /tmp/dxt_clean_build

# Copy only necessary files
cp -r dxt-extension/* /tmp/dxt_clean_build/
```

### 2. Manifest Preparation
```python
# Use Python for consistent JSON handling
import json
import codecs

def clean_and_validate_json():
    # Read with UTF-8-BOM encoding to handle any BOM characters
    with codecs.open('manifest.json', 'r', encoding='utf-8-sig') as f:
        content = f.read()
        # Parse to validate JSON
        data = json.loads(content)
    
    # Write with explicit UTF-8 encoding without BOM
    with open('manifest.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
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
- Always use UTF-8 encoding without BOM
- Use Python's json module for consistent handling
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
│   ├── ratespot_mcp_server.js
│   └── package.json
└── node_modules/
```

### Adding New Tools

1. **Tool Definition**
   ```json
   {
     "name": "tool-name",
     "description": "Clear, concise description",
     "inputSchema": {
       "type": "object",
       "properties": {
         // Tool parameters
       }
     }
   }
   ```

2. **Implementation Requirements**
   - Add tool definition to manifest.json
   - Implement tool in server code
   - Add tests for new tool
   - Update documentation

3. **Validation Steps**
   - Verify tool schema is valid
   - Test tool functionality
   - Check error handling
   - Validate documentation

## Common Issues and Solutions

### JSON Validation Errors
- **Issue**: "Unexpected token 'P'" error
- **Solution**: Skip post-pack validation, rely on pre-pack validation only
- **Prevention**: Use clean_and_validate_json() function before packing

### Port Conflicts
- **Solution**: Implement automatic port selection
- **Code**: Use port conflict detection in server code
```typescript
function startFileServer(initialPort: number): void {
  const tryPort = (port: number): Promise<number> => {
    return new Promise((resolve, reject) => {
      const server = http.createServer();
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

  tryPort(initialPort).then(availablePort => {
    // Create and start server on available port
  });
}
```

## Testing Requirements

1. **Pre-Release Testing**
   - Verify manifest validation
   - Test all tools
   - Check port conflict handling
   - Validate file downloads

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
   - Follow generation steps exactly
   - No post-pack validation
   - Archive build artifacts

3. **Distribution**
   - Upload to GitHub releases
   - Update download links
   - Notify users of update

## Troubleshooting Guide

If issues occur during generation:

1. **Clean Build Environment**
   ```bash
   rm -rf /tmp/dxt_clean_build
   rm -f ratespot-mcp-*.dxt
   ```

2. **Verify JSON**
   ```bash
   python3 -c "import json; json.load(open('manifest.json'))"
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
