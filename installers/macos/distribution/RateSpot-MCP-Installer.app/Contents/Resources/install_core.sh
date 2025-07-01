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
    
    # Step 4: Create uninstaller
    create_uninstaller "$install_path"
    
    # Step 5: Clean up
    cleanup_temp_files
    
    # Step 6: Store results for final summary
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
