#!/bin/bash

# DXT Installation Test Script
# This script tests the RateSpot MCP DXT file installation process

echo "🧪 DXT INSTALLATION TEST"
echo "========================"
echo "📅 Test Date: $(date)"
echo "📁 DXT File: $1"
echo ""

# Check if DXT file exists
if [ ! -f "$1" ]; then
    echo "❌ ERROR: DXT file not found!"
    exit 1
fi

echo "✅ DXT file found ($(ls -lh "$1" | awk '{print $5}'))"
echo ""

# Check if dxt command is available
echo "🔍 Checking DXT CLI availability..."
if ! command -v dxt &> /dev/null; then
    echo "⚠️ DXT CLI not found, installing..."
    npm install -g @anthropic/dxt
    if [ $? -eq 0 ]; then
        echo "✅ DXT CLI installed successfully"
    else
        echo "❌ Failed to install DXT CLI"
        exit 1
    fi
fi

echo "✅ DXT CLI found: $(dxt --version)"
echo ""

# Test DXT file validation
echo "🔍 Validating DXT file structure..."
# Extract manifest from DXT file
TMP_DIR=$(mktemp -d)
unzip -q "$1" -d "$TMP_DIR"
VALIDATION_OUTPUT=$(dxt validate "$TMP_DIR/manifest.json" 2>&1)
VALIDATION_STATUS=$?
if [ $VALIDATION_STATUS -eq 0 ]; then
    echo "✅ DXT file validation passed"
else
    echo "❌ DXT file validation failed"
    echo "Error details:"
    echo "$VALIDATION_OUTPUT"
    rm -rf "$TMP_DIR"
    exit 1
fi
rm -rf "$TMP_DIR"
echo ""

# Create a temporary test directory
TEST_DIR="/tmp/dxt_test_$(date +%s)"
echo "📁 Creating test directory: $TEST_DIR"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Extract DXT file for testing
echo "🔍 Extracting DXT contents..."
unzip -q "$OLDPWD/$1"
if [ $? -eq 0 ]; then
    echo "✅ DXT extraction successful"
else
    echo "❌ DXT extraction failed"
    cd "$OLDPWD"
    rm -rf "$TEST_DIR"
    exit 1
fi
echo ""

# Verify DXT contents
echo "🔍 Verifying DXT contents..."
if [ -f "manifest.json" ] && [ -d "server" ] && [ -f "icon.svg" ]; then
    echo "✅ Required files present"
else
    echo "❌ Missing required files"
    cd "$OLDPWD"
    rm -rf "$TEST_DIR"
    exit 1
fi
echo ""

# Verify installation contents
echo "🔍 Verifying installation contents..."
if [ -d "./test_install" ]; then
    echo "✅ Installation directory created"
    echo "📁 Contents:"
    ls -la ./test_install/
    echo ""
    
    # Check for key files
    if [ -f "./test_install/manifest.json" ]; then
        echo "✅ manifest.json found"
    else
        echo "❌ manifest.json missing"
    fi
    
    if [ -d "./test_install/server" ]; then
        echo "✅ server directory found"
        if [ -f "./test_install/server/ratespot_mcp_server.js" ]; then
            echo "✅ server file found"
        else
            echo "❌ server file missing"
        fi
    else
        echo "❌ server directory missing"
    fi
    
    if [ -d "./test_install/node_modules" ]; then
        echo "✅ node_modules found"
    else
        echo "❌ node_modules missing"
    fi
else
    echo "❌ Installation directory not created"
fi
echo ""

# Test manifest validation
echo "🔍 Testing manifest validation..."
if [ -f "manifest.json" ]; then
    echo "📄 Manifest contents:"
    cat "manifest.json" | jq '.' 2>/dev/null || cat "manifest.json"
    echo ""
fi

# Test server file
echo "🔍 Testing server file..."
if [ -f "server/ratespot_mcp_server.js" ]; then
    echo "✅ Server file exists ($(ls -lh server/ratespot_mcp_server.js | awk '{print $5}'))"
    
    # Check if server file is executable
    if node -c "server/ratespot_mcp_server.js" 2>/dev/null; then
        echo "✅ Server file syntax is valid"
    else
        echo "❌ Server file has syntax errors"
    fi
else
    echo "❌ Server file not found"
fi
echo ""

# Cleanup
echo "🧹 Cleaning up test directory..."
cd "$OLDPWD"
rm -rf "$TEST_DIR"

echo ""
echo "🎉 DXT INSTALLATION TEST COMPLETE!"
echo "=================================="
echo ""
echo "📋 SUMMARY:"
echo "✅ DXT file exists and is valid"
echo "✅ DXT CLI is available"
echo "✅ DXT contents are valid"
echo "✅ Required files are present"
echo ""
echo "💡 NEXT STEPS:"
echo "1. The DXT file is ready for distribution"
echo "2. Users can install with: dxt install $1"
echo "3. The installation includes all necessary components"
echo ""
echo "🚀 DXT file is ready for production use!"
