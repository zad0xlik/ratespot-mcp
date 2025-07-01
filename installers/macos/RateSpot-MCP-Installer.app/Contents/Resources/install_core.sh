#!/bin/bash

# Core Installation Functions for RateSpot MCP Installer

# Source the helper scripts
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/ui_helpers.sh"
source "$SCRIPT_DIR/validation.sh"

# Global variables
INSTALL_PATH=""
API_KEY=""
REPO_URL="https://github.com/zad0xlik/ratespot-mcp.git"
LOG_FILE="/tmp/ratespot_installer.log"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" >> "$LOG_FILE"
    echo "$1"
}

# Download and install the MCP server
install_mcp_server() {
    local install_path="$1"
    local api_key="$2"
    
    log "Starting MCP server installation to: $install_path"
    show_progress "Downloading RateSpot MCP server..."
    
    # Create installation directory
    if ! mkdir -p "$install_path"; then
        log "ERROR: Failed to create installation directory"
        return 1
    fi
    
    # Clone the repository
    log "Cloning repository from: $REPO_URL"
    if ! git clone "$REPO_URL" "$install_path" >> "$LOG_FILE" 2>&1; then
        log "ERROR: Failed to clone repository"
        return 1
    fi
    
    # Change to installation directory
    cd "$install_path" || return 1
    
    # Install dependencies
    log "Installing dependencies..."
    show_progress "Installing Node.js dependencies..."
    if ! npm install >> "$LOG_FILE" 2>&1; then
        log "ERROR: Failed to install dependencies"
        return 1
    fi
    
    # Build the server
    log "Building server..."
    show_progress "Building TypeScript server..."
    if ! npm run build >> "$LOG_FILE" 2>&1; then
        log "ERROR: Failed to build server"
        return 1
    fi
    
    # Create .env file with API key
    log "Creating .env file..."
    cat > .env << EOF
# RateSpot API Configuration
RATESPOT_API_KEY=$api_key

# Optional: Set to development for additional logging
NODE_ENV=production
EOF
    
    # Set proper permissions
    chmod 600 .env
    
    log "MCP server installation completed successfully"
    return 0
}

# Configure Claude Desktop
configure_claude_desktop() {
    local install_path="$1"
    local api_key="$2"
    
    log "Configuring Claude Desktop..."
    show_progress "Configuring Claude Desktop..."
    
    local claude_config="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
    local claude_config_dir="$(dirname "$claude_config")"
    
    # Create config directory if it doesn't exist
    if ! mkdir -p "$claude_config_dir"; then
        log "ERROR: Failed to create Claude config directory"
        return 1
    fi
    
    # Backup existing config if it exists
    if [[ -f "$claude_config" ]]; then
        log "Backing up existing Claude config..."
        cp "$claude_config" "$claude_config.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Read existing config or create new one
    local existing_config="{}"
    if [[ -f "$claude_config" ]]; then
        existing_config=$(cat "$claude_config")
    fi
    
    # Create new config with RateSpot MCP server
    local new_config
    new_config=$(echo "$existing_config" | python3 -c "
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
    'args': ['$install_path/ratespot_mcp_server.js'],
    'env': {
        'RATESPOT_API_KEY': '$api_key'
    }
}

print(json.dumps(config, indent=2))
")
    
    # Write the new config
    if echo "$new_config" > "$claude_config"; then
        log "Claude Desktop configured successfully"
        return 0
    else
        log "ERROR: Failed to write Claude config"
        return 1
    fi
}

