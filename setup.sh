#!/bin/bash

# RateSpot MCP Server Setup Script
echo "🚀 Setting up RateSpot MCP Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created from template"
    echo "⚠️  Please edit .env and add your RATESPOT_API_KEY"
else
    echo "✅ .env file already exists"
fi

# Build the server
echo "🔨 Building server..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build server"
    exit 1
fi

echo "✅ Server built successfully"

# Run tests
echo "🧪 Running tests..."
npm test

if [ $? -ne 0 ]; then
    echo "❌ Tests failed"
    exit 1
fi

echo "✅ Tests passed"

# Display next steps
echo ""
echo "🎉 Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Get your RateSpot API key from: https://app.ratespot.io/account-settings"
echo ""
echo "2. Edit .env and add your RATESPOT_API_KEY:"
echo "   RATESPOT_API_KEY=your_actual_api_key_here"
echo ""
echo "3. Add to your MCP client configuration:"
echo "   For Claude Desktop (macOS): ~/Library/Application Support/Claude/claude_desktop_config.json"
echo "   For Claude Desktop (Windows): %APPDATA%\\Claude\\claude_desktop_config.json"
echo ""
echo "   Configuration example:"
echo '   {'
echo '     "mcpServers": {'
echo '       "ratespot": {'
echo '         "command": "node",'
echo "         \"args\": [\"$(pwd)/ratespot_mcp_server.js\"],"
echo '         "env": {'
echo '           "RATESPOT_API_KEY": "your_actual_api_key_here"'
echo '         }'
echo '       }'
echo '     }'
echo '   }'
echo ""
echo "4. Restart your MCP client to load the server"
echo ""
echo "📋 For detailed installation instructions, see:"
echo "   - CLAUDE_DESKTOP_INSTALLATION.md (Claude Desktop setup)"
echo "   - README.md (Complete documentation)"
echo ""
echo "🔧 Available commands:"
echo "   npm run build  - Build the server"
echo "   npm run dev    - Build and run the server"
echo "   npm test       - Run tests"
echo "   npm start      - Start the server"
