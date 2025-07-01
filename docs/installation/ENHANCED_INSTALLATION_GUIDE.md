# Enhanced RateSpot MCP Installation Guide

This guide covers the enhanced installation experience for the RateSpot MCP Server, including all the new streamlined options we've implemented.

## 🎯 Installation Options Overview

We now provide multiple installation methods to suit different user preferences and technical comfort levels:

### 1. ⚡ One-Click Terminal Installation (macOS) - **RECOMMENDED**
**Best for:** Users comfortable with Terminal who want the fastest setup

```bash
curl -fsSL https://raw.githubusercontent.com/zad0xlik/ratespot-mcp/main/installers/macos/quick-install.sh | bash
```

**What it does:**
- Automatically installs Homebrew (if needed)
- Installs Node.js via Homebrew (if needed)
- Guides you to install Claude Desktop (if needed)
- Downloads and configures the RateSpot MCP server
- Sets up your API key securely
- Launches Claude Desktop automatically
- Creates a welcome guide with examples

**Time to complete:** 2-5 minutes

### 2. 🖱️ Enhanced GUI Installer (macOS)
**Best for:** Users who prefer graphical interfaces with guided setup

**Features:**
- **Prerequisites Check**: Shows system status before installation
- **Smart Guidance**: Offers to download missing requirements
- **API Key Helper**: Direct links to RateSpot registration
- **Progress Tracking**: Clear feedback throughout installation
- **Welcome Kit**: Automatic creation of usage examples
- **Auto-Launch**: Opens Claude Desktop when complete

**How to use:**
1. Download `RateSpot-MCP-Installer.app` from [installers/macos](../../installers/macos/)
2. Double-click to run
3. Choose "Check Prerequisites" for guided setup
4. Follow the enhanced wizard

### 3. 💻 Windows Batch Script
**Best for:** Windows users

1. Download `setup.bat` from [installers/windows](../../installers/windows/)
2. Run the script
3. Follow prompts for API key setup

### 4. 📖 Manual Installation
**Best for:** Developers who want full control

See [Manual Installation Guide](../../installers/manual/setup_instructions.md)

## 🔄 What's New in the Enhanced Installation

### Enhanced User Experience
- **Prerequisites Checking**: Automatic detection of Node.js, Claude Desktop, Git, and network connectivity
- **Smart Error Handling**: Helpful error messages with specific solutions
- **Progress Notifications**: Real-time feedback during installation
- **Welcome Kit**: Beautiful HTML guide with usage examples created automatically

### Improved Automation
- **Auto-Launch**: Claude Desktop opens automatically after successful installation
- **Backup Configs**: Existing configurations are backed up before modification
- **Cleanup**: Temporary files are automatically removed
- **Uninstaller**: Easy removal script created during installation

### Better API Key Management
- **Format Validation**: Checks API key format before network validation
- **Secure Storage**: API keys stored with proper file permissions
- **Helper Links**: Direct links to RateSpot registration and settings

### Enhanced Error Recovery
- **Retry Mechanisms**: Failed operations can be retried
- **Graceful Degradation**: Installation continues even if some optional steps fail
- **Detailed Logging**: Comprehensive logs for troubleshooting

## 🛠️ Prerequisites

### Required
- **macOS 10.15+** or **Windows 10+**
- **Internet connection** for downloading components
- **RateSpot API key** (free account at [app.ratespot.io](https://app.ratespot.io))

### Automatically Installed (if missing)
- **Node.js v16+** (installed via Homebrew on macOS)
- **Git** (usually pre-installed on macOS)
- **Homebrew** (installed automatically on macOS)

### User-Installed
- **Claude Desktop** (guided download during installation)

## 🎯 Step-by-Step: One-Click Installation

### Before You Start
1. Get your RateSpot API key:
   - Visit [app.ratespot.io](https://app.ratespot.io)
   - Create a free account
   - Go to Account Settings → Copy your API key

### Installation Process
1. **Open Terminal** (Applications → Utilities → Terminal)

2. **Run the installer:**
   ```bash
   curl -fsSL https://raw.githubusercontent.com/zad0xlik/ratespot-mcp/main/installers/macos/quick-install.sh | bash
   ```

3. **Follow the prompts:**
   - Confirm installation when prompted
   - Allow Homebrew installation (if needed)
   - Install Claude Desktop when guided
   - Enter your RateSpot API key

4. **Enjoy!** Claude Desktop will launch automatically

### What Happens During Installation
```
🚀 RateSpot MCP Quick Installer
================================

✅ Checking for Homebrew...
✅ Checking for Node.js...
✅ Checking for Claude Desktop...
🔑 RateSpot API Key Setup
📥 Downloading RateSpot MCP installer...
🔨 Installing dependencies...
🔨 Building server...
⚙️  Creating configuration...
⚙️  Configuring Claude Desktop...
📖 Creating welcome guide...
🚀 Launching Claude Desktop...

🎉 RateSpot MCP installation completed successfully!
```

## 🎯 Step-by-Step: GUI Installer

### Download and Launch
1. Download `RateSpot-MCP-Installer.app` from the repository
2. Double-click to launch
3. If you see a security warning, right-click → "Open" → "Open"

### Enhanced Setup Wizard
1. **Welcome Screen**: Choose "Check Prerequisites" for guided setup
2. **Prerequisites Check**: Review system status
   - ✅ Green checkmarks = Ready
   - ❌ Red X = Needs attention
   - Use "Fix All" button for automatic resolution
3. **Installation Location**: Choose where to install (default recommended)
4. **API Key Setup**: Enter your RateSpot API key
5. **Client Selection**: Choose Claude Desktop and/or Cline
6. **Installation**: Watch progress and completion
7. **Welcome Guide**: View examples and get started

## 🔧 Post-Installation

### Verification
After installation, verify everything works:

1. **Open Claude Desktop** (should launch automatically)
2. **Test the connection** by asking:
   ```
   "What are current mortgage rates for a $400,000 loan?"
   ```
3. **Check the welcome guide** at `~/Applications/RateSpot-MCP/welcome.html`

### Troubleshooting
If something doesn't work:

1. **Restart Claude Desktop** to ensure MCP server loads
2. **Check API key** at [app.ratespot.io/account-settings](https://app.ratespot.io/account-settings)
3. **View logs** in `/tmp/ratespot_installer.log` (GUI installer)
4. **Re-run installation** if needed

## 🗑️ Uninstallation

### Automatic Uninstaller
Run the uninstaller created during installation:
```bash
~/Applications/RateSpot-MCP/uninstall.sh
```

### Manual Removal
1. Delete installation directory: `~/Applications/RateSpot-MCP/`
2. Remove from Claude config: `~/Library/Application Support/Claude/claude_desktop_config.json`
3. Remove from Cline config (if used): `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

## 🆘 Getting Help

### Common Issues
- **"Command not found"**: Restart Terminal after Node.js installation
- **"Permission denied"**: Use `chmod +x` on installer files
- **"API key invalid"**: Verify key at RateSpot account settings
- **"Claude not responding"**: Restart Claude Desktop

### Support Resources
- **Installation Issues**: [docs/installation/](../installation/)
- **Usage Questions**: [docs/guides/](../guides/)
- **API Problems**: [RateSpot Support](https://app.ratespot.io/support)

## 🎉 What's Next?

After successful installation:

1. **Explore Examples**: Check the welcome guide for sample queries
2. **Try Different Queries**: Experiment with rate comparisons and calculations
3. **Read Documentation**: Learn about advanced features in [docs/guides/](../guides/)
4. **Join Community**: Share feedback and get help from other users

---

**Happy mortgage hunting!** 🏠💰
