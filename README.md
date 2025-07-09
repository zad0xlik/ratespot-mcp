# RateSpot MCP Server
[![smithery badge](https://smithery.ai/badge/@zad0xlik/ratespot-mcp)](https://smithery.ai/server/@zad0xlik/ratespot-mcp)

Get real-time mortgage rates directly in Claude Desktop with the RateSpot MCP Server.

## 🚀 Super Simple Installation

### Prerequisites
1. **Claude Desktop**: Download and install from [claude.ai/download](https://claude.ai/download)
2. **RateSpot API Key**: Get yours at [app.ratespot.io](https://app.ratespot.io)

### 🎯 Desktop Extension (DXT) - Easiest Method!
**Just like installing a browser extension - no technical knowledge required!**

1. **Download**: [ratespot-mcp-2.1.0.dxt](https://github.com/zad0xlik/ratespot-mcp/releases/latest/download/ratespot-mcp-2.1.0.dxt)
2. **Double Click** the downloaded file into Claude Desktop
3. **Enter your RateSpot API key** when prompted
4. **Done!** Start asking about mortgage rates immediately

**No Node.js, no Terminal, no configuration files needed!**

📖 **[Complete DXT Installation Guide](docs/installation/DXT_INSTALLATION_GUIDE.md)**

> **Note**: Version 2.1.0 adds foreclosure listings search with interactive map visualization, plus streaming support for handling long-running requests.

---

### Alternative Installation Methods

#### ⚡ One-Click Terminal Installation (macOS)
```bash
curl -fsSL https://raw.githubusercontent.com/zad0xlik/ratespot-mcp/main/installers/macos/quick-install.sh | bash
```

#### 🖱️ GUI Installation (macOS)
1. Download `RateSpot-MCP-Installer.app` from [installers/macos](installers/macos/)
2. Double-click and follow the setup wizard

#### 💻 Windows Installation
1. Download and run `setup.bat` from [installers/windows](installers/windows/)

### 🔑 Get Your RateSpot API Key
1. Sign up for free at **[https://app.ratespot.io](https://app.ratespot.io)**
2. Get your API key from **[Account Settings](https://app.ratespot.io/account-settings)**

### Installing via Smithery

To install RateSpot MCP Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@zad0xlik/ratespot-mcp):

```bash
npx -y @smithery/cli install @zad0xlik/ratespot-mcp --client claude
```

### Start Using
Ask Claude about mortgage rates! Try questions like:
*"Can you get current mortgage rates for a $400,000 loan?"*


## ✨ What You Can Do

Once installed, you can ask Claude to:

- **Get Current Rates**: "What are today's mortgage rates for a $500K loan?"
- **Search Foreclosures**: "Show me foreclosure listings within 10 miles of 94949"
- **View Property Maps**: "Display foreclosures on an interactive map"
- **Compare Loan Products**: "Compare 15-year vs 30-year mortgages for my situation"
- **Calculate Payments**: "Calculate monthly payment for $400K at 6.5% interest"
- **Analyze Market Trends**: "Show me rate trends for the past 30 days"
- **Pre-qualify**: "Can I qualify for a loan with 750 credit score and $80K income?"

## 📚 Additional Documentation

- **[Installation Guides](docs/installation/)** - Detailed installation instructions and troubleshooting
- **[User Guides & Features](docs/guides/)** - Complete feature documentation and usage examples
- **[Manual Setup Instructions](installers/manual/)** - Step-by-step manual configuration for Claude Desktop and Cline

## 🛠️ For Developers

- **[API Documentation](docs/api/)** - Technical API reference
- **[Testing Guide](test/)** - Test files and validation scripts
- **[Examples](examples/)** - Usage examples and sample code
- **[Sample Data](data/examples/)** - Example CSV and JSON data files

## 🔧 Manual Installation

If you prefer to install manually or need to customize the setup:

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ratespot-mcp.git
   cd ratespot-mcp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the server**
   ```bash
   npm run build
   ```

4. **Configure your API key**
   ```bash
   cp .env.example .env
   # Edit .env and add your RateSpot API key
   ```

5. **Configure Claude Desktop**
   - See [installers/manual/CLAUDE_DESKTOP_INSTALLATION.md](installers/manual/CLAUDE_DESKTOP_INSTALLATION.md) for detailed instructions

## 🗑️ Uninstallation

### Uninstall from Claude Desktop
1. Open Claude Desktop
2. Click on the settings icon (⚙️)
3. Go to "Extensions"
4. Find "RateSpot MCP" in the list
5. Click "Remove" or the trash icon
6. Restart Claude Desktop

### Manual Uninstallation
If you installed manually or need to clean up files:

1. **Remove MCP configuration**
   ```bash
   rm -rf ~/.config/claude/mcp/ratespot-mcp
   ```

2. **Remove from Claude Desktop settings**
   ```bash
   rm -rf "~/Library/Application Support/Claude/mcp/ratespot-mcp"
   ```

3. **Remove DXT file (if installed via DXT)**
   ```bash
   rm -f ~/Downloads/ratespot-mcp-2.1.0.dxt
   ```

4. **Remove DXT streaming server file**
   ```bash
   rm -f "/Users/[username]/Library/Application Support/Claude/Claude Extensions/local.dxt.ratespot.ratespot-mcp/server/ratespot_mcp_server_streaming.js"
   ```

5. **Clean up data directory**
   ```bash
   rm -rf ~/.local/share/claude/mcp/ratespot-mcp
   ```

6. **Update Claude Desktop config file**
   ```bash
   # Config file location: ${HOME}/Library/Application Support/Claude/claude_desktop_config.json
   # Open the file in your preferred editor and remove the ratespot-mcp entry from the extensions section
   ```

7. **Check and kill any running server processes**
   ```bash
   # Check if anything is running on port 3001
   lsof -i :3001
   # If a process is found, kill it using its PID
   kill $(lsof -t -i:3001)
   ```

After uninstallation, restart Claude Desktop to ensure all changes take effect.

## 🆘 Need Help?

- **Installation Issues**: Check [docs/installation/](docs/installation/) for troubleshooting guides
- **Usage Questions**: See [docs/guides/](docs/guides/) for feature documentation
- **API Problems**: Visit [RateSpot.io Support](https://app.ratespot.io/support)

## 📄 License

MIT License - see LICENSE file for details.

---

**Ready to get started?** Download the installer for your platform and you'll be getting mortgage rates in Claude within minutes! 🏠💰
