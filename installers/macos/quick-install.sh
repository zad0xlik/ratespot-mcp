#!/bin/bash

# RateSpot MCP Quick Installer
# One-click installation script for macOS

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running on macOS
if [[ "$(uname)" != "Darwin" ]]; then
    error "This installer is for macOS only."
    exit 1
fi

echo "🚀 RateSpot MCP Quick Installer"
echo "================================"
echo
echo "This script will automatically:"
echo "• Install Homebrew (if needed)"
echo "• Install Node.js (if needed)"
echo "• Download Claude Desktop (if needed)"
echo "• Install and configure RateSpot MCP server"
echo

read -p "Continue with installation? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 0
fi

echo

# Step 1: Check and install Homebrew
log "Checking for Homebrew..."
if ! command -v brew &> /dev/null; then
    warning "Homebrew not found. Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH for Apple Silicon Macs
    if [[ -f "/opt/homebrew/bin/brew" ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
    
    success "Homebrew installed successfully"
else
    success "Homebrew already installed"
fi

# Step 2: Check and install Node.js
log "Checking for Node.js..."
if ! command -v node &> /dev/null; then
    warning "Node.js not found. Installing Node.js via Homebrew..."
    brew install node
    success "Node.js installed successfully"
else
    node_version=$(node -v | cut -d'v' -f2)
    major_version=$(echo "$node_version" | cut -d'.' -f1)
    
    if [[ "$major_version" -ge 16 ]]; then
        success "Node.js $node_version already installed"
    else
        warning "Node.js $node_version is too old. Updating to latest version..."
        brew upgrade node
        success "Node.js updated successfully"
    fi
fi

# Step 3: Check for Claude Desktop
log "Checking for Claude Desktop..."
if [[ ! -d "/Applications/Claude.app" ]]; then
    warning "Claude Desktop not found."
    echo
    echo "Please download and install Claude Desktop:"
    echo "https://claude.ai/download"
    echo
    read -p "Press Enter after installing Claude Desktop to continue..."
    
    # Check again
    if [[ ! -d "/Applications/Claude.app" ]]; then
        error "Claude Desktop still not found. Please install it and run this script again."
        exit 1
    fi
    success "Claude Desktop detected"
else
    success "Claude Desktop already installed"
fi

# Step 4: Get RateSpot API key
echo
log "RateSpot API Key Setup"
echo "You need a RateSpot API key to use this MCP server."
echo
echo "If you don't have an account:"
echo "1. Visit: https://app.ratespot.io"
echo "2. Create a free account"
echo "3. Go to Account Settings to get your API key"
echo
echo "If you already have an account:"
echo "1. Visit: https://app.ratespot.io/account-settings"
echo "2. Copy your API key"
echo

read -p "Do you have your RateSpot API key ready? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Opening RateSpot registration page..."
    open "https://app.ratespot.io"
    echo
    read -p "Press Enter after getting your API key to continue..."
fi

echo
read -p "Enter your RateSpot API key: " -s API_KEY
echo

if [[ -z "$API_KEY" ]]; then
    error "API key cannot be empty."
    exit 1
fi

# Step 5: Download and run the main installer
log "Downloading RateSpot MCP installer..."

# Create temporary directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Download the installer
if ! curl -fsSL -o installer.zip "https://github.com/zad0xlik/ratespot-mcp/archive/main.zip"; then
    error "Failed to download installer. Please check your internet connection."
    exit 1
fi

# Extract the installer
unzip -q installer.zip
cd ratespot-mcp-main

# Set installation path
INSTALL_PATH="$HOME/Applications/RateSpot-MCP"

log "Installing RateSpot MCP server to: $INSTALL_PATH"

# Create installation directory
mkdir -p "$INSTALL_PATH"

# Copy files
cp -r . "$INSTALL_PATH/"
cd "$INSTALL_PATH"

# Install dependencies
log "Installing dependencies..."
npm install

# Build the server
log "Building server..."
npm run build

# Create .env file
log "Creating configuration..."
cat > .env << EOF
# RateSpot API Configuration
RATESPOT_API_KEY=$API_KEY

# Optional: Set to development for additional logging
NODE_ENV=production
EOF

chmod 600 .env

# Configure Claude Desktop
log "Configuring Claude Desktop..."
CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
CLAUDE_CONFIG_DIR="$(dirname "$CLAUDE_CONFIG")"

# Create config directory if it doesn't exist
mkdir -p "$CLAUDE_CONFIG_DIR"

# Backup existing config if it exists
if [[ -f "$CLAUDE_CONFIG" ]]; then
    cp "$CLAUDE_CONFIG" "$CLAUDE_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Read existing config or create new one
EXISTING_CONFIG="{}"
if [[ -f "$CLAUDE_CONFIG" ]]; then
    EXISTING_CONFIG=$(cat "$CLAUDE_CONFIG")
fi

# Create new config with RateSpot MCP server
NEW_CONFIG=$(echo "$EXISTING_CONFIG" | python3 -c "
import json
import sys

try:
    config = json.load(sys.stdin)
except:
    config = {}

if 'mcpServers' not in config:
    config['mcpServers'] = {}

config['mcpServers']['ratespot'] = {
    'command': 'node',
    'args': ['$INSTALL_PATH/ratespot_mcp_server.js'],
    'env': {
        'RATESPOT_API_KEY': '$API_KEY'
    }
}

print(json.dumps(config, indent=2))
")

# Write the new config
echo "$NEW_CONFIG" > "$CLAUDE_CONFIG"

# Create welcome guide
log "Creating welcome guide..."
cat > "$INSTALL_PATH/welcome.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RateSpot MCP - Welcome</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        h1 { color: #fff; text-align: center; margin-bottom: 30px; }
        h2 { color: #f0f0f0; border-bottom: 2px solid rgba(255,255,255,0.3); padding-bottom: 10px; }
        .example {
            background: rgba(0, 0, 0, 0.2);
            padding: 15px;
            border-radius: 10px;
            margin: 15px 0;
            border-left: 4px solid #4CAF50;
        }
        .example code {
            background: rgba(255, 255, 255, 0.1);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', monospace;
        }
        .status {
            background: rgba(76, 175, 80, 0.2);
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            margin: 20px 0;
        }
        .button {
            display: inline-block;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 8px;
            margin: 5px;
            transition: background 0.3s;
        }
        .button:hover {
            background: rgba(255, 255, 255, 0.3);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎉 Welcome to RateSpot MCP!</h1>
        
        <div class="status">
            <strong>✅ Installation Complete!</strong><br>
            Your RateSpot MCP server is now ready to use with Claude Desktop.
        </div>

        <h2>🚀 Quick Start Examples</h2>
        
        <div class="example">
            <strong>Get Current Mortgage Rates:</strong><br>
            <code>"What are today's mortgage rates for a $400,000 loan with 20% down in California?"</code>
        </div>

        <div class="example">
            <strong>Compare Loan Products:</strong><br>
            <code>"Compare 15-year vs 30-year mortgages for a $500K loan with 750 credit score"</code>
        </div>

        <div class="example">
            <strong>Calculate Monthly Payment:</strong><br>
            <code>"Calculate monthly payment for $300K loan at 6.5% interest for 30 years"</code>
        </div>

        <div class="example">
            <strong>Market Analysis:</strong><br>
            <code>"Show me rate trends and help me understand if now is a good time to buy"</code>
        </div>

        <h2>🔧 Troubleshooting</h2>
        <p>If you encounter any issues:</p>
        <ul>
            <li>Restart Claude Desktop to ensure the MCP server loads</li>
            <li>Check that your RateSpot API key is valid at <a href="https://app.ratespot.io/account-settings" class="button">RateSpot Settings</a></li>
            <li>View the installation log for detailed error messages</li>
        </ul>

        <h2>📚 Resources</h2>
        <p>
            <a href="https://app.ratespot.io" class="button">RateSpot Dashboard</a>
            <a href="https://claude.ai" class="button">Claude Desktop</a>
        </p>
    </div>
</body>
</html>
EOF

# Create uninstaller
log "Creating uninstaller..."
cat > "$INSTALL_PATH/uninstall.sh" << 'EOF'
#!/bin/bash

echo "RateSpot MCP Uninstaller"
echo "========================"
echo
echo "This will remove:"
echo "• RateSpot MCP server files"
echo "• RateSpot MCP configuration from Claude Desktop"
echo

read -p "Are you sure you want to uninstall? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Uninstall cancelled."
    exit 0
fi

echo "Uninstalling RateSpot MCP..."

# Remove from Claude Desktop config
CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
if [[ -f "$CLAUDE_CONFIG" ]]; then
    echo "Removing from Claude Desktop configuration..."
    python3 -c "
import json
try:
    with open('$CLAUDE_CONFIG', 'r') as f:
        config = json.load(f)
    if 'mcpServers' in config and 'ratespot' in config['mcpServers']:
        del config['mcpServers']['ratespot']
        with open('$CLAUDE_CONFIG', 'w') as f:
            json.dump(config, f, indent=2)
        print('Removed from Claude Desktop config')
    else:
        print('Not found in Claude Desktop config')
except Exception as e:
    print(f'Error updating Claude config: {e}')
"
fi

# Remove installation directory
INSTALL_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Removing installation files..."
cd "$HOME"
rm -rf "$INSTALL_PATH"

echo
echo "✅ RateSpot MCP has been uninstalled successfully!"
echo
echo "Note: You may need to restart Claude Desktop for the changes to take effect."
EOF

chmod +x "$INSTALL_PATH/uninstall.sh"

# Clean up temporary files
cd "$HOME"
rm -rf "$TEMP_DIR"

# Launch Claude Desktop
log "Launching Claude Desktop..."
open -a "Claude" 2>/dev/null || warning "Failed to launch Claude Desktop automatically"

# Show completion message
echo
success "🎉 RateSpot MCP installation completed successfully!"
echo
echo "Installation location: $INSTALL_PATH"
echo
echo "Next steps:"
echo "1. Claude Desktop should be launching now"
echo "2. Try asking: 'What are current mortgage rates for a $400K loan?'"
echo "3. View the welcome guide: open $INSTALL_PATH/welcome.html"
echo
echo "If you need to uninstall later, run: $INSTALL_PATH/uninstall.sh"
echo

# Open welcome guide
read -p "Would you like to view the welcome guide now? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    open "$INSTALL_PATH/welcome.html"
fi

echo "Happy mortgage hunting! 🏠💰"
