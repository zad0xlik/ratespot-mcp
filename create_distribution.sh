#!/bin/bash

# Create Distribution Package for RateSpot MCP Installer
# This script packages the installer for distribution

echo "📦 Creating RateSpot MCP Installer Distribution Package"
echo "======================================================"
echo

# Check if installer exists
if [[ ! -d "RateSpot-MCP-Installer.app" ]]; then
    echo "❌ RateSpot-MCP-Installer.app not found!"
    echo "Please run the installer creation process first."
    exit 1
fi

# Create distribution directory
DIST_DIR="distribution"
echo "📁 Creating distribution directory..."
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Copy installer to distribution directory
echo "📋 Copying installer..."
cp -R "RateSpot-MCP-Installer.app" "$DIST_DIR/"

# Copy documentation
echo "📄 Copying documentation..."
cp "INSTALLER_README.md" "$DIST_DIR/README.md"

# Create a simple user guide
echo "📝 Creating user guide..."
cat > "$DIST_DIR/INSTALLATION_GUIDE.md" << 'EOF'
# RateSpot MCP Installer - Quick Start Guide

## 🚀 Installation Steps

1. **Download** the installer (you already have it!)
2. **Double-click** `RateSpot-MCP-Installer.app`
3. **Follow the prompts**:
   - Click "OK" to start
   - Install Node.js if prompted
   - Enter your RateSpot API key
   - Choose installation location (or use default)
   - Confirm installation
4. **Wait** for automatic setup
5. **Done!** Your RateSpot MCP server is ready

## 🔑 Getting Your API Key

- **Existing users**: [https://app.ratespot.io/account-settings](https://app.ratespot.io/account-settings)
- **New users**: [https://app.ratespot.io](https://app.ratespot.io) (free account)

## ❓ Need Help?

- **Installation issues**: Check the log file (path shown in error dialogs)
- **API key problems**: Verify at [app.ratespot.io/account-settings](https://app.ratespot.io/account-settings)
- **Node.js required**: Download from [nodejs.org](https://nodejs.org)

## 🗑️ Uninstalling

1. Go to your installation folder (default: `~/Applications/RateSpot-MCP`)
2. Double-click `uninstall.sh`
3. Confirm removal

That's it! Enjoy using RateSpot MCP with Claude! 🎉
EOF

# Create ZIP file for easy distribution
echo "🗜️  Creating ZIP file..."
cd "$DIST_DIR"
zip -r "../RateSpot-MCP-Installer.zip" . -x "*.DS_Store"
cd ..

# Create DMG file (macOS disk image) - optional
echo "💿 Creating DMG file..."
if command -v hdiutil &> /dev/null; then
    hdiutil create -volname "RateSpot MCP Installer" \
                   -srcfolder "$DIST_DIR" \
                   -ov \
                   -format UDZO \
                   "RateSpot-MCP-Installer.dmg"
    echo "✅ DMG created: RateSpot-MCP-Installer.dmg"
else
    echo "⚠️  hdiutil not available, skipping DMG creation"
fi

# Calculate file sizes
echo
echo "📊 Distribution Package Summary"
echo "==============================="

if [[ -f "RateSpot-MCP-Installer.zip" ]]; then
    ZIP_SIZE=$(du -h "RateSpot-MCP-Installer.zip" | cut -f1)
    echo "ZIP file: RateSpot-MCP-Installer.zip ($ZIP_SIZE)"
fi

if [[ -f "RateSpot-MCP-Installer.dmg" ]]; then
    DMG_SIZE=$(du -h "RateSpot-MCP-Installer.dmg" | cut -f1)
    echo "DMG file: RateSpot-MCP-Installer.dmg ($DMG_SIZE)"
fi

APP_SIZE=$(du -sh "$DIST_DIR/RateSpot-MCP-Installer.app" | cut -f1)
echo "App bundle: RateSpot-MCP-Installer.app ($APP_SIZE)"

echo
echo "📋 Files in distribution:"
ls -la "$DIST_DIR"

echo
echo "🎉 Distribution package created successfully!"
echo
echo "📤 Distribution Options:"
echo "1. **GitHub Releases**: Upload RateSpot-MCP-Installer.zip or .dmg"
echo "2. **Direct Sharing**: Share the ZIP file directly"
echo "3. **Website**: Host the files on your website"
echo "4. **Email**: Attach the ZIP file (if size permits)"
echo
echo "📝 Next Steps:"
echo "1. Test the installer by double-clicking it"
echo "2. Upload to your preferred distribution method"
echo "3. Share the download link with users"
echo "4. Consider code signing for better user experience"
echo
echo "🔗 Distribution files ready:"
if [[ -f "RateSpot-MCP-Installer.zip" ]]; then
    echo "   • $(pwd)/RateSpot-MCP-Installer.zip"
fi
if [[ -f "RateSpot-MCP-Installer.dmg" ]]; then
    echo "   • $(pwd)/RateSpot-MCP-Installer.dmg"
fi
echo "   • $(pwd)/$DIST_DIR/"
