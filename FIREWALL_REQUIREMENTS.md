# Firewall & Network Requirements for Development

## Required Access for Building This App

### ✅ Already Listed (Confirmed Needed)

1. **Cursor (coding tool)**
   - IDE/editor access
   - AI coding assistance
   - File system access

2. **GitHub Access**
   - Git operations (clone, push, pull)
   - Repository access
   - **Ports:** 443 (HTTPS) or 22 (SSH)

3. **PowerShell Commands**
   - Local script execution
   - Process management
   - File operations
   - **No external access needed** (local only)

4. **Node.js / npm**
   - Package installation
   - **Outbound:** npm registry (registry.npmjs.org)
   - **Ports:** 443 (HTTPS)
   - **Domains:** npmjs.com, nodejs.org

5. **Python / FastAPI**
   - Package installation
   - **Outbound:** PyPI (pypi.org)
   - **Ports:** 443 (HTTPS)
   - **Domains:** pypi.org, python.org

6. **Localhost Access**
   - Backend: `127.0.0.1:8000`
   - Frontend: `127.0.0.1:5173` or `localhost:5173`
   - **No firewall rules needed** (local loopback)

7. **Outbound Rules for Installs**
   - npm install (npm registry)
   - pip install (PyPI)
   - **Ports:** 443 (HTTPS), 80 (HTTP fallback)

---

## Additional Requirements (Not Yet Listed)

### 8. **OpenAI API Access** ⚠️ CRITICAL
**Why:** The app uses OpenAI for:
- Document extraction (document scrubber)
- AI chat assistant
- Field extraction from documents

**Required Access:**
- **Domain:** `api.openai.com`
- **Port:** 443 (HTTPS)
- **Endpoints:**
  - `https://api.openai.com/v1/chat/completions`
  - `https://api.openai.com/v1/models`

**What Happens Without It:**
- Document scrubber won't extract fields
- AI assistant won't work
- App will still run, but AI features will fail

**Alternative:** Can disable AI features if blocked, but core functionality will be limited

---

### 9. **Package Registry Access**

#### npm Registry
- **Domain:** `registry.npmjs.org`
- **Port:** 443
- **For:** Installing React, TypeScript, Vite, and other frontend packages

#### PyPI (Python Package Index)
- **Domain:** `pypi.org`, `files.pythonhosted.org`
- **Port:** 443
- **For:** Installing FastAPI, SQLAlchemy, pandas, and other backend packages

#### Additional CDNs (for npm packages)
- `cdn.jsdelivr.net` - Some packages use this
- `unpkg.com` - Some packages use this
- `cdnjs.cloudflare.com` - Some packages use this

---

### 10. **Git Operations**

#### GitHub (if using HTTPS)
- **Domain:** `github.com`
- **Port:** 443
- **For:** Clone, push, pull operations

#### GitHub (if using SSH)
- **Domain:** `github.com`
- **Port:** 22
- **For:** SSH-based Git operations

#### Git LFS (if used)
- **Domain:** `github.com`
- **Port:** 443
- **For:** Large file storage

---

### 11. **Development Tools Access**

#### TypeScript/ESLint (if using online tools)
- Usually local, but some tools may check online
- **Not critical** - can work offline

#### Python Package Managers
- **pip** - Uses PyPI
- **uv** (if used) - Uses PyPI
- **conda** (if used) - Uses Anaconda repositories

---

### 12. **Optional: Documentation Access**

#### Online Documentation (helpful but not required)
- `fastapi.tiangolo.com` - FastAPI docs
- `react.dev` - React docs
- `docs.python.org` - Python docs
- `developer.mozilla.org` - Web APIs
- `stackoverflow.com` - Problem solving

**Status:** Nice to have, but not required for building

---

## Port Requirements Summary

### Inbound (Localhost Only - No Firewall Rules Needed)
- **8000** - FastAPI backend (local only)
- **5173** - Vite frontend dev server (local only)

### Outbound (Required)
- **443 (HTTPS)** - All external services
- **80 (HTTP)** - Fallback for some package managers
- **22 (SSH)** - If using SSH for Git

---

## Domain Whitelist Recommendations

### Critical (App Won't Work Without)
```
api.openai.com              # OpenAI API
registry.npmjs.org          # npm packages
pypi.org                    # Python packages
files.pythonhosted.org     # Python package downloads
github.com                  # Git repository
```

