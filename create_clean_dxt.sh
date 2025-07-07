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
# Remove any potential BOM or weird characters and ensure clean UTF-8
python3 -c "
import json
import codecs

def clean_and_validate_json():
    # Read with UTF-8-BOM encoding to handle any BOM characters
    with codecs.open('manifest.json', 'r', encoding='utf-8-sig') as f:
        content = f.read()
        # Parse to validate JSON
        data = json.loads(content)
    
    # Write with explicit UTF-8 encoding without BOM
    with open('manifest.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    # Validate the written file
    with open('manifest.json', 'r', encoding='utf-8') as f:
        json.load(f)
        print('✅ JSON validation successful')

clean_and_validate_json()
"

# Validate before packing
echo "✅ Validating manifest..."
dxt validate manifest.json

# Pack the extension
echo "📦 Packing extension..."
dxt pack . ../ratespot-mcp-2.0.1.dxt

# Move back to original directory
cd - > /dev/null
cp /tmp/dxt_clean_build/../ratespot-mcp-2.0.1.dxt ./ratespot-mcp-2.0.1.dxt

echo "✅ Clean DXT package created!"

# Clean up
rm -rf /tmp/dxt_clean_build

echo ""
echo "🎉 Done! DXT package created successfully."
