#!/bin/bash

# Test script for RateSpot MCP Installer
# This script performs basic validation of the installer structure

echo "🧪 Testing RateSpot MCP Installer"
echo "================================="
echo

# Test 1: Check app bundle structure
echo "📁 Checking app bundle structure..."

required_files=(
    "RateSpot-MCP-Installer.app/Contents/Info.plist"
    "RateSpot-MCP-Installer.app/Contents/PkgInfo"
    "RateSpot-MCP-Installer.app/Contents/MacOS/installer"
    "RateSpot-MCP-Installer.app/Contents/Resources/ui_helpers.sh"
    "RateSpot-MCP-Installer.app/Contents/Resources/validation.sh"
    "RateSpot-MCP-Installer.app/Contents/Resources/install_core.sh"
)

missing_files=()
for file in "${required_files[@]}"; do
    if [[ ! -f "$file" ]]; then
        missing_files+=("$file")
    fi
done

if [[ ${#missing_files[@]} -eq 0 ]]; then
    echo "✅ All required files present"
else
    echo "❌ Missing files:"
    for file in "${missing_files[@]}"; do
        echo "   - $file"
    done
    exit 1
fi

# Test 2: Check file permissions
echo
echo "🔐 Checking file permissions..."

executable_files=(
    "RateSpot-MCP-Installer.app/Contents/MacOS/installer"
    "RateSpot-MCP-Installer.app/Contents/Resources/ui_helpers.sh"
    "RateSpot-MCP-Installer.app/Contents/Resources/validation.sh"
    "RateSpot-MCP-Installer.app/Contents/Resources/install_core.sh"
)

permission_issues=()
for file in "${executable_files[@]}"; do
    if [[ ! -x "$file" ]]; then
        permission_issues+=("$file")
    fi
done

if [[ ${#permission_issues[@]} -eq 0 ]]; then
    echo "✅ All files have correct permissions"
else
    echo "❌ Files missing execute permission:"
    for file in "${permission_issues[@]}"; do
        echo "   - $file"
    done
    exit 1
fi

# Test 3: Validate shell script syntax
echo
echo "📝 Validating shell script syntax..."

script_files=(
    "RateSpot-MCP-Installer.app/Contents/MacOS/installer"
    "RateSpot-MCP-Installer.app/Contents/Resources/ui_helpers.sh"
    "RateSpot-MCP-Installer.app/Contents/Resources/validation.sh"
    "RateSpot-MCP-Installer.app/Contents/Resources/install_core.sh"
)

syntax_errors=()
for script in "${script_files[@]}"; do
    if ! bash -n "$script" 2>/dev/null; then
        syntax_errors+=("$script")
    fi
done

if [[ ${#syntax_errors[@]} -eq 0 ]]; then
    echo "✅ All scripts have valid syntax"
else
    echo "❌ Scripts with syntax errors:"
    for script in "${syntax_errors[@]}"; do
        echo "   - $script"
        echo "     Error: $(bash -n "$script" 2>&1)"
    done
    exit 1
fi

# Test 4: Check Info.plist validity
echo
echo "📋 Validating Info.plist..."

if plutil -lint "RateSpot-MCP-Installer.app/Contents/Info.plist" >/dev/null 2>&1; then
    echo "✅ Info.plist is valid"
else
    echo "❌ Info.plist has errors:"
    plutil -lint "RateSpot-MCP-Installer.app/Contents/Info.plist"
    exit 1
fi

# Test 5: Check for required functions in scripts
echo
echo "🔍 Checking for required functions..."

# Check ui_helpers.sh
required_ui_functions=(
    "show_welcome"
    "get_api_key"
    "show_error"
    "show_success"
    "show_final_success"
)

missing_ui_functions=()
for func in "${required_ui_functions[@]}"; do
    if ! grep -q "^$func()" "RateSpot-MCP-Installer.app/Contents/Resources/ui_helpers.sh"; then
        missing_ui_functions+=("$func")
    fi
done

if [[ ${#missing_ui_functions[@]} -eq 0 ]]; then
    echo "✅ All UI functions present"
else
    echo "❌ Missing UI functions:"
    for func in "${missing_ui_functions[@]}"; do
        echo "   - $func"
    done
fi

# Check validation.sh
required_validation_functions=(
    "check_nodejs"
    "validate_api_key"
    "check_claude_desktop"
    "run_preinstall_checks"
)

missing_validation_functions=()
for func in "${required_validation_functions[@]}"; do
    if ! grep -q "^$func()" "RateSpot-MCP-Installer.app/Contents/Resources/validation.sh"; then
        missing_validation_functions+=("$func")
    fi
done

if [[ ${#missing_validation_functions[@]} -eq 0 ]]; then
    echo "✅ All validation functions present"
else
    echo "❌ Missing validation functions:"
    for func in "${missing_validation_functions[@]}"; do
        echo "   - $func"
    done
fi

# Check install_core.sh
required_install_functions=(
    "install_mcp_server"
    "configure_claude_desktop"
    "perform_installation"
)

missing_install_functions=()
for func in "${required_install_functions[@]}"; do
    if ! grep -q "^$func()" "RateSpot-MCP-Installer.app/Contents/Resources/install_core.sh"; then
        missing_install_functions+=("$func")
    fi
done

if [[ ${#missing_install_functions[@]} -eq 0 ]]; then
    echo "✅ All installation functions present"
else
    echo "❌ Missing installation functions:"
    for func in "${missing_install_functions[@]}"; do
        echo "   - $func"
    done
fi

# Test 6: Check app bundle can be opened (dry run)
echo
echo "🚀 Testing app bundle launch (dry run)..."

# Try to get app info
if /usr/bin/mdls "RateSpot-MCP-Installer.app" | grep -q "kMDItemContentType.*com.apple.application-bundle"; then
    echo "✅ App bundle recognized by macOS"
else
    echo "❌ App bundle not recognized by macOS"
    exit 1
fi

# Summary
echo
echo "📊 Test Summary"
echo "==============="

total_tests=6
passed_tests=0

if [[ ${#missing_files[@]} -eq 0 ]]; then ((passed_tests++)); fi
if [[ ${#permission_issues[@]} -eq 0 ]]; then ((passed_tests++)); fi
if [[ ${#syntax_errors[@]} -eq 0 ]]; then ((passed_tests++)); fi
if plutil -lint "RateSpot-MCP-Installer.app/Contents/Info.plist" >/dev/null 2>&1; then ((passed_tests++)); fi
if [[ ${#missing_ui_functions[@]} -eq 0 && ${#missing_validation_functions[@]} -eq 0 && ${#missing_install_functions[@]} -eq 0 ]]; then ((passed_tests++)); fi
if /usr/bin/mdls "RateSpot-MCP-Installer.app" | grep -q "kMDItemContentType.*com.apple.application-bundle"; then ((passed_tests++)); fi

echo "Tests passed: $passed_tests/$total_tests"

if [[ $passed_tests -eq $total_tests ]]; then
    echo
    echo "🎉 All tests passed! The installer is ready for distribution."
    echo
    echo "📦 Next steps:"
    echo "1. Test the installer manually by double-clicking it"
    echo "2. Create a ZIP file for distribution:"
    echo "   zip -r RateSpot-MCP-Installer.zip RateSpot-MCP-Installer.app"
    echo "3. Upload to GitHub releases or your distribution method"
    echo "4. Consider code signing for better user experience"
    echo
    exit 0
else
    echo
    echo "❌ Some tests failed. Please fix the issues above before distributing."
    exit 1
fi
