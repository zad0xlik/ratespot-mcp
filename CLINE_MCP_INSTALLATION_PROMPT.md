# Comprehensive Prompt for Installing MCP Servers in Cline

## Overview
This prompt provides step-by-step instructions for an AI assistant to help users install and configure Model Context Protocol (MCP) servers in Cline. Use this as a guide to walk users through the complete process.

---

## Step-by-Step MCP Installation Guide for Cline

### Step 1: Understanding MCP and Prerequisites
First, explain to the user what MCP is and verify prerequisites:

**What is MCP?**
- Model Context Protocol (MCP) is a standard that allows AI assistants to connect to external tools and data sources
- MCP servers provide tools and resources that extend Cline's capabilities
- Examples include database connections, API integrations, file systems, and specialized services

**Prerequisites Check:**
1. **Node.js**: Verify Node.js v16+ is installed
   ```bash
   node --version
   npm --version
   ```

2. **Cline**: Ensure Cline is properly installed and running in VS Code

3. **API Keys/Credentials**: Identify what credentials are needed for the specific MCP server

### Step 2: Choose Installation Method
Explain the three main ways to install MCP servers:

**Option A: Pre-built MCP Servers**
- Use existing servers from the MCP ecosystem
- Examples: GitHub, Postgres, Spotify, etc.
- Fastest setup, minimal configuration

**Option B: Custom MCP Server (like RateSpot)**
- Download/clone a specific MCP server project
- Requires building and configuration
- More setup but provides specialized functionality

**Option C: Create New MCP Server**
- Build from scratch using MCP SDK
- Most complex but fully customizable

### Step 3: Installation Process (Using RateSpot MCP as Example)

#### 3.1 Download and Setup the MCP Server
```bash
# Clone the repository
git clone https://github.com/zad0xlik/ratespot-mcp.git
cd ratespot-mcp

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

#### 3.2 Configure Environment Variables
Edit the `.env` file with required credentials:
```bash
# Open the .env file
nano .env

# Add your API key
RATESPOT_API_KEY=your_actual_api_key_here
NODE_ENV=production
```

#### 3.3 Build the Server
```bash
# Compile TypeScript to JavaScript
npm run build

# Test the server works
npm run test
```

### Step 4: Configure Cline MCP Settings

#### 4.1 Locate Cline MCP Configuration File
The configuration file location depends on the operating system:

**macOS:**
```
~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

**Windows:**
```
%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json
```

**Linux:**
```
~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

#### 4.2 Add MCP Server Configuration
Open the `cline_mcp_settings.json` file and add your server configuration:

```json
{
  "mcpServers": {
    "ratespot": {
      "autoApprove": [],
      "disabled": false,
      "timeout": 60,
      "command": "node",
      "args": [
        "/full/path/to/ratespot-mcp/ratespot_mcp_server.js"
      ],
      "env": {
        "RATESPOT_API_KEY": "your_actual_api_key_here"
      },
      "transportType": "stdio"
    }
  }
}
```

**Important Configuration Notes:**
- `"autoApprove": []` - Tools that don't require user approval
- `"disabled": false` - Set to true to temporarily disable
- `"timeout": 60` - Timeout in seconds for tool operations
- `"command"` - The executable command (usually "node" for Node.js servers)
- `"args"` - Array of arguments, including the full path to the server file
- `"env"` - Environment variables the server needs
- `"transportType": "stdio"` - Communication method (usually stdio)

### Step 5: Restart and Verify Installation

#### 5.1 Restart Cline
1. Close VS Code completely
2. Reopen VS Code
3. Start a new Cline conversation

#### 5.2 Verify MCP Server is Connected
In Cline, you should see the MCP server listed in the available tools. Test it:

```
Can you use the ratespot MCP server to get current mortgage rates?
```

### Step 6: Troubleshooting Common Issues

#### Issue 1: Server Not Found
**Symptoms:** Cline doesn't show the MCP server
**Solutions:**
1. Check the file path in the configuration is absolute and correct
2. Verify the server file exists and is executable
3. Check VS Code/Cline logs for error messages

#### Issue 2: Authentication Errors
**Symptoms:** Tools fail with authentication errors
**Solutions:**
1. Verify API keys are correct in both `.env` and `cline_mcp_settings.json`
2. Check API key permissions and quotas
3. Test API key independently

#### Issue 3: Permission Errors
**Symptoms:** Cannot execute the server file
**Solutions:**
```bash
# Make the server file executable (macOS/Linux)
chmod +x /path/to/server/file.js