### Important (Development Tools)
```
npmjs.com                   # npm website/docs
nodejs.org                  # Node.js downloads
python.org                  # Python downloads
```

### Optional (Nice to Have)
```
cdn.jsdelivr.net            # Some npm package CDNs
unpkg.com                   # Some npm package CDNs
cdnjs.cloudflare.com        # Some npm package CDNs
fastapi.tiangolo.com        # Documentation
react.dev                   # Documentation
```

---

## What Works Offline / Behind Firewall

### ✅ Will Work Offline (Once Installed)
- Running the app (localhost)
- Editing code
- Git operations (local commits)
- Database operations (SQLite)
- File processing (local files)
- Most app functionality

### ❌ Won't Work Offline
- Installing new packages (npm install, pip install)
- Pushing/pulling from GitHub
- OpenAI API calls (document extraction, AI assistant)
- Downloading dependencies
- Updating packages

---

## Firewall Configuration Recommendations

### Minimum Required Rules

1. **Allow HTTPS (443) to:**
   - `api.openai.com`
   - `registry.npmjs.org`
   - `pypi.org`
   - `files.pythonhosted.org`
   - `github.com`

2. **Allow HTTP (80) to:**
   - `pypi.org` (fallback)
   - `registry.npmjs.org` (fallback)

3. **Allow SSH (22) to:**
   - `github.com` (if using SSH for Git)

4. **Allow Localhost:**
   - Ports 8000, 5173 (usually allowed by default)

### Recommended: Allow All HTTPS
If possible, allow all outbound HTTPS (443) traffic. This is the safest approach and covers:
- All package registries
- All API services
- All documentation sites
- Future dependencies

---

## Testing Checklist

After firewall configuration, test:

- [ ] `npm install` works (test with a new package)
- [ ] `pip install` works (test with a new package)
- [ ] `git push/pull` works
- [ ] OpenAI API calls work (test document scrubber)
- [ ] Backend starts on port 8000
- [ ] Frontend starts on port 5173
- [ ] App loads in browser
- [ ] Data loads from database

---

## Workarounds if Blocked

### If OpenAI is Blocked:
- **Option 1:** Use VPN or proxy
- **Option 2:** Disable AI features (app still works for CRM/production tracking)
- **Option 3:** Use corporate proxy if available

### If Package Registries are Blocked:
- **Option 1:** Use corporate npm/PyPI mirror
- **Option 2:** Download packages manually
- **Option 3:** Use offline package cache
- **Option 4:** Work from home/unrestricted network

### If GitHub is Blocked:
- **Option 1:** Use corporate Git server
- **Option 2:** Use VPN
- **Option 3:** Work offline, sync later

---

## Corporate IT Request Template

**Subject:** Firewall Access Request for Development Environment

**Request:**
I need outbound HTTPS access for the following domains to develop an internal application:

**Critical:**
- api.openai.com (OpenAI API for document processing)
- registry.npmjs.org (JavaScript package registry)
- pypi.org (Python package registry)
- github.com (Version control)

**Ports:** 443 (HTTPS), 22 (SSH for Git)

**Purpose:** Local development of internal underwriting management application

**Security Notes:**
- All traffic is outbound only
- No inbound ports required
- Application runs entirely on localhost
- No data leaves the corporate network (except API calls to OpenAI)

---

## Summary

### Your List (All Correct ✅)
1. ✅ Cursor
2. ✅ GitHub access
3. ✅ PowerShell commands
4. ✅ Node.js / npm
5. ✅ Python / FastAPI
6. ✅ Localhost access
7. ✅ Outbound rules for installs

### Additional Requirements
8. ⚠️ **OpenAI API access** (api.openai.com) - **CRITICAL for AI features**
9. Package registry domains (npmjs.org, pypi.org)
10. Git operations (github.com)

### Total Requirements
- **Outbound HTTPS (443)** to: OpenAI, npm, PyPI, GitHub
- **Outbound SSH (22)** to: GitHub (if using SSH)
- **Localhost ports:** 8000, 5173 (usually no firewall rules needed)

**Most Important Addition:** OpenAI API access - without it, the document scrubber and AI assistant won't work.

