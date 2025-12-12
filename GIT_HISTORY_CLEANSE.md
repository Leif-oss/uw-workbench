# Git History Cleansing Guide

🚨 **CRITICAL:** This guide will help remove sensitive data from ALL Git history across ALL branches.

## ⚠️ WARNING

**This operation:**
- Rewrites Git history (changes all commit SHAs)
- Requires force push to GitHub
- Will break anyone else's local clones
- Cannot be undone after force push
- Must be coordinated with entire team

**Do NOT proceed** unless you understand the consequences!

---

## What We're Removing

Based on our audit, the following sensitive files were committed:

### Files to Remove from History:
1. `frontend/.env` - May contain API configurations
2. `frontend/.env.example` - Was committed before being ignored  
3. `backend/.env` - Contains API keys, passwords
4. `*.db` files - All database files with customer data
5. `*.log` files - Log files with potential sensitive info
6. `debug_extraction.log` - Document scrubber debug logs

---

## Prerequisites

### 1. Install BFG Repo-Cleaner (Recommended)
```powershell
# Using Chocolatey
choco install bfg-repo-cleaner

# Or download from: https://rtyley.github.io/bfg-repo-cleaner/
```

### 2. Or Use git-filter-repo (Alternative)
```powershell
pip install git-filter-repo
```

### 3. Backup Current Repository
```powershell
# Create backup
Copy-Item -Recurse C:\Projects\uw-workbench C:\Projects\uw-workbench-BACKUP

# Verify backup
if (Test-Path "C:\Projects\uw-workbench-BACKUP\.git") {
    Write-Host "Backup created successfully"
}
```

---

## Option 1: Using BFG Repo-Cleaner (RECOMMENDED - Fastest)

### Step 1: Create a Fresh Clone
```powershell
cd C:\Projects
git clone --mirror https://github.com/Leif-oss/uw-workbench.git uw-workbench-cleanse.git
cd uw-workbench-cleanse.git
```

### Step 2: Remove Sensitive Files
```powershell
# Remove .env files
bfg --delete-files ".env"

# Remove database files
bfg --delete-files "*.db"

# Remove log files
bfg --delete-files "*.log"

# Remove specific files
bfg --delete-files "debug_extraction.log"
```

### Step 3: Clean Up
```powershell
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Step 4: Verify
```powershell
# Check what was removed
git log --all --pretty=format: --name-only --diff-filter=A | sort -u | findstr "\.env \.db \.log"

# Should return nothing if successful
```

### Step 5: Force Push to GitHub
```powershell
# ⚠️ THIS REWRITES HISTORY ON GITHUB! ⚠️
git push --force --all
git push --force --tags
```

---

## Option 2: Using git-filter-repo (More Control)

### Step 1: Create List of Files to Remove
```powershell
$filesToRemove = @(
    "frontend/.env",
    "frontend/.env.example",
    "backend/.env",
    "backend/uvicorn.err.log",
    "backend/uvicorn.out.log",
    "backend/uw_workbench.db",
    "backend/workbench.db",
    "workbench.db",
    "debug_extraction.log"
)

$filesToRemove | Out-File -FilePath "files-to-remove.txt" -Encoding UTF8
```

### Step 2: Run filter-repo
```powershell
cd C:\Projects\uw-workbench

# Remove files from history
git filter-repo --invert-paths --paths-from-file files-to-remove.txt --force
```

### Step 3: Re-add Remote and Force Push
```powershell
# Add remote back (filter-repo removes it)
git remote add origin https://github.com/Leif-oss/uw-workbench.git

# Force push
git push --force --all
git push --force --tags
```

---

## Option 3: Manual Method (Slowest, Most Control)

### Using git filter-branch:
```powershell
cd C:\Projects\uw-workbench

# Remove specific files from all history
git filter-branch --force --index-filter `
  "git rm --cached --ignore-unmatch frontend/.env backend/.env *.db *.log" `
  --prune-empty --tag-name-filter cat -- --all

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push --force --all
git push --force --tags
```

---

## Post-Cleanse Steps

### 1. Verify Cleanse Was Successful
```powershell
cd C:\Projects\uw-workbench

