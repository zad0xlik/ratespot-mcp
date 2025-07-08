#!/bin/bash

# Set package details
PACKAGE_NAME="file-manager"
PACKAGE_VERSION="1.0.0"
OUTPUT_FILE="${PACKAGE_NAME}-${PACKAGE_VERSION}.dxt"

echo "🧹 Creating ${PACKAGE_NAME} DXT package..."

# Create Python virtual environment if it doesn't exist
if [ ! -d "venv_mcp_py" ]; then
    echo "🐍 Creating Python virtual environment..."
    python3 -m venv venv_mcp_py
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv_mcp_py/bin/activate

# Install requirements
echo "📦 Installing Python requirements..."
pip install -r file-manager-dxt/requirements.txt

# Clean up any existing temp directories
rm -rf /tmp/dxt_file_manager_build
mkdir -p /tmp/dxt_file_manager_build

# Copy only the necessary files
echo "📁 Copying files..."
cp -r file-manager-dxt/* /tmp/dxt_file_manager_build/

# Ensure clean line endings
echo "🔧 Cleaning manifest..."
cd /tmp/dxt_file_manager_build
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
dxt pack . ../${OUTPUT_FILE}

# Move back to original directory
cd - > /dev/null
cp /tmp/dxt_file_manager_build/../${OUTPUT_FILE} ./${OUTPUT_FILE}

echo "✅ Clean DXT package created!"

# Clean up
rm -rf /tmp/dxt_file_manager_build

# Deactivate virtual environment
deactivate

echo ""
echo "🎉 Done! ${PACKAGE_NAME} DXT package created successfully."
