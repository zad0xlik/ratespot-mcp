# RateSpot MCP Auto-Installer

A complete automated installer for the RateSpot MCP (Model Context Protocol) server that provides one-click installation for macOS users.

## 🎯 What This Installer Does

The **RateSpot MCP Auto-Installer** is a native macOS application that completely automates the installation of your RateSpot MCP server. Users simply double-click the app and enter their API key - everything else is handled automatically.

### ✨ Features

- **🚀 One-Click Installation**: Double-click to start, enter API key, done!
- **🔍 Smart Prerequisites**: Automatically checks for Node.js and guides installation if needed
- **🔑 API Key Validation**: Tests API keys in real-time to ensure they work
- **⚙️ Auto-Configuration**: Automatically configures Claude Desktop and Cline
- **📍 Flexible Installation**: Choose installation location or use smart defaults
- **🧪 Built-in Testing**: Verifies installation works correctly
- **🗑️ Easy Uninstall**: Creates uninstaller script automatically
- **📋 Comprehensive Logging**: Detailed logs for troubleshooting

## 📦 What's Included

```
RateSpot-MCP-Installer.app/
├── Contents/
│   ├── Info.plist                    # App metadata
│   ├── PkgInfo                       # Package info
│   ├── MacOS/
│   │   └── installer                 # Main executable
│   └── Resources/
│       ├── icon.icns                 # App icon
│       ├── ui_helpers.sh             # Native macOS UI dialogs
│       ├── validation.sh             # API key & system validation
│       └── install_core.sh           # Core installation logic
```

## 🎬 Installation Flow

1. **Welcome Screen**: Introduction and overview
2. **System Check**: Validates Node.js, Git, network connectivity
3. **Node.js Handling**: Guides installation if missing
4. **Location Selection**: Choose where to install (default: `~/Applications/RateSpot-MCP`)
5. **API Key Input**: Secure input with validation and helpful links
6. **Confirmation**: Final review before installation
7. **Installation**: Downloads, builds, and configures everything
8. **Testing**: Verifies the installation works
9. **Success**: Options to test, open folder, or finish

## 🔧 Technical Details

### Prerequisites Handled
- **Node.js v16+**: Required for running the MCP server
- **Git**: For cloning the repository
- **Network**: For downloading and API validation
- **Claude Desktop**: Automatically configured if present
- **Cline**: Automatically configured if present

### Installation Process
1. **Download**: Clones your GitHub repository
2. **Dependencies**: Runs `npm install`
3. **Build**: Compiles TypeScript with `npm run build`
4. **Configuration**: Creates `.env` file with API key
5. **Claude Setup**: Updates `claude_desktop_config.json`
6. **Cline Setup**: Updates `cline_mcp_settings.json` (if present)
7. **Testing**: Validates the server starts correctly
8. **Uninstaller**: Creates removal script

### Security Features
- **API Key Protection**: Never logged or exposed
- **Secure Storage**: API keys stored in `.env` with restricted permissions
- **Validation**: Real-time API key testing
- **Backup**: Existing configurations backed up before changes

## 📋 Distribution Options

### 1. GitHub Releases (Recommended)
```bash
# Create a release with the installer
git tag v1.0.0
git push origin v1.0.0

# Upload RateSpot-MCP-Installer.app as a release asset
# Users download and double-click to install
```

### 2. Direct File Sharing
- Compress the `.app` bundle: `zip -r RateSpot-MCP-Installer.zip RateSpot-MCP-Installer.app`
- Share the ZIP file directly
- Users unzip and double-click to install

### 3. Website Download
- Host the `.app` bundle on your website
- Provide download link with instructions
- Consider code signing for better user experience

### 4. Code Signing (Optional but Recommended)
```bash
# Sign the app bundle (requires Apple Developer account)
codesign --deep --force --verify --verbose --sign "Developer ID Application: Your Name" RateSpot-MCP-Installer.app

# Create a disk image for distribution
hdiutil create -volname "RateSpot MCP Installer" -srcfolder RateSpot-MCP-Installer.app -ov -format UDZO RateSpot-MCP-Installer.dmg
```