# Check for any remaining sensitive files in history
git log --all --full-history --pretty=format: --name-only | sort -u | findstr "\.env \.db \.log"

# Should return nothing
```

### 2. Re-clone Repository
```powershell
# Delete old working copy
cd C:\Projects
Remove-Item -Recurse -Force uw-workbench

# Clone fresh copy
git clone https://github.com/Leif-oss/uw-workbench.git
cd uw-workbench

# Checkout your branch
git checkout workbench-features
```

### 3. Restore Private Data
```powershell
# Restore .env from backup
Copy-Item "C:\Projects\uw-workbench-BACKUP\private\.env" "private\.env"

# Restore databases from backup
Copy-Item "C:\Projects\uw-workbench-BACKUP\private\databases\*" "private\databases\"
```

### 4. Verify Application Still Works
```powershell
# Start backend
cd C:\Projects\uw-workbench
python -m uvicorn backend.main:app --reload --port 8000

# Start frontend (in new terminal)
cd C:\Projects\uw-workbench\frontend
npm run dev

# Test at http://localhost:5173
```

---

## Rotate All Secrets (REQUIRED!)

Even after cleansing, old secrets may have been exposed. **You MUST rotate:**

### 1. OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Delete old key
3. Create new key
4. Update `private/.env`:
   ```
   AI_API_KEY=sk-new-key-here
   ```

### 2. Admin Password
1. Generate new strong password
2. Update `private/.env`:
   ```
   ADMIN_PASSWORD=new-secure-password-here
   ```

### 3. Database Password (if using PostgreSQL/MySQL)
1. Change database password on server
2. Update `private/.env`:
   ```
   DATABASE_URL=postgresql://user:NEW_PASSWORD@host/db
   ```

---

## Notify Team

After force pushing, notify everyone:

```
⚠️ GIT HISTORY REWRITTEN ⚠️

The repository history has been rewritten to remove sensitive data.

ACTION REQUIRED:
1. Delete your local clone
2. Re-clone from GitHub
3. Set up private/.env from template
4. All commit SHAs have changed

Old clones will not work with the remote!
```

---

## Verification Checklist

After cleansing, verify:

- [ ] No .env files in `git log --all --full-history`
- [ ] No .db files in `git log --all --full-history`  
- [ ] No .log files in `git log --all --full-history`
- [ ] All secrets rotated (new API keys, passwords)
- [ ] Application works from fresh clone
- [ ] Team notified about history rewrite
- [ ] Old backup can be deleted (after 30 days)

---

## If Something Goes Wrong

### Restore from Backup:
```powershell
# Stop servers
taskkill /F /IM python.exe /IM node.exe

# Delete corrupted repo
cd C:\Projects
Remove-Item -Recurse -Force uw-workbench

# Restore backup
Copy-Item -Recurse uw-workbench-BACKUP uw-workbench

# Verify
cd uw-workbench
git status
```

### Contact for Help:
- GitHub Support: https://support.github.com
- BFG Issues: https://github.com/rtyley/bfg-repo-cleaner/issues
- Git Filter-Repo: https://github.com/newren/git-filter-repo

---

## Alternative: Start Fresh Repository

If history cleansing is too risky, consider:

### Option: Create New Repository
```powershell
# 1. Archive old repo on GitHub (Settings -> Archive)

# 2. Create fresh repo with current code
cd C:\Projects\uw-workbench
Remove-Item -Recurse -Force .git

# 3. Initialize fresh Git
git init
git add .
git commit -m "Initial commit - Clean history"

# 4. Push to new GitHub repo
git remote add origin https://github.com/Leif-oss/uw-workbench-v2.git
git push -u origin main
```

**Pros:** No risk of mistakes, clean slate  
**Cons:** Lose all commit history, issues, PRs

---

**IMPORTANT:** Test thoroughly before considering the migration complete!

**Last Updated:** December 11, 2024

