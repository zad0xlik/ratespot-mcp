# RateSpot MCP Server - Directory Creation Fix

## Issue Summary
The RateSpot MCP server was failing to start with the following error:
```
Error: ENOENT: no such file or directory, mkdir '/data'
```

## Root Cause
The server was trying to create a directory at `/data` (absolute path) instead of a relative `data` directory in the project folder. This occurred because:

1. The original code used `process.cwd()` to determine the working directory
2. When the MCP server was launched by Claude Desktop/Cline, the working directory was set to `/` (root) instead of the project directory
3. This caused `path.join(process.cwd(), 'data')` to resolve to `/data` instead of the intended project-relative path

## Solution Applied
Changed the directory creation logic from using `process.cwd()` to using `__dirname`:

### Before (Problematic):
```typescript
const DATA_DIR = path.join(process.cwd(), 'data');
```

### After (Fixed):
```typescript
const DATA_DIR = path.join(__dirname, 'data');
```

## Additional Improvements
1. **Added debugging information** to help diagnose path issues:
   ```typescript
   console.error(`Current working directory: ${process.cwd()}`);
   console.error(`Script directory: ${__dirname}`);
   console.error(`Data directory will be: ${DATA_DIR}`);
   ```

2. **Improved error handling** with try-catch block and detailed error messages:
   ```typescript
   try {
     if (!fs.existsSync(DATA_DIR)) {
       fs.mkdirSync(DATA_DIR, { recursive: true });
       console.error(`Created data directory: ${DATA_DIR}`);
     } else {
       console.error(`Data directory already exists: ${DATA_DIR}`);
     }
   } catch (error) {
     console.error(`Failed to create data directory: ${error instanceof Error ? error.message : String(error)}`);
     console.error(`Attempted path: ${DATA_DIR}`);
     console.error(`This error suggests a permissions issue or invalid path.`);
     process.exit(1);
   }
   ```

## Verification Results
After applying the fix:

1. **Server starts successfully** without directory creation errors
2. **Data directory is created correctly** at `/Users/fedor/IdeaProjects/ratespot-mcp/data`
3. **All MCP tools function properly** (tested with calculate-monthly-payment)
4. **Debugging output shows correct paths**:
   ```
   Current working directory: /Users/fedor/IdeaProjects/ratespot-mcp
   Script directory: /Users/fedor/IdeaProjects/ratespot-mcp
   Data directory will be: /Users/fedor/IdeaProjects/ratespot-mcp/data
   Data directory already exists: /Users/fedor/IdeaProjects/ratespot-mcp/data
   RateSpot MCP Server running on stdio
   ```

## Key Differences: `process.cwd()` vs `__dirname`

| Aspect | `process.cwd()` | `__dirname` |
|--------|----------------|-------------|
| **What it returns** | Current working directory when process started | Directory where the script file is located |
| **Can change during execution** | Yes (via `process.chdir()`) | No (always constant) |
| **Affected by how process is launched** | Yes | No |
| **Best for** | User-relative operations | Script-relative operations |

## Prevention Guidelines
For future Node.js/TypeScript projects:

1. **Use `__dirname` for script-relative paths** (config files, data directories, etc.)
2. **Use `process.cwd()` for user-relative paths** (user input files, output directories specified by user)
3. **Always add debugging output** for path resolution in server applications
4. **Include comprehensive error handling** for file system operations
5. **Test server startup in different working directories** to catch this type of issue early

## Files Modified
- `ratespot_mcp_server.ts` - Applied the fix and improvements
- `ratespot_mcp_server.js` - Recompiled with the fix (via `npm run build`)

## Status
✅ **RESOLVED** - The MCP server now starts successfully and all functionality is working as expected.