## 🚀 Usage Instructions for End Users

### For Users Receiving the Installer

1. **Download** the `RateSpot-MCP-Installer.app` 
2. **Double-click** the installer app
3. **Follow the prompts**:
   - Click "OK" on the welcome screen
   - Install Node.js if prompted
   - Choose installation location (or use default)
   - Enter your RateSpot API key
   - Confirm installation
4. **Wait** for automatic installation and configuration
5. **Test** the installation if desired
6. **Done!** Your RateSpot MCP server is ready to use

### Getting Your API Key
- **Existing users**: Visit [https://app.ratespot.io/account-settings](https://app.ratespot.io/account-settings)
- **New users**: Sign up at [https://app.ratespot.io](https://app.ratespot.io)

## 🔍 Troubleshooting

### Common Issues

**"Cannot be opened because it is from an unidentified developer"**
- Right-click the app → "Open" → "Open" (bypass Gatekeeper)
- Or: System Preferences → Security & Privacy → "Open Anyway"

**Node.js Installation Required**
- The installer will guide you to download Node.js
- Install Node.js from [nodejs.org](https://nodejs.org)
- Re-run the installer

**API Key Validation Failed**
- Verify your API key at [app.ratespot.io/account-settings](https://app.ratespot.io/account-settings)
- Check your internet connection
- Try again or continue anyway if validation is inconclusive

**Installation Failed**
- Check the log file (path shown in error dialog)
- Ensure you have write permissions to the installation directory
- Try a different installation location
- Verify internet connectivity

### Log Files
- **Installation Log**: `/tmp/ratespot_installer.log`
- **View in Console**: The installer can open logs automatically
- **Manual Access**: Open Terminal and run `cat /tmp/ratespot_installer.log`

## 🗑️ Uninstallation

The installer automatically creates an uninstaller script:

1. **Navigate** to your installation directory (default: `~/Applications/RateSpot-MCP`)
2. **Double-click** `uninstall.sh`
3. **Confirm** removal when prompted
4. **Done!** All files and configurations are removed

## 🔄 Updates

To update the RateSpot MCP server:
1. **Run the uninstaller** to remove the old version
2. **Download** the latest installer
3. **Run the new installer** to install the updated version

## 🛠️ Customization

### Modifying the Installer

The installer is built with modular shell scripts:

- **`installer`**: Main executable and workflow orchestration
- **`ui_helpers.sh`**: All user interface dialogs and interactions
- **`validation.sh`**: System checks and API key validation
- **`install_core.sh`**: Core installation logic and configuration

### Configuration Options

You can modify these variables in the scripts:

```bash
# Default installation location
DEFAULT_INSTALL_PATH="$HOME/Applications/RateSpot-MCP"

# Repository URL
REPO_URL="https://github.com/zad0xlik/ratespot-mcp.git"

# API validation endpoints
API_TEST_URL="https://api.ratespot.io/v1/rates/test"
```

## 📊 Analytics & Feedback

The installer logs key events for troubleshooting:
- Installation attempts and outcomes
- System configuration details
- Error conditions and resolutions
- User choices and workflow paths

Logs are stored locally and never transmitted.

## 🔒 Privacy & Security

- **No Data Collection**: The installer doesn't collect or transmit user data
- **Local Processing**: All operations performed locally on user's machine
- **Secure API Keys**: API keys never logged or exposed in plain text
- **Permission Requests**: Only requests necessary file system permissions
- **Open Source**: All code is visible and auditable

## 📞 Support

For issues with the installer:
1. **Check the log file** for detailed error information
2. **Verify system requirements** (Node.js, internet connection)
3. **Try different installation location** if permissions are an issue
4. **Contact support** with log file contents if problems persist

For RateSpot API issues:
- Visit [RateSpot.io Support](https://app.ratespot.io/support)
- Check [API Documentation](https://docs.ratespot.io)

## 📄 License

This installer is provided under the same license as the RateSpot MCP server (MIT License).

---

**Ready to distribute your RateSpot MCP server with zero friction!** 🚀

Users get a professional, automated installation experience while you get hassle-free distribution and support.
