# 🔒 Bypass macOS Security Warning - Step by Step

If you see this dialog:

> **"Apple could not verify "RateSpot-MCP-Installer" is free of malware that may harm your Mac or compromise your privacy."**

## ✅ Quick Fix (30 seconds)

1. **Click "Done"** to dismiss the warning dialog
2. **Right-click** on `RateSpot-MCP-Installer.app` in Finder
3. **Select "Open"** from the context menu
4. **Click "Open"** in the new dialog that appears
5. **The installer will start normally!**

## 🤔 Why This Happens

- This is **normal** for unsigned applications
- The installer is **completely safe**
- macOS just doesn't recognize the developer signature
- This happens with many legitimate apps

## 🎯 Alternative Methods

### System Preferences Method:
1. Click "Done" 
2. System Preferences → Security & Privacy
3. Click "Open Anyway"

### Terminal Method:
```bash
xattr -d com.apple.quarantine RateSpot-MCP-Installer.app
```

**The right-click method is easiest and works every time!**

---

**Your installer is ready to use once you bypass this standard macOS security check.** 🚀