# Check file permissions
ls -la /path/to/server/file.js
```

#### Issue 4: Node.js/Dependency Issues
**Symptoms:** Server fails to start
**Solutions:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild the server
npm run build
```

### Step 7: Advanced Configuration

#### 7.1 Multiple MCP Servers
You can configure multiple servers in the same file:

```json
{
  "mcpServers": {
    "ratespot": {
      "command": "node",
      "args": ["/path/to/ratespot-mcp/ratespot_mcp_server.js"],
      "env": {"RATESPOT_API_KEY": "key1"}
    },
    "github": {
      "command": "node", 
      "args": ["/path/to/github-server/index.js"],
      "env": {"GITHUB_TOKEN": "key2"}
    }
  }
}
```

#### 7.2 Auto-Approval Settings
For trusted tools, you can enable auto-approval:

```json
{
  "autoApprove": ["get-mortgage-rates", "calculate-monthly-payment"]
}
```

### Step 8: Testing and Validation

#### 8.1 Basic Functionality Test
```
Test the following MCP tools:
1. List available tools from the ratespot server
2. Get current mortgage rates for a $400,000 loan
3. Calculate monthly payment for a specific rate
```

#### 8.2 Error Handling Test
```
Test error scenarios:
1. Invalid API parameters
2. Network connectivity issues
3. Rate limiting behavior
```

### Step 9: Maintenance and Updates

#### 9.1 Updating MCP Servers
```bash
# Navigate to server directory
cd /path/to/mcp-server

# Pull latest changes
git pull origin main

# Reinstall dependencies
npm install

# Rebuild
npm run build

# Restart Cline
```

#### 9.2 Monitoring and Logs
- Check Cline's output panel for MCP-related logs
- Monitor API usage and quotas
- Keep API keys secure and rotate regularly

---

## Template for Different MCP Server Types

### For Database MCP Servers (e.g., Postgres)
```json
{
  "postgres": {
    "command": "node",
    "args": ["/path/to/postgres-server/index.js"],
    "env": {
      "POSTGRES_URL": "postgresql://user:pass@host:port/db"
    }
  }
}
```

### For API Integration MCP Servers
```json
{
  "api-server": {
    "command": "node",
    "args": ["/path/to/api-server/index.js"],
    "env": {
      "API_KEY": "your_api_key",
      "API_BASE_URL": "https://api.example.com"
    }
  }
}
```

### For NPX-based MCP Servers
```json
{
  "figma": {
    "command": "npx",
    "args": [
      "-y",
      "figma-developer-mcp",
      "--figma-api-key=your_key",
      "--stdio"
    ]
  }
}
```

---

## Security Best Practices

1. **API Key Management:**
   - Store API keys in environment variables, not in code
   - Use different keys for development and production
   - Regularly rotate API keys

2. **File Permissions:**
   - Ensure MCP server files have appropriate permissions
   - Don't store sensitive data in publicly accessible locations

3. **Network Security:**
   - Use HTTPS for all API communications
   - Validate and sanitize all inputs
   - Implement proper error handling

---

## Quick Reference Commands

```bash
# Check if MCP server is running
ps aux | grep mcp

# Test MCP server directly
node /path/to/server.js

# View Cline logs
# Check VS Code Developer Tools Console

# Restart Cline
# Close and reopen VS Code
```

---

Use this comprehensive guide to help users successfully install and configure MCP servers in Cline. Adapt the specific details based on the particular MCP server being installed, but follow this general structure for consistent and successful installations.
