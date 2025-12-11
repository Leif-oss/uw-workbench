# Deployment & Data Security Guide

## 🔒 Cloud Sync Security Warning

**CRITICAL:** This project contains sensitive data that should NOT be synced to cloud services.

### Current Risk Assessment

**Project Location:** `C:\Users\leifk\OneDrive\Desktop\PythonCode\CURSOR\uw-workbench`

**Risk Level:** 🔴 **HIGH** - Project is in OneDrive sync folder

**Sensitive Files at Risk:**
- `.env` files (API keys, passwords)
- `*.db` files (customer data, PII)
- `*.log` files (may contain sensitive info)
- Uploaded documents

**Risk:** All sensitive data is being synced to Microsoft OneDrive cloud storage.

---

## ✅ Recommended Solutions

### Option 1: Separate Code from Data (BEST for Development)

#### Step 1: Create Private Data Directory
```powershell
# Create private directory OUTSIDE OneDrive
mkdir C:\PrivateData\uw-workbench
mkdir C:\PrivateData\uw-workbench\databases
mkdir C:\PrivateData\uw-workbench\logs

# Set restrictive permissions
icacls "C:\PrivateData\uw-workbench" /inheritance:r
icacls "C:\PrivateData\uw-workbench" /grant:r "%USERNAME%:(OI)(CI)F"
```

#### Step 2: Move Sensitive Files
```powershell
# Move .env files
move backend\.env C:\PrivateData\uw-workbench\.env

# Move databases
move *.db C:\PrivateData\uw-workbench\databases\
move backend\*.db C:\PrivateData\uw-workbench\databases\

# Move logs
move *.log C:\PrivateData\uw-workbench\logs\
move backend\*.log C:\PrivateData\uw-workbench\logs\
```

#### Step 3: Update Configuration

**backend/.env.example** - Update with new paths:
```bash
# Point to private location
DATABASE_URL=sqlite:///C:/PrivateData/uw-workbench/databases/workbench.db

# Or use relative path with symlink
DATABASE_URL=sqlite:///./workbench.db  # (symlinked to private location)
```

**Create symlinks** (Run as Administrator):
```powershell
# Backend .env
New-Item -ItemType SymbolicLink -Path "backend\.env" -Target "C:\PrivateData\uw-workbench\.env"

# Database
New-Item -ItemType SymbolicLink -Path "workbench.db" -Target "C:\PrivateData\uw-workbench\databases\workbench.db"
```

---

### Option 2: Exclude Project from OneDrive (EASIEST)

#### Using OneDrive Settings:

1. **Right-click OneDrive icon** in system tray
2. Click **Settings** → **Account** → **Choose folders**
3. Navigate and **uncheck**: `Desktop\PythonCode\CURSOR\uw-workbench`
4. Click **OK**

#### Or use PowerShell:
```powershell
# Stop OneDrive sync for specific folder
Set-ItemProperty -Path "HKCU:\Software\Microsoft\OneDrive" -Name "DisablePersonalSync" -Value 1

# Exclude folder from sync (requires OneDrive client cmdlets)
# Or manually via OneDrive settings UI
```

**Pros:** Simple, no code changes needed  
**Cons:** Entire project (including code) won't sync

---

### Option 3: Move Project Outside OneDrive (RECOMMENDED for Production)

```powershell
# Move entire project
Move-Item "C:\Users\leifk\OneDrive\Desktop\PythonCode\CURSOR\uw-workbench" "C:\Projects\uw-workbench"

# Update your IDE/editor workspace
# Update any shortcuts or scripts
```

**Pros:** 
- Complete separation from cloud sync
- Faster performance (no OneDrive overhead)
- Clear separation of concerns

**Cons:**
- Need to manage backups manually
- Won't sync code across devices

---

## 🎯 Recommended Approach

