# 🔒 macOS Security Warning - How to Bypass Gatekeeper

When you try to run the RateSpot MCP Installer, you may see this error:

> **"Apple could not verify "RateSpot-MCP-Installer" is free of malware that may harm your Mac or compromise your privacy."**

This is **completely normal** and expected! Here's why and how to fix it:

## 🤔 Why This Happens

- The installer is **not code-signed** with an Apple Developer certificate
- macOS **Gatekeeper** blocks unsigned applications by default
- This is a **security feature**, not an actual problem with the installer
- The installer is **completely safe** - it's just not "blessed" by Apple

## ✅ How to Fix It (Multiple Methods)

### **Method 1: Right-Click Override (Easiest)**

1. **Right-click** on `RateSpot-MCP-Installer.app`
2. Select **"Open"** from the context menu
3. Click **"Open"** in the security dialog that appears
4. The installer will run normally

### **Method 2: System Preferences**

1. Try to open the installer (it will be blocked)
2. Go to **System Preferences** → **Security & Privacy**
3. Click **"Open Anyway"** next to the blocked app message
4. Confirm by clicking **"Open"**

### **Method 3: Terminal Override**

```bash
# Remove the quarantine attribute
xattr -d com.apple.quarantine RateSpot-MCP-Installer.app

# Now double-click to run normally
```

### **Method 4: System Settings (macOS 13+)**

1. Go to **System Settings** → **Privacy & Security**
2. Scroll down to **Security**
3. Click **"Open Anyway"** next to the blocked app
4. Enter your password if prompted

## 🎯 For Distribution

### **User Instructions to Include:**

```markdown
## 🔒 Security Warning Fix

If you see a security warning when opening the installer:

1. **Right-click** the installer app
2. Select **"Open"** 
3. Click **"Open"** again in the dialog
4. The installer will run normally

This is a standard macOS security feature for unsigned apps.
The installer is completely safe to use.
```

### **Professional Solution: Code Signing**

To eliminate this warning entirely, you can code-sign the app:

```bash
# Requires Apple Developer Account ($99/year)
codesign --deep --force --verify --verbose \
  --sign "Developer ID Application: Your Name" \
  RateSpot-MCP-Installer.app

# Verify signing
codesign --verify --verbose RateSpot-MCP-Installer.app
```

## 📋 Updated Distribution Instructions

### **For GitHub Releases:**

Include this note in your release description:

```markdown
## 📥 Installation

1. Download `RateSpot-MCP-Installer.zip`
2. Unzip the file
3. **Right-click** `RateSpot-MCP-Installer.app` → **"Open"**
4. Click **"Open"** in the security dialog
5. Follow the installer prompts

**Note:** You may see a security warning - this is normal for unsigned apps. 
Use the right-click method above to bypass it safely.
```

### **For Direct Sharing:**

```markdown
## 🚀 Quick Install

1. Download the installer
2. **Right-click** the app → **"Open"** → **"Open"**
3. Enter your RateSpot API key when prompted
4. Done! 

**Security Note:** macOS will show a warning for unsigned apps. 
This is normal - just right-click and select "Open" to proceed safely.
```

## 🔐 Security Assurance

**The installer is completely safe because:**

- ✅ **Open source** - All code is visible and auditable
- ✅ **No network access** except for downloading your own repository
- ✅ **No data collection** - Everything stays on the user's machine
- ✅ **Standard operations** - Only installs Node.js packages and updates config files
- ✅ **User controlled** - User chooses installation location and provides API key
- ✅ **Reversible** - Creates uninstaller script for easy removal

## 🎯 Best Practices

### **For Users:**
- Always download from trusted sources (your GitHub releases)
- Use the right-click method to bypass Gatekeeper safely
- Check that the installer creates logs in `/tmp/ratespot_installer.log`

### **For Distribution:**
- Include bypass instructions in all documentation
- Consider code signing for professional distribution
- Provide multiple download formats (ZIP, DMG)
- Include checksums for verification

## 🚀 Alternative: Self-Extracting Script

If Gatekeeper warnings are problematic, you could also create a simple shell script installer:

```bash
#!/bin/bash
# Simple script version - no Gatekeeper issues
curl -L https://github.com/your-repo/installer.sh | bash
```

But the app bundle provides a much better user experience!

---

**Bottom Line:** The security warning is expected and easily bypassed. Your installer is completely safe and professional - it just needs the standard unsigned app bypass procedure.