# Configure Cline (if selected)
configure_cline() {
    local install_path="$1"
    local api_key="$2"
    
    local cline_config="$HOME/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json"
    local cline_config_dir="$(dirname "$cline_config")"
    
    log "Configuring Cline..."
    show_progress "Configuring Cline MCP settings..."
    
    # Create config directory if it doesn't exist
    if ! mkdir -p "$cline_config_dir"; then
        log "ERROR: Failed to create Cline config directory"
        return 1
    fi
    
    # Backup existing config if it exists
    if [[ -f "$cline_config" ]]; then
        log "Backing up existing Cline config..."
        cp "$cline_config" "$cline_config.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Read existing config
        local existing_config
        existing_config=$(cat "$cline_config")
    else
        log "Creating new Cline config file..."
        local existing_config="{}"
    fi
    
    # Create new config with RateSpot MCP server
    local new_config
    new_config=$(echo "$existing_config" | python3 -c "
import json
import sys

try:
    config = json.load(sys.stdin)
except:
    config = {}

if 'mcpServers' not in config:
    config['mcpServers'] = {}

config['mcpServers']['ratespot'] = {
    'autoApprove': [],
    'disabled': False,
    'timeout': 60,
    'command': 'node',
    'args': ['$install_path/ratespot_mcp_server.js'],
    'env': {
        'RATESPOT_API_KEY': '$api_key'
    },
    'transportType': 'stdio'
}

print(json.dumps(config, indent=2))
")
    
    # Write the new config
    if echo "$new_config" > "$cline_config"; then
        # Set proper permissions
        chmod 600 "$cline_config"
        log "Cline configured successfully"
        return 0
    else
        log "ERROR: Failed to write Cline config"
        return 1
    fi
}

# Run post-installation tests
run_post_install_tests() {
    local install_path="$1"
    local api_key="$2"
    
    log "Running post-installation tests..."
    show_progress "Testing installation..."
    
    # Test 1: Check if server file exists
    if [[ ! -f "$install_path/ratespot_mcp_server.js" ]]; then
        log "ERROR: Server file not found"
        return 1
    fi
    
    # Test 2: Check if .env file exists and contains API key
    if [[ ! -f "$install_path/.env" ]]; then
        log "ERROR: .env file not found"
        return 1
    fi
    
    if ! grep -q "RATESPOT_API_KEY=$api_key" "$install_path/.env"; then
        log "ERROR: API key not found in .env file"
        return 1
    fi
    
    # Test 3: Try to start the server briefly
    if ! test_mcp_server "$install_path" "$api_key"; then
        log "WARNING: Server test failed, but installation may still work"
        return 2  # Warning, not fatal error
    fi
    
    log "All post-installation tests passed"
    return 0
}

# Create welcome kit with usage examples
create_welcome_kit() {
    local install_path="$1"
    
    log "Creating welcome kit..."
    
    cat > "$install_path/welcome.html" << 'EOF'
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
            <a href="#" onclick="showInstallPath()" class="button">Show Install Location</a>
        </p>

        <script>
            function showInstallPath() {
                alert('Installation Location:\n' + window.location.pathname.replace('/welcome.html', ''));
            }
        </script>
    </div>
</body>
</html>
EOF

    log "Welcome kit created at: $install_path/welcome.html"
}

# Launch Claude Desktop if available
launch_claude_desktop() {
    log "Attempting to launch Claude Desktop..."
    
    if [[ -d "/Applications/Claude.app" ]]; then
        log "Launching Claude Desktop..."
        open -a "Claude" 2>/dev/null || log "Failed to launch Claude Desktop"
        return 0
    else
        log "Claude Desktop not found, skipping launch"
        return 1
    fi
}

# Create uninstaller script
create_uninstaller() {
    local install_path="$1"
    
    log "Creating uninstaller..."
    
    cat > "$install_path/uninstall.sh" << 'EOF'
#!/bin/bash

# RateSpot MCP Uninstaller

INSTALL_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
CLINE_CONFIG="$HOME/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json"

echo "RateSpot MCP Uninstaller"
echo "========================"
echo
echo "This will remove:"
echo "• RateSpot MCP server files from: $INSTALL_PATH"
echo "• RateSpot MCP configuration from Claude Desktop"
echo "• RateSpot MCP configuration from Cline (if present)"
echo

read -p "Are you sure you want to uninstall? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Uninstall cancelled."
    exit 0
fi

echo "Uninstalling RateSpot MCP..."

# Remove from Claude Desktop config
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

# Remove from Cline config
if [[ -f "$CLINE_CONFIG" ]]; then
    echo "Removing from Cline configuration..."
    python3 -c "
import json
try:
    with open('$CLINE_CONFIG', 'r') as f:
        config = json.load(f)
    if 'mcpServers' in config and 'ratespot' in config['mcpServers']:
        del config['mcpServers']['ratespot']
        with open('$CLINE_CONFIG', 'w') as f:
            json.dump(config, f, indent=2)
        print('Removed from Cline config')
    else:
        print('Not found in Cline config')
except Exception as e:
    print(f'Error updating Cline config: {e}')
"
fi

# Remove installation directory
echo "Removing installation files..."
cd "$HOME"
rm -rf "$INSTALL_PATH"

echo
echo "✅ RateSpot MCP has been uninstalled successfully!"
echo
echo "Note: You may need to restart Claude Desktop or VS Code"
echo "for the changes to take effect."
EOF

    chmod +x "$install_path/uninstall.sh"
    log "Uninstaller created at: $install_path/uninstall.sh"
}

# Main installation function
perform_installation() {
    local install_path="$1"
    local api_key="$2"
    local configure_claude="${CONFIGURE_CLAUDE:-true}"
    local configure_cline="${CONFIGURE_CLINE:-false}"
    
    log "=== Starting RateSpot MCP Installation ==="
    log "Install path: $install_path"
    log "API key: [REDACTED]"
    log "Configure Claude Desktop: $configure_claude"
    log "Configure Cline: $configure_cline"
    
    # Step 1: Install MCP server
    if ! install_mcp_server "$install_path" "$api_key"; then
        log "ERROR: MCP server installation failed"
        return 1
    fi
    
    # Step 2: Configure selected MCP clients
    local claude_result="skipped"
    local cline_result="skipped"
    
    # Configure Claude Desktop if selected
    if [[ "$configure_claude" == "true" ]]; then
        log "Configuring Claude Desktop (user selected)"
        if configure_claude_desktop "$install_path" "$api_key"; then
            claude_result="success"
            log "Claude Desktop configuration successful"
        else
            claude_result="failed"
            log "ERROR: Claude Desktop configuration failed"
            return 1
        fi
    else
        log "Skipping Claude Desktop configuration (not selected)"
    fi
    
    # Configure Cline if selected
    if [[ "$configure_cline" == "true" ]]; then
        log "Configuring Cline (user selected)"
        if configure_cline "$install_path" "$api_key"; then
            cline_result="success"
            log "Cline configuration successful"
        else
            cline_result="failed"
            log "WARNING: Cline configuration failed (non-fatal)"
            # Don't return error for Cline failure, just log it
        fi
    else
        log "Skipping Cline configuration (not selected)"
    fi
    
    # Step 3: Run tests
    local test_result
    run_post_install_tests "$install_path" "$api_key"
    test_result=$?
    
    # Step 4: Create welcome kit
    create_welcome_kit "$install_path"
    
    # Step 5: Create uninstaller
    create_uninstaller "$install_path"
    
    # Step 6: Launch Claude Desktop if configured successfully
    if [[ "$claude_result" == "success" ]]; then
        log "Launching Claude Desktop..."
        launch_claude_desktop
    fi
    
    # Step 7: Clean up
    cleanup_temp_files
    
    # Step 8: Store results for final summary
    export CLAUDE_CONFIG_RESULT="$claude_result"
    export CLINE_CONFIG_RESULT="$cline_result"
    
    log "=== Installation completed ==="
    log "Claude Desktop result: $claude_result"
    log "Cline result: $cline_result"
    
    if [[ $test_result -eq 0 ]]; then
        log "All tests passed - installation successful"
        return 0
    elif [[ $test_result -eq 2 ]]; then
        log "Installation completed with warnings"
        return 2
    else
        log "Installation completed but tests failed"
        return 1
    fi
}
