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

# Show MCP client selection dialog
show_mcp_client_selection() {
    local claude_status="$1"
    local cline_status="$2"
    
    local claude_text="Claude Desktop (recommended)"
    local cline_text="Cline (VS Code extension)"
    
    # Add status indicators
    if [[ "$claude_status" == "detected" ]]; then
        claude_text="$claude_text - ✅ Detected"
    elif [[ "$claude_status" == "missing" ]]; then
        claude_text="$claude_text - ⚠️ Not found"
    fi
    
    if [[ "$cline_status" == "detected" ]]; then
        cline_text="$cline_text - ✅ Detected"
    elif [[ "$cline_status" == "missing" ]]; then
        cline_text="$cline_text - ⚠️ Not found"
    fi
    
    # Create the dialog with multiple choice list
    local result
    result=$(osascript -e "
    set clientChoices to {\"$claude_text\", \"$cline_text\"}
    set defaultSelections to {true, false}
    
    set selectedItems to choose from list clientChoices with title \"Configure MCP Clients\" with prompt \"Select which applications to configure with RateSpot MCP:

You can select multiple clients by holding Command while clicking.\" default items {item 1 of clientChoices} with multiple selections allowed
    
    if selectedItems is false then
        return \"CANCELLED\"
    else
        set AppleScript's text item delimiters to \"|\"
        return selectedItems as string
    end if
    ")
    
    if [[ "$result" == "CANCELLED" ]]; then
        return 1
    fi
    
    # Parse the results and return selection flags
    local configure_claude=false
    local configure_cline=false
    
    if echo "$result" | grep -q "Claude Desktop"; then
        configure_claude=true
    fi
    
    if echo "$result" | grep -q "Cline"; then
        configure_cline=true
    fi
    
    # Return the selections as environment variables
    echo "CONFIGURE_CLAUDE=$configure_claude"
    echo "CONFIGURE_CLINE=$configure_cline"
    return 0
}

# Show configuration results summary
show_configuration_summary() {
    local claude_result="$1"
    local cline_result="$2"
    local install_path="$3"
    
    local summary="🎉 RateSpot MCP Server installed successfully!

Installation location: $install_path

Configuration Results:"
    
    if [[ "$claude_result" == "success" ]]; then
        summary="$summary
✅ Claude Desktop - Configured successfully"
    elif [[ "$claude_result" == "skipped" ]]; then
        summary="$summary
⏭️ Claude Desktop - Skipped (not selected)"
    elif [[ "$claude_result" == "failed" ]]; then
        summary="$summary
❌ Claude Desktop - Configuration failed"
    fi
    
    if [[ "$cline_result" == "success" ]]; then
        summary="$summary
✅ Cline (VS Code) - Configured successfully"
    elif [[ "$cline_result" == "skipped" ]]; then
        summary="$summary
⏭️ Cline (VS Code) - Skipped (not selected)"
    elif [[ "$cline_result" == "failed" ]]; then
        summary="$summary
❌ Cline (VS Code) - Configuration failed"
    fi
    
    summary="$summary

Your RateSpot MCP server is ready to use!"
    
    local result
    result=$(osascript -e "display dialog \"$summary\" buttons {\"Done\", \"Open Install Folder\", \"Test Installation\"} default button \"Done\" with title \"Installation Complete\" with icon note")
    
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

# Show retry dialog
show_retry() {
    local message="$1"
    local action="${2:-operation}"
    
    osascript -e "display dialog \"$message

Would you like to retry the $action?\" buttons {\"Cancel\", \"Retry\"} default button \"Retry\" with title \"Retry $action\" with icon caution"
    return $?
}
