# Manual Setup Instructions

This directory contains detailed instructions for manually setting up the RateSpot MCP Server with different MCP clients.

## 📋 Available Setup Guides

### Claude Desktop
- **[CLAUDE_DESKTOP_INSTALLATION.md](CLAUDE_DESKTOP_INSTALLATION.md)** - Complete step-by-step guide for setting up the RateSpot MCP Server with Claude Desktop on macOS and Windows

### Cline (VS Code Extension)
- **[CLINE_MCP_INSTALLATION_PROMPT.md](CLINE_MCP_INSTALLATION_PROMPT.md)** - Instructions for configuring the RateSpot MCP Server with the Cline VS Code extension

## 🚀 Quick Setup Summary

### Prerequisites
1. **Node.js v16+** - Download from [nodejs.org](https://nodejs.org)
2. **RateSpot API Key** - Get yours at [app.ratespot.io/account-settings](https://app.ratespot.io/account-settings)

### Basic Steps
1. **Clone and build the project**
   ```bash
   git clone https://github.com/your-username/ratespot-mcp.git
   cd ratespot-mcp
   npm install
   npm run build
   ```

2. **Configure your API key**
   ```bash
   cp .env.example .env
   # Edit .env and add: RATESPOT_API_KEY=your_actual_api_key_here
   ```

3. **Configure your MCP client**
   - For Claude Desktop: Follow [CLAUDE_DESKTOP_INSTALLATION.md](CLAUDE_DESKTOP_INSTALLATION.md)
   - For Cline: Follow [CLINE_MCP_INSTALLATION_PROMPT.md](CLINE_MCP_INSTALLATION_PROMPT.md)

## 🔧 When to Use Manual Setup

Use manual setup when:
- You want to customize the installation location
- You're setting up on a system not supported by the automated installers
- You need to integrate with a custom MCP client configuration
- You're developing or debugging the MCP server

## 🆘 Need Help?

If you encounter issues during manual setup:
1. Check the detailed guides in this directory
2. Review the [troubleshooting section](../../docs/installation/) in the main documentation
3. Ensure all prerequisites are properly installed
4. Verify your API key is valid at [app.ratespot.io](https://app.ratespot.io)

## 🚀 Automated Alternative

For most users, we recommend using the automated installers:
- **macOS**: Use the installer app in [../macos/](../macos/)
- **Windows**: Use the setup script in [../windows/](../windows/)

These provide a much simpler installation experience with automatic configuration.
