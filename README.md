# RateSpot MCP Server
[![smithery badge](https://smithery.ai/badge/@zad0xlik/ratespot-mcp)](https://smithery.ai/server/@zad0xlik/ratespot-mcp)

Get real-time mortgage rates directly in Claude Desktop with the RateSpot MCP Server.

## 🚀 Quick Start (Recommended)

### Step 1: Install Claude Desktop
Download Claude Desktop: **[https://claude.ai/download](https://claude.ai/download)**

### Step 2: Get Your RateSpot API Key
1. Sign up for free at **[https://app.ratespot.io](https://app.ratespot.io)**
2. Get your API key from **[Account Settings](https://app.ratespot.io/account-settings)**

### Step 3: Install RateSpot MCP Server

**For macOS Users:**
1. Download `RateSpot-MCP-Installer.app` from the [installers/macos](installers/macos/) directory
2. Double-click the installer
3. Enter your RateSpot API key when prompted
4. The installer will automatically configure Claude Desktop

**For Windows Users:**
1. Download and run `setup.bat` from the [installers/windows](installers/windows/) directory
2. Follow the prompts to enter your API key

### Installing via Smithery

To install RateSpot MCP Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@zad0xlik/ratespot-mcp):

```bash
npx -y @smithery/cli install @zad0xlik/ratespot-mcp --client claude
```

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- RateSpot API key (get yours at [https://app.ratespot.io/account-settings](https://app.ratespot.io/account-settings) or create a free account at [https://app.ratespot.io](https://app.ratespot.io))

### Step 4: Start Using
Restart Claude Desktop and ask: *"Can you get current mortgage rates for a $400,000 loan?"*

## ✨ What You Can Do

Once installed, you can ask Claude to:

- **Get Current Rates**: "What are today's mortgage rates for a $500K loan?"
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

## 🆘 Need Help?

- **Installation Issues**: Check [docs/installation/](docs/installation/) for troubleshooting guides
- **Usage Questions**: See [docs/guides/](docs/guides/) for feature documentation
- **API Problems**: Visit [RateSpot.io Support](https://app.ratespot.io/support)

## 📄 License

MIT License - see LICENSE file for details.

---

**Ready to get started?** Download the installer for your platform and you'll be getting mortgage rates in Claude within minutes! 🏠💰
