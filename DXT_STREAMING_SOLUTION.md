# DXT Streaming Solution for RateSpot MCP

## Problem Summary

The RateSpot API is a streaming endpoint that can take 15-30+ seconds to return all data. When installed via DXT extension in Claude Desktop, the MCP server encounters a hardcoded 15-second timeout, causing requests to fail for certain ZIP codes (like 94949).

### Key Findings

1. **DXT extensions have a 15-second timeout** enforced by Claude Desktop's UtilityProcess
2. **Manual installations work fine** because they bypass the DXT timeout and use the full 30-second timeout
3. **DXT extensions are NOT added to claude_desktop_config.json** - they're managed separately

## Solution: Streaming Implementation

We've implemented a streaming solution that works within the 15-second DXT timeout by:

### 1. Progressive Response Pattern

The new `ratespot_mcp_server_streaming.ts` implements:

- **Immediate response** with a session ID within 10 seconds
- **Background processing** that continues fetching data
- **Session-based retrieval** to get complete results

### 2. New Tools

#### `get-mortgage-rates` (Enhanced)
- Now has a `streaming` parameter (default: true)
- Returns initial results quickly with a session ID
- Shows best rate found so far
- Provides instructions to retrieve more results

#### `get-streaming-results` (New)
- Retrieves results from a streaming session
- Supports multiple formats: status, markdown, csv, structured
- Shows current progress and completion status

### 3. How It Works

```typescript
// 1. Initial request returns quickly
const result = await get_mortgage_rates({
  zipCode: "94949",
  creditScore: 710,
  // ... other params
  streaming: true  // Enable streaming mode
});

// Returns:
// 🔄 STREAMING MODE ACTIVE
// 📊 Session ID: abc123...
// ⏱️ Status: partial
// 📦 Products Received: 45
// 🏆 Best Rate So Far: 6.125% from Lender XYZ

// 2. Get complete results later
const fullResults = await get_streaming_results({
  sessionId: "abc123...",
  format: "markdown"  // or "csv", "structured"
});
```

### 4. Session Management

- Sessions are stored in memory for 30 minutes
- Automatic cleanup of old sessions
- Each session tracks:
  - Status: processing, partial, complete, error
  - Data received so far
  - Metadata and search parameters
  - Creation and last access times

## Installation

The streaming server is now part of the DXT package:

1. **File**: `ratespot-mcp-2.0.0.dxt`
2. **Server**: `dxt-extension/server/ratespot_mcp_server_streaming.js`
3. **Version**: 2.0.0 (upgraded from 1.0.0)

## Benefits

1. **Works with DXT timeout**: Returns initial data within 15 seconds
2. **No data loss**: All results are captured in the background
3. **Flexible retrieval**: Get results in multiple formats
4. **Better UX**: Users see progress and partial results immediately

## Technical Details

### Streaming Process

1. **Request starts**: API call begins in background
2. **Chunk processing**: Data is processed as it arrives
3. **Status updates**: Session status changes from processing → partial → complete
4. **Error handling**: Errors are captured and stored in session

### Memory Management

- Active sessions Map stores all streaming data
- Cleanup runs every 5 minutes
- Sessions expire after 30 minutes of inactivity

## Usage Examples

### Basic Usage
```javascript
// Get rates with streaming (default)
const rates = await get_mortgage_rates({
  zipCode: "94949",
  creditScore: 710,
  propertyValue: 1198000,
  downPayment: 239600
});
```

### Check Status
```javascript
// Check streaming session status
const status = await get_streaming_results({
  sessionId: "session-id-here",
  format: "status"
});
```

### Get Full Results
```javascript
// Get complete results as CSV
const csv = await get_streaming_results({
  sessionId: "session-id-here",
  format: "csv"
});
```

### Non-Streaming Mode
```javascript
// Use original behavior (may timeout on DXT)
const rates = await get_mortgage_rates({
  zipCode: "94949",
  creditScore: 710,
  propertyValue: 1198000,
  downPayment: 239600,
  streaming: false  // Disable streaming
});
```

## Limitations

1. **Session storage**: In-memory only (lost on server restart)
2. **No persistence**: Sessions don't survive server crashes
3. **Single server**: Not suitable for distributed deployments

## Future Improvements

1. **Redis/Database storage**: For persistent sessions
2. **WebSocket support**: Real-time updates as data arrives
3. **Batch processing**: Handle multiple ZIP codes in parallel
4. **Caching**: Store common queries for instant response

## Summary

This streaming solution successfully works around the DXT 15-second timeout limitation by:
- Returning partial results immediately
- Processing data in the background
- Providing a simple API to retrieve complete results

The solution maintains backward compatibility while enabling reliable access to all RateSpot data through DXT installations.