**For Development (Local Machine):**
1. Move entire project to `C:\Projects\uw-workbench`
2. Use Git for code synchronization (not OneDrive)
3. Keep sensitive data local only
4. Use manual backups for databases

**For Production (Server):**
1. Store code in `/var/www/` or `/opt/`
2. Store data in `/var/lib/uw-workbench/`
3. Store .env in `/etc/uw-workbench/`
4. Use environment variables (not .env files)
5. Regular encrypted backups

---

## 📁 Recommended Directory Structure

### Development:
```
C:\Projects\uw-workbench\           ← Code (backed up by Git)
├── backend\
├── frontend\
├── .git\
└── .gitignore

C:\PrivateData\uw-workbench\        ← Data (local only, manual backups)
├── .env
├── databases\
│   └── workbench.db
├── logs\
└── uploads\
```

### Production:
```
/opt/uw-workbench/                  ← Code
├── backend\
├── frontend\
└── .git\

/var/lib/uw-workbench/              ← Data
├── databases\
│   └── workbench.db
└── uploads\

/etc/uw-workbench/                  ← Config
└── .env

/var/log/uw-workbench/              ← Logs
└── app.log
```

---

## 🔐 Additional Security Measures

### 1. Encrypt Sensitive Files
```powershell
# Windows: Use BitLocker or EFS
cipher /e C:\PrivateData

# Or use third-party encryption (VeraCrypt, etc.)
```

### 2. Regular Backups
```powershell
# Backup script (run weekly)
$source = "C:\PrivateData\uw-workbench"
$destination = "D:\Backups\uw-workbench-$(Get-Date -Format 'yyyy-MM-dd')"
Copy-Item -Recurse $source $destination

# Encrypt backup
Compress-Archive -Path $destination -DestinationPath "$destination.zip" -CompressionLevel Optimal
```

### 3. Audit Cloud Sync Status
```powershell
# Check what's being synced
Get-ChildItem "C:\Users\leifk\OneDrive" -Recurse -File |
    Where-Object { $_.Name -match '\.(env|db|log)$' } |
    Select-Object FullName, Length, LastWriteTime
```

### 4. Monitor for Sensitive Data
```powershell
# Scan for potential secrets in OneDrive
Get-ChildItem "C:\Users\leifk\OneDrive" -Recurse -File |
    Select-String -Pattern "(api[_-]?key|password|secret|token)" -CaseSensitive:$false |
    Group-Object Path |
    Select-Object Name, Count
```

---

## ✅ Security Checklist

Before considering your setup secure:

- [ ] Identified all sensitive data locations
- [ ] Moved sensitive data outside cloud sync folders
- [ ] Updated application configuration for new paths
- [ ] Tested application with new paths
- [ ] Verified no .env files in OneDrive
- [ ] Verified no database files in OneDrive
- [ ] Verified no log files with sensitive data in OneDrive
- [ ] Set up local backup strategy
- [ ] Documented new file locations for team
- [ ] Updated .gitignore for new structure
- [ ] Encrypted sensitive data directory
- [ ] Set restrictive file permissions
- [ ] Tested disaster recovery (restore from backup)

---

## 🚨 If Data Already Synced to Cloud

**If sensitive data was already synced to OneDrive:**

1. **Immediately rotate all secrets:**
   - Generate new OpenAI API key
   - Change ADMIN_PASSWORD
   - Update any other credentials

2. **Delete from OneDrive:**
   - Go to OneDrive.com
   - Delete files from cloud
   - Empty recycle bin
   - Wait 90 days for permanent deletion

3. **Review OneDrive version history:**
   - Old versions may still contain secrets
   - Manually delete all versions

4. **Contact IT/Security if corporate:**
   - Corporate OneDrive may have retention policies
   - May need IT admin to purge data

---

## 📞 Support

For questions about this configuration:
- See README.md for general setup
- See SECURITY.md for security best practices
- Contact DevOps team for production deployments

---

**Last Updated:** December 11, 2024

