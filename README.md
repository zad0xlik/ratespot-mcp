# RateSpot MCP Server

Get real-time mortgage rates directly in Claude Desktop with the RateSpot MCP Server.

## 🚀 Super Simple Installation

### 🎯 Desktop Extension (DXT) - Easiest Method!
**Just like installing a browser extension - no technical knowledge required!**

1. **Download**: [ratespot-mcp-1.0.0.dxt](https://github.com/zad0xlik/ratespot-mcp/releases/latest/download/ratespot-mcp-1.0.0.dxt)
2. **Double-click** the downloaded file
3. **Click "Install"** in Claude Desktop
4. **Enter your RateSpot API key**
5. **Done!** Start asking about mortgage rates immediately

**No Node.js, no Terminal, no configuration files needed!**

📖 **[Complete DXT Installation Guide](docs/installation/DXT_INSTALLATION_GUIDE.md)**

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

### 🎯 Start Using
After installation, try asking Claude: *"What are current mortgage rates for a $400,000 loan?"*

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
