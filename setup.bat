@echo off
echo 🚀 Setting up RateSpot MCP Server...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js v16 or higher.
    pause
    exit /b 1
)

echo ✅ Node.js detected

REM Install dependencies
echo 📦 Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file...
    copy .env.example .env
    echo ✅ .env file created from template
    echo ⚠️  Please edit .env and add your RATESPOT_API_KEY
) else (
    echo ✅ .env file already exists
)

REM Build the server
echo 🔨 Building server...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Failed to build server
    pause
    exit /b 1
)

echo ✅ Server built successfully

REM Run tests
echo 🧪 Running tests...
call npm test
if %errorlevel% neq 0 (
    echo ❌ Tests failed
    pause
    exit /b 1
)

echo ✅ Tests passed

REM Display next steps
echo.
echo 🎉 Setup complete!
echo.
echo 📝 Next steps:
echo 1. Edit .env and add your RATESPOT_API_KEY:
echo    RATESPOT_API_KEY=your_actual_api_key_here
echo.
echo 2. Add to your MCP client configuration:
echo    For Claude Desktop: %%APPDATA%%\Claude\claude_desktop_config.json
echo.
echo    Configuration example:
echo    {
echo      "mcpServers": {
echo        "ratespot": {
echo          "command": "node",
echo          "args": ["%cd%\ratespot_mcp_server.js"],
echo          "env": {
echo            "RATESPOT_API_KEY": "your_api_key_here"
echo          }
echo        }
echo      }
echo    }
echo.
echo 3. Restart your MCP client to load the server
echo.
echo 🔧 Available commands:
echo    npm run build  - Build the server
echo    npm run dev    - Build and run the server
echo    npm test       - Run tests
echo    npm start      - Start the server
echo.
pause
