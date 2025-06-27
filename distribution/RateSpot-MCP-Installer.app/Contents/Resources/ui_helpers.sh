#!/bin/bash

# UI Helper Functions for RateSpot MCP Installer
# Uses native macOS dialogs via osascript

# Show welcome dialog
show_welcome() {
    osascript -e 'display dialog "Welcome to RateSpot MCP Installer!

This installer will:
• Check for Node.js (install if needed)
• Download the RateSpot MCP server
• Configure Claude Desktop automatically
• Set up your API key securely

Click OK to continue." buttons {"Cancel", "OK"} default button "OK" with title "RateSpot MCP Installer" with icon note'
    return $?
}

# Show progress dialog (non-blocking)
show_progress() {
    local message="$1"
    local title="${2:-Installing RateSpot MCP}"
    
    osascript -e "display notification \"$message\" with title \"$title\"" &
}

# Show API key input dialog
get_api_key() {
    local result
    result=$(osascript -e 'display dialog "Enter your RateSpot API key:

Get your API key from:
https://app.ratespot.io/account-settings

Or create a free account at:
https://app.ratespot.io" default answer "" with hidden answer buttons {"Cancel", "Get API Key", "Continue"} default button "Continue" with title "RateSpot API Key" with icon note')
    
    local button_pressed=$(echo "$result" | sed 's/.*button returned:\([^,]*\).*/\1/')
    local api_key=$(echo "$result" | sed 's/.*text returned:\(.*\)/\1/')
    
    if [[ "$button_pressed" == "Get API Key" ]]; then
        open "https://app.ratespot.io/account-settings"
        get_api_key  # Recursive call to show dialog again
        return $?
    elif [[ "$button_pressed" == "Continue" ]]; then
        echo "$api_key"
        return 0
    else
        return 1  # Cancel pressed
    fi
}

# Show error dialog
show_error() {
    local message="$1"
    local title="${2:-Installation Error}"
    
    osascript -e "display dialog \"$message\" buttons {\"OK\"} default button \"OK\" with title \"$title\" with icon stop"
}

# Show success dialog
show_success() {
    local message="$1"
    local title="${2:-Installation Complete}"
    
    osascript -e "display dialog \"$message\" buttons {\"OK\"} default button \"OK\" with title \"$title\" with icon note"
}

# Show confirmation dialog
show_confirmation() {
    local message="$1"
    local title="${2:-Confirm Action}"
    
    osascript -e "display dialog \"$message\" buttons {\"Cancel\", \"OK\"} default button \"OK\" with title \"$title\" with icon caution"
    return $?
}

# Show Node.js installation dialog
show_nodejs_install() {
    local result
    result=$(osascript -e 'display dialog "Node.js is required but not installed.

Would you like to:
• Open Node.js download page
• Continue anyway (installation will fail)
• Cancel installation" buttons {"Cancel", "Continue Anyway", "Download Node.js"} default button "Download Node.js" with title "Node.js Required" with icon caution')
    
    local button_pressed=$(echo "$result" | sed 's/.*button returned:\([^,]*\).*/\1/')
    
    case "$button_pressed" in
        "Download Node.js")
            open "https://nodejs.org/en/download/"
            return 2  # Special return code for download
            ;;
        "Continue Anyway")
            return 1  # Continue without Node.js
            ;;
        *)
            return 0  # Cancel
            ;;
    esac
}

# Show installation location dialog
get_install_location() {
    local default_path="$HOME/Applications/RateSpot-MCP"
    
    local result
    result=$(osascript -e "display dialog \"Choose installation location:\" default answer \"$default_path\" buttons {\"Cancel\", \"Choose Folder\", \"Use Default\"} default button \"Use Default\" with title \"Installation Location\"")
    
    local button_pressed=$(echo "$result" | sed 's/.*button returned:\([^,]*\).*/\1/')
    local install_path=$(echo "$result" | sed 's/.*text returned:\(.*\)/\1/')
    
    case "$button_pressed" in
        "Choose Folder")
            # Use folder picker
            local folder_result
            folder_result=$(osascript -e 'choose folder with prompt "Select installation folder:"' 2>/dev/null)
            if [[ $? -eq 0 ]]; then
                # Convert POSIX path
                folder_result=$(osascript -e "POSIX path of (\"$folder_result\" as alias)")
                echo "${folder_result%/}/RateSpot-MCP"
            else
                echo "$default_path"  # Fallback to default
            fi
            ;;
        "Use Default")
            echo "$install_path"
            ;;
        *)
            return 1  # Cancel
            ;;
    esac
    return 0
}

# Show final success with options
show_final_success() {
    local install_path="$1"
    
    local result
    result=$(osascript -e "display dialog \"🎉 RateSpot MCP Server installed successfully!

Installation location: $install_path

The server has been configured in Claude Desktop and is ready to use.

What would you like to do next?\" buttons {\"Done\", \"Open Install Folder\", \"Test Installation\"} default button \"Done\" with title \"Installation Complete\" with icon note")
    
    local button_pressed=$(echo "$result" | sed 's/.*button returned:\([^,]*\).*/\1/')
    
    case "$button_pressed" in
        "Open Install Folder")
            open "$install_path"
            ;;
        "Test Installation")
            return 2  # Special code for test
            ;;
        *)
            return 0  # Done
            ;;
    esac
}

# Show test results
show_test_results() {
    local success="$1"
    local message="$2"
    
    if [[ "$success" == "true" ]]; then
        osascript -e "display dialog \"✅ Test Results: SUCCESS

$message

Your RateSpot MCP server is working correctly!\" buttons {\"OK\"} default button \"OK\" with title \"Test Complete\" with icon note"
    else
        osascript -e "display dialog \"❌ Test Results: FAILED

$message

Please check your API key and try again.\" buttons {\"OK\"} default button \"OK\" with title \"Test Failed\" with icon stop"
    fi
}

# Show retry dialog
show_retry() {
    local message="$1"
    local action="${2:-operation}"
    
    osascript -e "display dialog \"$message

Would you like to retry the $action?\" buttons {\"Cancel\", \"Retry\"} default button \"Retry\" with title \"Retry $action\" with icon caution"
    return $?
}
