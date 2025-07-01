# RateSpot MCP Desktop Extension (DXT) Installation Guide

## The Simplest Way to Install RateSpot MCP

Desktop Extensions (DXT) make installing RateSpot MCP as easy as installing a browser extension. No terminal commands, no configuration files, no dependencies to install.

## What You Need

1. **Claude Desktop** (latest version)
2. **RateSpot API Key** (free at [app.ratespot.io](https://app.ratespot.io))

## Installation Methods

### Method 1: One-Click from Extension Directory (Coming Soon)

Once RateSpot MCP is approved for the Claude Desktop Extension Directory:

1. Open Claude Desktop
2. Go to **Settings → Extensions**
3. Search for "RateSpot"
4. Click **Install**
5. Enter your RateSpot API key when prompted
6. Start using immediately!

### Method 2: Download and Install

1. **Download** the DXT file:
   - [Download ratespot-mcp-1.0.0.dxt](https://github.com/zad0xlik/ratespot-mcp/releases/latest/download/ratespot-mcp-1.0.0.dxt)

2. **Double-click** the downloaded `.dxt` file
   - Claude Desktop will open automatically
   - You'll see the RateSpot MCP installation dialog

3. **Click Install**
   - Review the extension details
   - Click the "Install" button

4. **Enter your API key**
   - Paste your RateSpot API key in the secure field
   - Click "Continue"

5. **Done!** Start asking Claude about mortgage rates immediately

## Getting Your RateSpot API Key

### New Users
1. Visit [app.ratespot.io](https://app.ratespot.io)
2. Create a free account
3. Go to **Account Settings**
4. Copy your API key

### Existing Users
1. Visit [app.ratespot.io/account-settings](https://app.ratespot.io/account-settings)
2. Copy your API key

## What Happens During Installation

The DXT installer automatically:
- ✅ Installs the RateSpot MCP server
- ✅ Configures Claude Desktop
- ✅ Securely stores your API key in the OS keychain
- ✅ Enables all RateSpot tools immediately
- ✅ Sets up automatic updates

## No More Manual Steps!

Unlike traditional MCP installation, you DON'T need to:
- ❌ Install Node.js
- ❌ Use Terminal/Command Line
- ❌ Edit configuration files
- ❌ Install dependencies
- ❌ Restart Claude Desktop
- ❌ Troubleshoot errors

## Quick Start Examples

Once installed, try these commands in Claude Desktop:

```
"What are current mortgage rates for a $400,000 loan with 20% down in California?"

"Compare 15-year vs 30-year mortgages for a $500K loan with 750 credit score"

"Calculate monthly payment for $300K loan at 6.5% interest for 30 years"

"Show me rate trends and help me understand if now is a good time to buy"
```

## Features Available

- **Real-time mortgage rates** from 100+ lenders
- **Loan product comparison** (15yr vs 30yr, conventional vs FHA, etc.)
- **Monthly payment calculator** with taxes, insurance, PMI
- **Market analysis** and rate trend insights
- **CSV export** for detailed analysis
- **Multi-location comparison** for different ZIP codes

## Troubleshooting

### "Some requirements are missing" Error
If you see this error during installation:
- **Claude Desktop Version**: Ensure you have Claude Desktop 0.7.0 or later
- **Update Claude Desktop**: Download the latest version from [claude.ai/download](https://claude.ai/download)
- **Restart after update**: Close and reopen Claude Desktop after updating

### Extension Won't Install
- Ensure you have the latest version of Claude Desktop
- Try restarting Claude Desktop and installing again
- Check that you're double-clicking the `.dxt` file (not trying to open it with another app)

### API Key Issues
- Verify your API key at [app.ratespot.io/account-settings](https://app.ratespot.io/account-settings)
- Make sure you copied the entire key without extra spaces
- The API key field is case-sensitive

### Extension Not Working
- Check that the extension shows as "Active" in Claude Desktop settings
- Try asking a simple question like "What are current mortgage rates?"
- Restart Claude Desktop if the extension appears installed but isn't responding

## Updates

Desktop Extensions update automatically! When new versions of RateSpot MCP are released, Claude Desktop will update them in the background.

## Uninstalling

To remove RateSpot MCP:
1. Open Claude Desktop
2. Go to **Settings → Extensions**
3. Find "RateSpot Mortgage Rates"
4. Click **Uninstall**

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/zad0xlik/ratespot-mcp/issues)
- **Documentation**: [Full documentation](https://github.com/zad0xlik/ratespot-mcp)
- **RateSpot Support**: [Contact RateSpot](https://ratespot.io/contact)

## Technical Details

- **Package Size**: 5.6MB (includes all dependencies)
- **Unpacked Size**: 24.6MB
- **Node.js Version**: Bundled (no external dependency)
- **Platforms**: macOS, Windows
- **Security**: API keys stored in OS keychain
