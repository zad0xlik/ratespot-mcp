#!/bin/bash

echo "🧹 Creating clean DXT package..."

# Clean up any existing temp directories
rm -rf /tmp/dxt_clean_build
mkdir -p /tmp/dxt_clean_build

# Copy only the necessary files
echo "📁 Copying files..."
cp -r dxt-extension/* /tmp/dxt_clean_build/

# Ensure clean line endings
echo "🔧 Cleaning manifest..."
cd /tmp/dxt_clean_build
# Remove any potential BOM or weird characters
python3 -c "
import json
with open('manifest.json', 'r') as f:
    data = json.load(f)
with open('manifest.json', 'w') as f:
    json.dump(data, f, indent=2)
"

# Validate before packing
echo "✅ Validating manifest..."
dxt validate manifest.json

# Pack the extension
echo "📦 Packing extension..."
dxt pack . ../ratespot-mcp-clean.dxt

# Move back to original directory
cd - > /dev/null
mv /tmp/dxt_clean_build/ratespot-mcp-clean.dxt ./ratespot-mcp-1.0.0.dxt

echo "✅ Clean DXT package created!"

# Test the new package
echo ""
echo "🧪 Testing new package..."
dxt validate ratespot-mcp-1.0.0.dxt
dxt info ratespot-mcp-1.0.0.dxt

# Clean up
rm -rf /tmp/dxt_clean_build

echo ""
echo "🎉 Done! The DXT file should now work correctly."
