# File Manager DXT

A DXT extension that provides tools for file analysis and management, designed to help Claude analyze and understand files in the RateSpot MCP tools.

## Features

- **File Analysis**: Get detailed information about files including size, type, encoding, and metadata
- **File Reading**: Read text files with automatic encoding detection
- **Directory Listing**: List directory contents with detailed file information

## Tools

### 1. analyze_file

Get detailed information about a file:
- File size
- Creation and modification times
- MIME type
- File extension
- Binary/text detection
- Encoding detection (for text files)

```json
{
  "path": "path/to/file"
}
```

### 2. read_file

Read and return the contents of a text file with automatic encoding detection:
- File contents
- Detected encoding
- File metadata

```json
{
  "path": "path/to/file"
}
```

### 3. list_directory

List contents of a directory with detailed information about each file:
- Optional recursive listing
- Detailed information for each file

```json
{
  "path": "path/to/directory",
  "recursive": false
}
```

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Install system dependencies (for python-magic):
- On macOS: `brew install libmagic`
- On Ubuntu/Debian: `apt-get install libmagic1`
- On Windows: Include the DLL files from the python-magic-bin package

## Integration with RateSpot MCP

This DXT extension is designed to work with RateSpot MCP tools to provide enhanced file analysis capabilities. It can be used to:

- Analyze downloaded files from various sources
- Verify file types and contents
- Extract information from text-based files
- Navigate and explore directory structures

## Development

The server is built using FastAPI and provides a RESTful API for file operations. Each tool corresponds to an endpoint that handles specific file operations.

To extend or modify the functionality:
1. Add new endpoints in `src/server.py`
2. Update the tool schemas in `manifest.json`
3. Update documentation in this README

## Error Handling

The server includes comprehensive error handling for:
- File not found
- Permission issues
- Binary file detection
- Encoding issues
- Invalid paths

Each error returns an appropriate HTTP status code and descriptive message.
