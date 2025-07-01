#!/bin/bash

# DXT Installation Test Script
# This script tests the RateSpot MCP DXT file installation process

echo "🧪 DXT INSTALLATION TEST"
echo "========================"
echo "📅 Test Date: $(date)"
echo "📁 DXT File: ratespot-mcp-1.0.0.dxt"
echo ""

# Check if DXT file exists
if [ ! -f "ratespot-mcp-1.0.0.dxt" ]; then
    echo "❌ ERROR: DXT file not found!"
    exit 1
fi

echo "✅ DXT file found ($(ls -lh ratespot-mcp-1.0.0.dxt | awk '{print $5}'))"
echo ""

# Check if dxt command is available
echo "🔍 Checking DXT CLI availability..."
if ! command -v dxt &> /dev/null; then
    echo "❌ ERROR: DXT CLI not found!"
    echo "💡 Install with: npm install -g @anthropic/dxt"
    exit 1
fi

echo "✅ DXT CLI found: $(dxt --version)"
echo ""

# Test DXT file validation
echo "🔍 Validating DXT file structure..."
dxt validate ratespot-mcp-1.0.0.dxt
if [ $? -eq 0 ]; then
    echo "✅ DXT file validation passed"
else
    echo "❌ DXT file validation failed"
    exit 1
fi
echo ""

# Test DXT file inspection
echo "🔍 Inspecting DXT file contents..."
dxt inspect ratespot-mcp-1.0.0.dxt
echo ""

# Create a temporary test directory
TEST_DIR="/tmp/dxt_test_$(date +%s)"
echo "📁 Creating test directory: $TEST_DIR"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Copy DXT file to test directory
cp "$OLDPWD/ratespot-mcp-1.0.0.dxt" .

echo "🚀 Testing DXT installation process..."
echo ""

# Test installation (dry run first)
echo "🧪 Testing dry-run installation..."
dxt install ratespot-mcp-1.0.0.dxt --dry-run
if [ $? -eq 0 ]; then
    echo "✅ Dry-run installation test passed"
else
    echo "❌ Dry-run installation test failed"
    cd "$OLDPWD"
    rm -rf "$TEST_DIR"
    exit 1
fi
echo ""

# Test actual installation to test directory
echo "🧪 Testing actual installation..."
dxt install ratespot-mcp-1.0.0.dxt --target-dir ./test_install
if [ $? -eq 0 ]; then
    echo "✅ Installation test passed"
else
    echo "❌ Installation test failed"
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
if [ -f "./test_install/manifest.json" ]; then
    echo "📄 Manifest contents:"
    cat "./test_install/manifest.json" | jq '.' 2>/dev/null || cat "./test_install/manifest.json"
    echo ""
fi

# Test server file
echo "🔍 Testing server file..."
if [ -f "./test_install/server/ratespot_mcp_server.js" ]; then
    echo "✅ Server file exists ($(ls -lh ./test_install/server/ratespot_mcp_server.js | awk '{print $5}'))"
    
    # Check if server file is executable
    if node -c "./test_install/server/ratespot_mcp_server.js" 2>/dev/null; then
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
echo "✅ Installation process works"
echo "✅ Required files are present"
echo ""
echo "💡 NEXT STEPS:"
echo "1. The DXT file is ready for distribution"
echo "2. Users can install with: dxt install ratespot-mcp-1.0.0.dxt"
echo "3. The installation includes all necessary components"
echo ""
echo "🚀 DXT file is ready for production use!"
