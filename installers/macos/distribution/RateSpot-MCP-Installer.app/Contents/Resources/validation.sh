#!/bin/bash

# Validation Functions for RateSpot MCP Installer

# Check if Node.js is installed and get version
check_nodejs() {
    if command -v node &> /dev/null; then
        local version=$(node -v | cut -d'v' -f2)
        local major_version=$(echo "$version" | cut -d'.' -f1)
        
        if [[ "$major_version" -ge 16 ]]; then
            echo "Node.js $version (compatible)"
            return 0
        else
            echo "Node.js $version (incompatible - need v16+)"
            return 1
        fi
    else
        echo "Node.js not installed"
        return 2
    fi
}

# Validate API key by testing it against RateSpot API
validate_api_key() {
    local api_key="$1"
    
    # Check if API key is empty
    if [[ -z "$api_key" ]]; then
        echo "API key is empty"
        return 1
    fi
    
    # Check API key format (basic validation)
    if [[ ${#api_key} -lt 10 ]]; then
        echo "API key appears too short"
        return 1
    fi
    
    # Basic format validation - RateSpot API keys are typically long alphanumeric strings
    if [[ ! "$api_key" =~ ^[A-Za-z0-9_-]+$ ]]; then
        echo "API key contains invalid characters"
        return 1
    fi
    
    # For now, skip network validation since API endpoints are not available
    # This allows installation to proceed with user-provided API key
    echo "API key format appears valid (network validation skipped)"
    return 0
    
    # Note: The actual API validation will happen when the MCP server starts
    # If the API key is invalid, the tools will show appropriate error messages
}

# Check if Claude Desktop is installed
check_claude_desktop() {
    local claude_app="/Applications/Claude.app"
    local claude_config="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
    
    if [[ -d "$claude_app" ]]; then
        echo "Claude Desktop found at $claude_app"
        if [[ -f "$claude_config" ]]; then
            echo "Claude config file exists"
            return 0
        else
            echo "Claude config file missing (will be created)"
            return 1
        fi
    else
        echo "Claude Desktop not found"
        return 2
    fi
}

# Check if VS Code is installed
check_vscode() {
    local vscode_app="/Applications/Visual Studio Code.app"
    local vscode_extensions="$HOME/.vscode/extensions"
    
    if [[ -d "$vscode_app" ]]; then
        echo "VS Code found at $vscode_app"
        if [[ -d "$vscode_extensions" ]]; then
            echo "VS Code extensions directory exists"
            return 0
        else
            echo "VS Code extensions directory missing"
            return 1
        fi
    else
        echo "VS Code not found"
        return 2
    fi
}

# Check if Cline is installed (VS Code extension)
check_cline() {
    local cline_config="$HOME/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json"
    local cline_extension_dir="$HOME/.vscode/extensions"
    
    # First check if VS Code is installed
    local vscode_status
    vscode_status=$(check_vscode)
    local vscode_code=$?
    
    if [[ $vscode_code -eq 2 ]]; then
        echo "VS Code not installed"
        return 2
    fi
    
    # Check for Cline extension
    if [[ -d "$cline_extension_dir" ]]; then
        local cline_found=false
        for ext_dir in "$cline_extension_dir"/saoudrizwan.claude-dev-*; do
            if [[ -d "$ext_dir" ]]; then
                cline_found=true
                break
            fi
        done
        
        if [[ "$cline_found" == "true" ]]; then
            if [[ -f "$cline_config" ]]; then
                echo "Cline extension and config found"
                return 0
            else
                echo "Cline extension found, config missing (will be created)"
                return 1
            fi
        else
            echo "Cline extension not found"
            return 2
        fi
    else
        echo "VS Code extensions directory not found"
        return 2
    fi
}

# Get MCP client detection status
get_mcp_client_status() {
    local claude_status="missing"
    local cline_status="missing"
    
    # Check Claude Desktop
    local claude_result
    claude_result=$(check_claude_desktop)
    local claude_code=$?
    
    if [[ $claude_code -eq 0 || $claude_code -eq 1 ]]; then
        claude_status="detected"
    fi
    
    # Check Cline
    local cline_result
    cline_result=$(check_cline)
    local cline_code=$?
    
    if [[ $cline_code -eq 0 || $cline_code -eq 1 ]]; then
        cline_status="detected"
    fi
    
    echo "CLAUDE_STATUS=$claude_status"
    echo "CLINE_STATUS=$cline_status"
}

# Validate installation directory
validate_install_path() {
    local install_path="$1"
    
    # Check if path is empty
    if [[ -z "$install_path" ]]; then
        echo "Installation path is empty"
        return 1
    fi
    
    # Check if parent directory exists or can be created
    local parent_dir=$(dirname "$install_path")
    if [[ ! -d "$parent_dir" ]]; then
        if mkdir -p "$parent_dir" 2>/dev/null; then
            echo "Created parent directory: $parent_dir"
        else
            echo "Cannot create parent directory: $parent_dir"
            return 1
        fi
    fi
    
    # Check if target directory already exists
    if [[ -d "$install_path" ]]; then
        echo "Directory already exists: $install_path"
        return 2  # Special code for existing directory
    fi
    
    # Check write permissions
    if [[ -w "$parent_dir" ]]; then
        echo "Installation path is valid: $install_path"
        return 0
    else
        echo "No write permission for: $parent_dir"
        return 1
    fi
}

# Test git availability
check_git() {
    if command -v git &> /dev/null; then
        local version=$(git --version)
        echo "Git available: $version"
        return 0
    else
        echo "Git not available"
        return 1
    fi
}

# Test network connectivity
check_network() {
    if curl -s --connect-timeout 5 "https://github.com" > /dev/null; then
        echo "Network connectivity OK"
        return 0
    else
        echo "Network connectivity failed"
        return 1
    fi
}

# Comprehensive pre-installation check
run_preinstall_checks() {
    local checks_passed=0
    local checks_total=0
    local issues=()
    
    echo "Running pre-installation checks..."
    echo
    
    # Check Node.js
    ((checks_total++))
    local nodejs_result
    nodejs_result=$(check_nodejs)
    local nodejs_status=$?
    echo "Node.js: $nodejs_result"
    if [[ $nodejs_status -eq 0 ]]; then
        ((checks_passed++))
    else
        issues+=("Node.js: $nodejs_result")
    fi
    
    # Check Git
    ((checks_total++))
    local git_result
    git_result=$(check_git)
    local git_status=$?
    echo "Git: $git_result"
    if [[ $git_status -eq 0 ]]; then
        ((checks_passed++))
    else
        issues+=("Git: $git_result")
    fi
    
    # Check Network
    ((checks_total++))
    local network_result
    network_result=$(check_network)
    local network_status=$?
    echo "Network: $network_result"
    if [[ $network_status -eq 0 ]]; then
        ((checks_passed++))
    else
        issues+=("Network: $network_result")
    fi
    
    # Check Claude Desktop
    ((checks_total++))
    local claude_result
    claude_result=$(check_claude_desktop)
    local claude_status=$?
    echo "Claude Desktop: $claude_result"
    if [[ $claude_status -eq 0 || $claude_status -eq 1 ]]; then
        ((checks_passed++))
    else
        issues+=("Claude Desktop: $claude_result")
    fi
    
    echo
    echo "Checks passed: $checks_passed/$checks_total"
    
    if [[ ${#issues[@]} -gt 0 ]]; then
        echo "Issues found:"
        for issue in "${issues[@]}"; do
            echo "  • $issue"
        done
        return 1
    else
        echo "All checks passed!"
        return 0
    fi
}

# Test the installed MCP server
test_mcp_server() {
    local install_path="$1"
    local api_key="$2"
    
    if [[ ! -f "$install_path/ratespot_mcp_server.js" ]]; then
        echo "MCP server file not found"
        return 1
    fi
    
    # Test by running the server briefly
    cd "$install_path" || return 1
    
    # Set environment variable
    export RATESPOT_API_KEY="$api_key"
    
    # Try to start the server and test it
    timeout 10s node ratespot_mcp_server.js &
    local server_pid=$!
    
    sleep 2
    
    # Check if process is still running
    if kill -0 $server_pid 2>/dev/null; then
        kill $server_pid 2>/dev/null
        echo "MCP server started successfully"
        return 0
    else
        echo "MCP server failed to start"
        return 1
    fi
}

# Clean up temporary files
cleanup_temp_files() {
    rm -f /tmp/ratespot_test_response.json
    rm -f /tmp/ratespot_test_response2.json
}
