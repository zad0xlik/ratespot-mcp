#!/bin/bash

echo "🧪 SIMPLE DXT TEST"
echo "=================="

# Test DXT validation
echo "🔍 Testing DXT validation..."
if dxt validate ratespot-mcp-1.0.0.dxt; then
    echo "✅ DXT validation passed"
else
    echo "❌ DXT validation failed"
    exit 1
fi

# Test DXT info
echo ""
echo "📋 DXT file info:"
dxt info ratespot-mcp-1.0.0.dxt

# Test unpacking to a clean directory
echo ""
echo "📦 Testing unpack..."
rm -rf /tmp/dxt_simple_test
if dxt unpack ratespot-mcp-1.0.0.dxt /tmp/dxt_simple_test; then
    echo "✅ Unpack successful"
    
    # Check key files
    if [ -f "/tmp/dxt_simple_test/manifest.json" ]; then
        echo "✅ manifest.json found"
    else
        echo "❌ manifest.json missing"
    fi
    
    if [ -f "/tmp/dxt_simple_test/server/ratespot_mcp_server.js" ]; then
        echo "✅ server file found"
    else
        echo "❌ server file missing"
    fi
    
    # Validate the unpacked manifest
    echo ""
    echo "🔍 Validating unpacked manifest..."
    if dxt validate /tmp/dxt_simple_test/manifest.json; then
        echo "✅ Unpacked manifest is valid"
    else
        echo "❌ Unpacked manifest is invalid"
    fi
    
    # Clean up
    rm -rf /tmp/dxt_simple_test
else
    echo "❌ Unpack failed"
    exit 1
fi

echo ""
echo "🎉 Simple DXT test completed successfully!"
echo "The DXT file is working correctly."
