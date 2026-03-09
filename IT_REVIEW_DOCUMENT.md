# Underwriter Workbench - IT Review Document

**Document Version:** 1.0  
**Last Updated:** 2024  
**Prepared For:** IT Security & Infrastructure Review  
**Application:** Underwriter Workbench - Insurance CRM & Document Processing System

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Application Overview](#application-overview)
3. [Local Development Environment](#local-development-environment)
4. [Cloud Production Environment](#cloud-production-environment)
5. [Architecture & Data Flow](#architecture--data-flow)
6. [Security Architecture](#security-architecture)
7. [Deployment Process](#deployment-process)
8. [Database Management](#database-management)
9. [Monitoring & Logging](#monitoring--logging)
10. [Backup & Disaster Recovery](#backup--disaster-recovery)
11. [Cost Analysis](#cost-analysis)
12. [Access & Authentication](#access--authentication)
13. [Dependencies & Technology Stack](#dependencies--technology-stack)
14. [Configuration Management](#configuration-management)
15. [Risk Assessment](#risk-assessment)
16. [Recommendations](#recommendations)

---

## Executive Summary

### Application Purpose
The Underwriter Workbench is a comprehensive web application for insurance underwriting management, featuring:
- **CRM System**: Agency, contact, and employee management
- **Document Processing**: AI-powered document data extraction
- **Production Tracking**: Excel-based production data import and analytics
- **AI Assistant**: Research and analysis tools powered by OpenAI GPT models

### Deployment Status
- **Local Environment**: Fully operational for development
- **Cloud Environment**: Deployed on Google Cloud Platform (GCP)
- **Status**: Production-ready with automated deployment pipeline

### Key Technologies
- **Backend**: FastAPI (Python 3.11+)
- **Frontend**: React 18+ with TypeScript
- **Database**: PostgreSQL (local via Docker, cloud via Cloud SQL)
- **Cloud Platform**: Google Cloud Platform (Cloud Run, Cloud SQL, Secret Manager)
- **AI Integration**: OpenAI API (GPT-4o, GPT-5 with fallback)

---

## Application Overview

### Core Features

#### 1. CRM System
- **Agencies**: Manage insurance agencies with production tracking
- **Contacts**: Contact management with interaction logging
- **Offices**: Regional office management
- **Employees**: Underwriter and staff management
- **Logs**: Interaction history (calls, meetings, notes)
- **Tasks**: Follow-up task tracking

#### 2. Document Scrubber
- AI-powered extraction from PDF, DOCX, Excel, TXT files
- Automatic field mapping for underwriting submissions
- Export to CSV, JSON, TXT formats
- Manual data entry and verification

#### 3. Production Tracking
- Multi-sheet Excel import for monthly production data
- YTD/PYTD comparisons
- Tabbed production graphs (All Lines, Standard Lines, Surplus Lines)
- Metrics: Bound, Quoted, Declined, Hit Ratio, Loss Ratio

#### 4. AI Assistant
- Property analysis and location-specific intelligence
- Agency research from websites
- Ownership research
- Business hazard research
- ChatGPT-style conversation interface

#### 5. Admin Functions
- User management (create/edit employees, assign to offices)
- Data management (clear production data, manage agencies)
- System configuration

### User Roles
- **Admin**: Full system access
- **Underwriter**: Office-scoped access (view all, modify own office)
- **Manager**: Office management capabilities
- **Read-Only**: View-only access

---

## Local Development Environment

### Infrastructure Components

#### 1. Database (PostgreSQL)
- **Type**: PostgreSQL 15 (Alpine Linux)
- **Container**: Docker Compose
- **Container Name**: `uw-workbench-postgres`
- **Port**: 5432 (mapped to host)
- **Credentials**:
  - User: `uw_workbench`
  - Password: `dev_password_change_me`
  - Database: `uw_workbench`
- **Data Persistence**: Docker volume `postgres_data`
- **Location**: `docker-compose.yml`

#### 2. Backend (FastAPI)
- **Framework**: FastAPI (Python 3.11+)
- **Port**: 8000
- **URL**: `http://127.0.0.1:8000`
- **API Docs**: `http://127.0.0.1:8000/docs` (Swagger UI)
- **Startup Script**: `start_backend.ps1`
- **Virtual Environment**: `.venv/` (Python virtual environment)
- **Dependencies**: `backend/requirements.txt`

#### 3. Frontend (React)
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Port**: 5173
- **URL**: `http://localhost:5173`
- **Startup Script**: `start_frontend.ps1`
- **Dependencies**: `frontend/package.json`

### Local Setup Process

#### Prerequisites
1. **Python 3.11+** installed
2. **Node.js 18+** installed
3. **Docker Desktop** installed and running
4. **OpenAI API Key** (for AI features)

#### Initial Setup Steps

1. **Start PostgreSQL Database**:
   ```powershell
   docker-compose up -d
   ```
   - Creates PostgreSQL container
   - Initializes database with schema
   - Data persists in Docker volume

2. **Backend Setup**:
   ```powershell
   # Create virtual environment
   python -m venv .venv
   
   # Activate virtual environment (Windows)
   .venv\Scripts\Activate.ps1
   
   # Install dependencies
   pip install -r backend/requirements.txt
   
   # Configure environment
   # Create backend/.env with:
   # DATABASE_URL=postgresql://uw_workbench:dev_password_change_me@localhost:5432/uw_workbench
   # AI_API_KEY=sk-your-key-here
   # CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
   # ENVIRONMENT=development
   
   # Run database migrations
   alembic upgrade head
   
   # Start backend
   .\start_backend.ps1
   ```

3. **Frontend Setup**:
   ```powershell
   cd frontend
   npm install
   
   # Configure environment
   # Create frontend/.env with:
   # VITE_API_URL=http://127.0.0.1:8000
   
   # Start frontend
   .\start_frontend.ps1
   ```

### Local Environment Variables

#### Backend (`backend/.env`)
```env
# Database (REQUIRED)
DATABASE_URL=postgresql://uw_workbench:dev_password_change_me@localhost:5432/uw_workbench

# OpenAI API (REQUIRED for AI features)
AI_API_KEY=sk-your-key-here
AI_MODEL=gpt-4o

# CORS Configuration
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Environment
ENVIRONMENT=development
LOG_LEVEL=INFO

# Optional: SMTP (for email features)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@company.com
SMTP_FROM_NAME=Underwriter Workbench
```

#### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://127.0.0.1:8000
```

### Local Database Schema

Managed by **Alembic** migrations:
- **Location**: `backend/alembic/versions/`
- **Current Version**: Tracked in `alembic_version` table
- **Migrations**: Run automatically on backend startup

**Key Tables**:
- `offices`: Regional offices
- `employees`: Users/underwriters (1:1 with `users`)
- `users`: Authentication (username, password_hash, sessions)
- `agencies`: Insurance agencies
- `contacts`: Agency contacts
- `logs`: Interaction history
- `tasks`: Follow-up tasks
- `production`: Monthly production data
- `audit_log`: Audit trail (all CREATE/UPDATE/DELETE operations)
- `sessions`: User session tokens
- `password_reset_tokens`: Password reset tokens

### Local Development Workflow

1. **Start Services**:
   ```powershell
   # Terminal 1: Start PostgreSQL
   docker-compose up -d
   
   # Terminal 2: Start Backend
   .\start_backend.ps1
   
   # Terminal 3: Start Frontend
   .\start_frontend.ps1
   ```

2. **Development**:
   - Backend: Auto-reload on file changes (uvicorn --reload)
   - Frontend: Hot module replacement (Vite HMR)
   - Database: Direct connection to local PostgreSQL

3. **Testing**:
   - API: Swagger UI at `http://127.0.0.1:8000/docs`
   - Frontend: Browser at `http://localhost:5173`
   - Database: Direct SQL access via `docker exec -it uw-workbench-postgres psql -U uw_workbench -d uw_workbench`

### Local Security Considerations

- **Database Password**: Default `dev_password_change_me` (should be changed for production-like testing)
- **API Keys**: Stored in `.env` files (not committed to Git)
- **CORS**: Configured for localhost only
- **Authentication**: Database-backed sessions (not proxy headers in local mode)
- **No HTTPS**: HTTP only (acceptable for local development)

---

## Cloud Production Environment

### Google Cloud Platform (GCP) Infrastructure

#### 1. Cloud Run (Backend)
- **Service Name**: `uw-workbench-backend`
- **Region**: `us-central1`
- **URL**: `https://uw-workbench-backend-4szvavge6a-uc.a.run.app`
- **Platform**: Managed (serverless)
- **Container**: Docker image from `backend/Dockerfile`
- **Resources**:
  - Memory: 512 MiB
  - CPU: 1 vCPU
  - Timeout: 300 seconds
  - Max Instances: 10
  - Min Instances: 0 (cold starts possible)
- **Scaling**: Automatic based on traffic
- **Authentication**: Public (unauthenticated access)
- **CORS**: Configured for frontend URL

#### 2. Cloud Run (Frontend)
- **Service Name**: `uw-workbench-frontend`
- **Region**: `us-central1`
- **URL**: `https://uw-workbench-frontend-4szvavge6a-uc.a.run.app`
- **Platform**: Managed (serverless)
- **Container**: Docker image from `frontend/Dockerfile`
- **Resources**:
  - Memory: 256 MiB
  - CPU: 1 vCPU
- **Authentication**: Public (unauthenticated access)
- **Static Files**: Served via Nginx in container

#### 3. Cloud SQL (PostgreSQL)
- **Instance Name**: `uw-workbench-db`
- **Type**: PostgreSQL 15
- **Region**: `us-central1`
- **Connection Name**: `ultra-ace-481723-e6:us-central1:uw-workbench-db`
- **Tier**: db-f1-micro (1 vCPU, 0.6 GB RAM) - **Development tier**
- **Storage**: 10 GB SSD (auto-increment enabled)
- **Backups**: Automated daily backups (2:00 AM UTC)
- **Backup Retention**: 7 days
- **High Availability**: Not enabled (single zone)
- **Connection**: Via Unix socket from Cloud Run

#### 4. Secret Manager
- **Purpose**: Store sensitive configuration
- **Secrets**:
  - `ai-api-key`: OpenAI API key
  - `db-password`: PostgreSQL password
  - `smtp-host`: SMTP server hostname
  - `smtp-port`: SMTP port
  - `smtp-user`: SMTP username
  - `smtp-password`: SMTP password
  - `smtp-from-email`: SMTP from email
  - `smtp-from-name`: SMTP from name

#### 5. Cloud Build
- **Purpose**: CI/CD pipeline
- **Configuration**: `cloudbuild.yaml`
- **Triggers**: Manual (via `gcloud builds submit`)
- **Steps**:
  1. Build backend Docker image
  2. Push to Container Registry
  3. Deploy backend to Cloud Run
  4. Get backend URL
  5. Build frontend Docker image (with backend URL)
  6. Push to Container Registry
  7. Deploy frontend to Cloud Run
  8. Update backend CORS with frontend URL

#### 6. Cloud Scheduler
- **Purpose**: Keep backend warm (prevent cold starts)
- **Job Name**: `keep-backend-warm`
- **Schedule**: Every 5 minutes (`*/5 * * * *`)
- **Target**: HTTP GET to `/health` endpoint
- **Cost**: ~$0.10/month (negligible)

### Cloud Environment Variables

#### Backend (Cloud Run)
```env
# Environment
ENVIRONMENT=production
TEMP_SETUP_MODE=true  # Allows /admin/setup-admin endpoint

# Database (Cloud SQL)
DB_USER=postgres
DB_NAME=uw_workbench
CLOUD_SQL_CONNECTION_NAME=ultra-ace-481723-e6:us-central1:uw-workbench-db

# CORS (set dynamically after frontend deployment)
CORS_ORIGINS=https://uw-workbench-frontend-4szvavge6a-uc.a.run.app

# Secrets (from Secret Manager)
AI_API_KEY=<from Secret Manager>
DB_PASSWORD=<from Secret Manager>
SMTP_HOST=<from Secret Manager>
SMTP_PORT=<from Secret Manager>
SMTP_USER=<from Secret Manager>
SMTP_PASSWORD=<from Secret Manager>
SMTP_FROM_EMAIL=<from Secret Manager>
SMTP_FROM_NAME=<from Secret Manager>
```

#### Frontend (Cloud Run)
```env
ENVIRONMENT=production
VITE_API_URL=https://uw-workbench-backend-4szvavge6a-uc.a.run.app
```

### Cloud Database Connection

**Connection Method**: Unix socket via Cloud SQL Proxy
- **Path**: `/cloudsql/ultra-ace-481723-e6:us-central1:uw-workbench-db`
- **Driver**: `psycopg2` (PostgreSQL adapter)
- **Connection String**: Constructed from environment variables
- **Authentication**: Password-based (stored in Secret Manager)

**Connection Flow**:
1. Cloud Run service has Cloud SQL connection configured
2. Cloud SQL Proxy automatically handles socket connection
3. Backend connects using `postgresql+psycopg2://` URL
4. Password retrieved from Secret Manager

### Cloud Deployment Process

#### Automated Deployment (Recommended)
```powershell
.\scripts\deploy_with_backup.ps1
```

This script:
1. Runs pre-deployment checks
2. Creates database backup
3. Triggers Cloud Build
4. Monitors deployment
5. Verifies deployment
6. Provides rollback instructions

#### Manual Deployment
```powershell
# 1. Pre-deployment checks
.\scripts\pre_deployment_check.ps1

# 2. Create backup
.\scripts\backup_database.ps1

# 3. Deploy via Cloud Build
gcloud builds submit --config cloudbuild.yaml

# 4. Verify deployment
# Check backend: https://uw-workbench-backend-4szvavge6a-uc.a.run.app/health
# Check frontend: https://uw-workbench-frontend-4szvavge6a-uc.a.run.app
```

### Cloud Security Configuration

#### Network Security
- **Cloud Run**: Public HTTPS endpoints
- **Cloud SQL**: Private IP (not publicly accessible)
- **Firewall**: Cloud SQL only accessible from Cloud Run
- **SSL/TLS**: Enforced for all connections

#### Authentication & Authorization
- **Application-Level**: Database-backed user authentication
- **Session Management**: Database-backed sessions (24-hour expiry)
- **Password Security**: bcrypt hashing (10 rounds)
- **Account Lockout**: 5 failed attempts = 30-minute lockout
- **Password Requirements**: 8+ chars, uppercase, lowercase, number

#### Secret Management
- **Storage**: Google Secret Manager
- **Access**: Cloud Run service account has access
- **Rotation**: Manual (update secret, redeploy service)
- **Audit**: Secret access logged in Cloud Audit Logs

#### CORS Configuration
- **Production**: Only frontend URL allowed
- **Development**: localhost origins allowed
- **Headers**: All headers allowed (for authentication)

---

## Architecture & Data Flow

### System Architecture

```
┌─────────────────┐
│   Web Browser   │
│  (User Client)  │
└────────┬────────┘
         │ HTTPS
         │
┌────────▼─────────────────────────────────────┐
│         Cloud Run (Frontend)                  │
│  - React SPA (Static Files)                  │
│  - Nginx Web Server                          │
│  - URL: frontend-4szvavge6a-uc.a.run.app     │
└────────┬─────────────────────────────────────┘
         │ HTTPS API Calls
         │
┌────────▼─────────────────────────────────────┐
│         Cloud Run (Backend)                   │
│  - FastAPI Application                       │
│  - Python 3.11+                             │
│  - URL: backend-4szvavge6a-uc.a.run.app     │
└────────┬─────────────────────────────────────┘
         │ Unix Socket
         │
┌────────▼─────────────────────────────────────┐
│         Cloud SQL (PostgreSQL)                │
│  - Database: uw_workbench                   │
│  - User: postgres                            │
│  - Connection: Unix socket                   │
└──────────────────────────────────────────────┘

External Services:
┌─────────────────┐
│   OpenAI API    │
│  (AI Features)  │
└─────────────────┘
```

### Request Flow

1. **User Request**:
   - User accesses frontend URL in browser
   - Frontend serves React SPA (static files)

2. **API Request**:
   - Frontend makes API call to backend
   - Request includes authentication token (Bearer token)
   - CORS preflight check (if needed)

3. **Backend Processing**:
   - FastAPI receives request
   - CORS middleware validates origin
   - Authentication middleware validates token
   - Authorization checks user permissions
   - Business logic processes request
   - Database query/update via SQLAlchemy ORM

4. **Database Operation**:
   - SQLAlchemy generates SQL
   - Connection via Cloud SQL Proxy (Unix socket)
   - PostgreSQL executes query
   - Results returned to backend

5. **Response**:
   - Backend formats response (Pydantic schema)
   - Audit log entry created (if modification)
   - Response sent to frontend
   - Frontend updates UI

### Data Flow Examples

#### Login Flow
1. User submits credentials (username/password)
2. Backend queries `users` table
3. Password verified (bcrypt)
4. Session created in `sessions` table
5. Token returned to frontend
6. Frontend stores token (localStorage)
7. Subsequent requests include token in Authorization header

#### Document Processing Flow
1. User uploads document (PDF/DOCX/Excel)
2. Frontend sends file to `/document-scrubber/upload`
3. Backend saves file temporarily
4. Backend calls OpenAI API with document content
5. OpenAI returns extracted data
6. Backend processes and structures data
7. Response sent to frontend
8. User can edit/verify data
9. User exports to CSV/JSON/TXT

#### Production Data Import Flow
1. User uploads Excel file
2. Backend parses Excel (multiple sheets)
3. Backend validates data
4. Backend creates/updates agencies
5. Backend creates production records
6. Audit log entries created
7. Response with summary sent to frontend

---

## Security Architecture

### Authentication

#### Local Development
- **Method**: Database-backed username/password
- **Sessions**: Stored in `sessions` table
- **Token**: Bearer token (32-byte URL-safe string)
- **Expiry**: 24 hours
- **Dev Mode**: Falls back to first user if no authentication

#### Cloud Production
- **Method**: Database-backed username/password
- **Sessions**: Stored in `sessions` table
- **Token**: Bearer token (32-byte URL-safe string)
- **Expiry**: 24 hours
- **No SSO**: Currently no SSO integration (planned)

### Authorization

#### Role-Based Access Control (RBAC)
- **Admin**: Full system access
- **Underwriter**: Office-scoped access
- **Manager**: Office management
- **Read-Only**: View-only access

#### Office Scoping
- Users can **view** all data
- Users can **modify** only their office's data
- Admins can modify all data

### Password Security

- **Hashing**: bcrypt (10 rounds)
- **Requirements**: 8+ chars, uppercase, lowercase, number
- **Lockout**: 5 failed attempts = 30-minute lockout
- **Reset**: Token-based password reset (24-hour expiry)
- **Change**: Forced password change on first login (if `must_change_password` flag set)

### Data Protection

#### Encryption
- **In Transit**: HTTPS/TLS (enforced by Cloud Run)
- **At Rest**: Cloud SQL encryption (Google-managed)
- **Secrets**: Encrypted in Secret Manager

#### Audit Logging
- **All CREATE/UPDATE/DELETE operations** logged
- **Table**: `audit_log`
- **Fields**: timestamp, actor_email, action, entity_type, entity_id, details_json, IP address, user agent
- **Retention**: Indefinite (no automatic cleanup)

### Network Security

#### Firewall Rules
- **Cloud SQL**: Only accessible from Cloud Run (no public IP)
- **Cloud Run**: Public HTTPS endpoints
- **No VPN Required**: Public access (authentication at application level)

#### CORS
- **Production**: Only frontend URL allowed
- **Development**: localhost origins allowed
- **Headers**: All headers allowed

### Vulnerability Management

#### Dependencies
- **Python**: `requirements.txt` with pinned versions
- **Node.js**: `package.json` with version ranges
- **Updates**: Manual (no automated dependency updates)

#### Security Headers
- **CORS**: Configured
- **HTTPS**: Enforced by Cloud Run
- **No HSTS**: Not explicitly configured (Cloud Run handles)
- **No CSP**: Content Security Policy not configured

---

## Deployment Process

### Pre-Deployment Checklist

1. **Code Review**: All changes reviewed
2. **Testing**: Local testing completed
3. **Migrations**: Database migrations tested
4. **Secrets**: All secrets updated in Secret Manager (if needed)
5. **Backup**: Database backup created
6. **Documentation**: Changes documented

### Deployment Steps

#### Step 1: Pre-Deployment Checks
```powershell
.\scripts\pre_deployment_check.ps1
```
Checks:
- Environment and tools (gcloud, git)
- No hardcoded secrets
- No hardcoded localhost URLs
- Database migrations configured
- Environment variables set
- Build files exist

#### Step 2: Create Backup
```powershell
.\scripts\backup_database.ps1
```
Creates:
- Cloud SQL automated backup
- Optional SQL export to Cloud Storage

#### Step 3: Deploy
```powershell
gcloud builds submit --config cloudbuild.yaml
```

**Cloud Build Process**:
1. Build backend Docker image
2. Push to Container Registry
3. Deploy backend to Cloud Run
4. Get backend URL
5. Build frontend Docker image (with backend URL)
6. Push to Container Registry
7. Deploy frontend to Cloud Run
8. Update backend CORS with frontend URL

#### Step 4: Verify Deployment
- Check backend health: `https://uw-workbench-backend-4szvavge6a-uc.a.run.app/health`
- Test frontend: `https://uw-workbench-frontend-4szvavge6a-uc.a.run.app`
- Review Cloud Run logs
- Test critical features

#### Step 5: Log Deployment
```powershell
.\scripts\deployment_log.ps1 -New
```

### Rollback Procedure

#### Quick Rollback (Code Only)
```powershell
.\scripts\rollback_deployment.ps1 -Revision PREVIOUS
```

#### Full Rollback (Code + Database)
```powershell
# 1. Rollback code
.\scripts\rollback_deployment.ps1 -Revision PREVIOUS

# 2. Restore database (if needed)
.\scripts\rollback_deployment.ps1 -RestoreDatabase -BackupId BACKUP_ID
```

### Database Migrations

#### Automatic Migrations
- **On Startup**: Backend runs Alembic migrations automatically
- **Location**: `backend/run_migrations.py`
- **Process**: Checks current revision, upgrades to head if needed
- **Logging**: Migration status logged to Cloud Run logs

#### Manual Migrations
```powershell
# Local
alembic upgrade head

# Cloud (via Cloud SQL Proxy)
gcloud sql connect uw-workbench-db --user=postgres
# Then run: alembic upgrade head
```

---

## Database Management

### Database Schema

#### Core Tables
- **offices**: Regional offices (id, code, name)
- **employees**: Users/underwriters (id, name, email, office_id, role)
- **users**: Authentication (id, username, email, password_hash, is_admin, employee_id)
- **agencies**: Insurance agencies (id, name, code, office_id, underwriter_id, active)
- **contacts**: Agency contacts (id, agency_id, name, email, phone, title, notes)
- **logs**: Interaction history (id, agency_id, contact_id, employee_id, action, notes, date)
- **tasks**: Follow-up tasks (id, agency_id, employee_id, description, due_date, status)
- **production**: Monthly production data (id, agency_id, month, year, ytd_wp, pytd_wp, etc.)

#### System Tables
- **sessions**: User session tokens (id, token, user_id, created_at, expires_at, is_active)
- **password_reset_tokens**: Password reset tokens (id, user_id, token, expires_at)
- **audit_log**: Audit trail (id, timestamp, actor_email, action, entity_type, entity_id, details_json, ip_address, user_agent)
- **alembic_version**: Migration version tracking

### Database Backups

#### Automated Backups
- **Schedule**: Daily at 2:00 AM UTC
- **Retention**: 7 days
- **Type**: Full backup (binary)
- **Location**: Cloud SQL managed storage
- **Point-in-Time Recovery**: Enabled (binary logging)

#### Manual Backups
```powershell
.\scripts\backup_database.ps1
```

#### Backup Verification
```powershell
.\scripts\verify_backup.ps1 [BACKUP_ID]
```

#### List Backups
```powershell
gcloud sql backups list --instance=uw-workbench-db
```

### Database Restore

#### From Automated Backup
```powershell
# List backups
gcloud sql backups list --instance=uw-workbench-db

# Restore (creates new instance or restores to existing)
gcloud sql backups restore BACKUP_ID --backup-instance=uw-workbench-db
```

#### From SQL Export
```powershell
# Import SQL file
gcloud sql import sql uw-workbench-db gs://bucket-name/backup.sql --database=uw_workbench
```

### Database Performance

#### Current Configuration
- **Tier**: db-f1-micro (1 vCPU, 0.6 GB RAM) - **Development tier**
- **Storage**: 10 GB SSD (auto-increment)
- **Connections**: Connection pooling (10 connections, 20 max overflow)
- **Query Optimization**: SQLAlchemy ORM with some N+1 query potential

#### Performance Considerations
- **No Read Replicas**: Single database instance
- **No Caching**: No Redis or caching layer
- **Pagination**: Not implemented (loads all records)
- **Indexes**: Basic indexes on foreign keys

---

## Monitoring & Logging

### Cloud Run Logs

#### Backend Logs
```powershell
gcloud run services logs read uw-workbench-backend --region=us-central1 --tail
```

#### Frontend Logs
```powershell
gcloud run services logs read uw-workbench-frontend --region=us-central1 --tail
```

#### Log Levels
- **INFO**: General application flow
- **WARNING**: Non-critical issues
- **ERROR**: Errors that don't stop execution
- **CRITICAL**: Critical errors

### Application Logging

#### Backend Logging
- **Framework**: Python `logging` module
- **Logger**: `uvicorn.error`
- **Format**: Standard Python logging format
- **Destination**: Cloud Run logs (Cloud Logging)

#### Frontend Logging
- **Framework**: Browser console
- **Level**: Development (verbose), Production (errors only)
- **Destination**: Browser console, Cloud Run logs (server-side)

### Health Checks

#### Backend Health Endpoint
- **URL**: `/health`
- **Method**: GET
- **Response**: `{"status": "healthy"}`
- **Used By**: Cloud Scheduler (keep warm), monitoring

#### Frontend Health
- **Static files**: Served by Nginx
- **No health endpoint**: Not needed (static files)

### Monitoring

#### Current Monitoring
- **Cloud Run Metrics**: Request count, latency, error rate
- **Cloud SQL Metrics**: CPU, memory, connections
- **Cloud Logging**: Application logs
- **No APM**: No Application Performance Monitoring tool

#### Recommended Monitoring
- **Error Tracking**: Sentry or similar
- **APM**: Google Cloud Monitoring or Datadog
- **Uptime Monitoring**: External service (Pingdom, UptimeRobot)
- **Alerting**: Cloud Monitoring alerts

---

## Backup & Disaster Recovery

### Backup Strategy

#### Database Backups
- **Automated**: Daily at 2:00 AM UTC
- **Retention**: 7 days
- **Type**: Full backup + binary logging (point-in-time recovery)
- **Manual**: Before every deployment

#### Code Backups
- **Version Control**: Git repository
- **Remote**: GitHub/GitLab (if configured)
- **Local**: Developer machines

#### Configuration Backups
- **Secrets**: Stored in Secret Manager (Google-managed)
- **Environment Variables**: Documented in deployment scripts
- **Database Schema**: Managed by Alembic migrations

### Disaster Recovery Plan

#### Database Failure
1. **Identify**: Check Cloud SQL status
2. **Restore**: Restore from most recent backup
3. **Verify**: Test application functionality
4. **Notify**: Notify users of potential data loss

#### Application Failure
1. **Identify**: Check Cloud Run status
2. **Rollback**: Rollback to previous revision
3. **Verify**: Test application functionality
4. **Investigate**: Review logs for root cause

#### Complete Failure
1. **Restore Database**: From backup
2. **Redeploy Application**: From Git repository
3. **Verify**: Full system test
4. **Document**: Document incident and recovery

### Recovery Time Objectives (RTO)
- **Database**: ~15 minutes (restore from backup)
- **Application**: ~5 minutes (rollback to previous revision)
- **Complete**: ~30 minutes (full restore and redeploy)

### Recovery Point Objectives (RPO)
- **Database**: 24 hours (daily backups)
- **Application**: Real-time (Git repository)
- **Configuration**: Real-time (Secret Manager)

---

## Cost Analysis

### Current Monthly Costs (Estimated)

#### Cloud Run (Backend)
- **Requests**: ~1,000 requests/day = ~30,000/month
- **CPU Time**: ~0.5 vCPU-hours/day = ~15 vCPU-hours/month
- **Memory**: 512 MiB
- **Cost**: ~$5-10/month (free tier covers most)

#### Cloud Run (Frontend)
- **Requests**: ~500 requests/day = ~15,000/month
- **CPU Time**: ~0.1 vCPU-hours/day = ~3 vCPU-hours/month
- **Memory**: 256 MiB
- **Cost**: ~$1-2/month (mostly free tier)

#### Cloud SQL (PostgreSQL)
- **Instance**: db-f1-micro (1 vCPU, 0.6 GB RAM)
- **Storage**: 10 GB SSD
- **Backups**: Included
- **Cost**: ~$7-10/month

#### Secret Manager
- **Secrets**: 7 secrets
- **Access**: ~1,000 accesses/month
- **Cost**: ~$0.10/month

#### Cloud Build
- **Builds**: ~4 builds/month
- **Build Time**: ~10 minutes/build
- **Cost**: ~$1-2/month

#### Cloud Scheduler
- **Jobs**: 1 job (every 5 minutes)
- **Executions**: ~8,640 executions/month
- **Cost**: ~$0.10/month

#### Cloud Storage (if used for backups)
- **Storage**: ~1 GB
- **Cost**: ~$0.02/month

#### Network Egress
- **Data Transfer**: ~10 GB/month
- **Cost**: ~$1-2/month

### Total Estimated Monthly Cost
- **Low Usage (50 users, 2 transactions/day)**: ~$15-25/month
- **Medium Usage (100 users, 10 transactions/day)**: ~$25-40/month
- **High Usage (200 users, 50 transactions/day)**: ~$40-60/month

### Cost Optimization Opportunities
1. **Cloud SQL**: Upgrade to db-g1-small for better performance (if needed)
2. **Cloud Run**: Set min-instances=1 to prevent cold starts (increases cost)
3. **Backups**: Reduce retention period (if acceptable)
4. **Storage**: Use Cloud Storage for large files (cheaper than Cloud SQL storage)

---

## Access & Authentication

### User Access

#### Local Development
- **URL**: `http://localhost:5173`
- **Authentication**: Database-backed (username/password)
- **Default Users**: Created via `/admin/setup-admin` or seed scripts
- **Dev Mode**: Falls back to first user if no authentication

#### Cloud Production
- **URL**: `https://uw-workbench-frontend-4szvavge6a-uc.a.run.app`
- **Authentication**: Database-backed (username/password)
- **Initial Setup**: `/admin/setup-admin` endpoint (requires setup token)
- **No SSO**: Currently no SSO integration

### Admin Access

#### Initial Admin Creation
1. **Endpoint**: `POST /admin/setup-admin`
2. **Requires**: Setup token (from `SETUP_TOKEN` environment variable)
3. **Default Token**: `CHANGE_THIS_IN_PRODUCTION` (should be changed)
4. **One-Time**: Only works if no admin users exist

#### Admin Functions
- Create/edit employees
- Assign employees to offices
- Manage agencies
- Clear production data
- View audit logs
- Reset user passwords

### API Access

#### Authentication
- **Method**: Bearer token (in Authorization header)
- **Token**: Obtained via `/auth/login` endpoint
- **Expiry**: 24 hours
- **Refresh**: Re-login required after expiry

#### API Documentation
- **Swagger UI**: `https://uw-workbench-backend-4szvavge6a-uc.a.run.app/docs`
- **ReDoc**: `https://uw-workbench-backend-4szvavge6a-uc.a.run.app/redoc`

### Database Access

#### Local Development
- **Connection**: Direct PostgreSQL connection
- **Credentials**: From `backend/.env` file
- **Tool**: `psql` or database client

#### Cloud Production
- **Connection**: Via Cloud SQL Proxy (Unix socket)
- **Credentials**: From Secret Manager
- **Access**: Only from Cloud Run (no public access)
- **Tool**: Cloud SQL Studio (web interface) or `gcloud sql connect`

---

## Dependencies & Technology Stack

### Backend Dependencies

#### Core Framework
- **FastAPI**: 0.104+ (Web framework)
- **Uvicorn**: 0.24+ (ASGI server)
- **Python**: 3.11+

#### Database
- **SQLAlchemy**: 2.0+ (ORM)
- **Alembic**: 1.12+ (Migrations)
- **psycopg2-binary**: 2.9+ (PostgreSQL adapter)

#### Authentication & Security
- **bcrypt**: 4.0+ (Password hashing)
- **python-jose**: 3.3+ (JWT - if needed)

#### AI Integration
- **openai**: 1.0+ (OpenAI API client)

#### File Processing
- **pandas**: 2.0+ (Data processing)
- **openpyxl**: 3.1+ (Excel files)
- **pdfplumber**: 0.9+ (PDF files)
- **python-docx**: 1.0+ (Word documents)

#### Utilities
- **python-dotenv**: 1.0+ (Environment variables)
- **pydantic**: 2.0+ (Data validation)

### Frontend Dependencies

#### Core Framework
- **React**: 18.2+
- **TypeScript**: 5.0+
- **Vite**: 5.0+ (Build tool)

#### Routing
- **react-router-dom**: 6.0+

#### HTTP Client
- **fetch API**: Native (no library)

#### Build Tools
- **Node.js**: 18+
- **npm**: 9+

### Infrastructure Dependencies

#### Containerization
- **Docker**: Latest
- **Docker Compose**: Latest

#### Cloud Services
- **Google Cloud Platform**: 
  - Cloud Run
  - Cloud SQL
  - Secret Manager
  - Cloud Build
  - Cloud Scheduler
  - Cloud Logging

#### External Services
- **OpenAI API**: GPT-4o, GPT-5 (with fallback)

---

## Configuration Management

### Environment Variables

#### Local Development
- **Backend**: `backend/.env` file
- **Frontend**: `frontend/.env` file
- **Git**: Excluded from version control (`.gitignore`)

#### Cloud Production
- **Backend**: Cloud Run environment variables + Secret Manager
- **Frontend**: Cloud Run environment variables (build-time)
- **Secrets**: Google Secret Manager

### Configuration Files

#### Backend
- `backend/.env`: Local environment variables
- `backend/alembic.ini`: Alembic migration configuration
- `backend/Dockerfile`: Container build configuration
- `backend/requirements.txt`: Python dependencies

#### Frontend
- `frontend/.env`: Local environment variables
- `frontend/Dockerfile`: Container build configuration
- `frontend/package.json`: Node.js dependencies
- `frontend/vite.config.ts`: Vite build configuration

#### Infrastructure
- `docker-compose.yml`: Local PostgreSQL setup
- `cloudbuild.yaml`: Cloud Build CI/CD configuration
- `app.yaml`: App Engine configuration (alternative)

### Secret Management

#### Local Development
- **Storage**: `.env` files (not committed to Git)
- **Access**: Direct file read
- **Security**: File system permissions

#### Cloud Production
- **Storage**: Google Secret Manager
- **Access**: Cloud Run service account
- **Security**: Encrypted at rest, IAM-controlled access
- **Rotation**: Manual (update secret, redeploy service)

### Configuration Changes

#### Local Development
1. Edit `.env` file
2. Restart service (backend/frontend)

#### Cloud Production
1. Update Secret Manager (if secret)
2. Update Cloud Run environment variables (if env var)
3. Redeploy service (to pick up changes)

---

## Risk Assessment

### High-Risk Areas

#### 1. Database Security
- **Risk**: Database password in Secret Manager (single point of failure)
- **Mitigation**: Regular password rotation, strong password policy
- **Recommendation**: Implement database user rotation

#### 2. API Key Security
- **Risk**: OpenAI API key in Secret Manager
- **Mitigation**: Secret Manager encryption, IAM access control
- **Recommendation**: Monitor API usage, set spending limits

#### 3. Public Access
- **Risk**: Cloud Run services are publicly accessible
- **Mitigation**: Application-level authentication
- **Recommendation**: Consider Cloud IAM authentication or VPN

#### 4. Cold Starts
- **Risk**: Cloud Run cold starts (5-10 seconds)
- **Mitigation**: Cloud Scheduler keep-warm job
- **Recommendation**: Set min-instances=1 (increases cost)

#### 5. Database Performance
- **Risk**: db-f1-micro is development tier (limited resources)
- **Mitigation**: Connection pooling, query optimization
- **Recommendation**: Monitor performance, upgrade if needed

### Medium-Risk Areas

#### 1. No Automated Testing
- **Risk**: Bugs may reach production
- **Mitigation**: Manual testing before deployment
- **Recommendation**: Implement automated test suite

#### 2. Limited Monitoring
- **Risk**: Issues may go undetected
- **Mitigation**: Cloud Run logs, manual monitoring
- **Recommendation**: Implement APM and alerting

#### 3. Single Database Instance
- **Risk**: No high availability
- **Mitigation**: Daily backups, point-in-time recovery
- **Recommendation**: Enable high availability (increases cost)

#### 4. No Rate Limiting
- **Risk**: API abuse possible
- **Mitigation**: Application-level validation
- **Recommendation**: Implement rate limiting

### Low-Risk Areas

#### 1. Dependency Updates
- **Risk**: Security vulnerabilities in dependencies
- **Mitigation**: Manual updates, version pinning
- **Recommendation**: Automated dependency scanning

#### 2. Log Retention
- **Risk**: Audit logs grow indefinitely
- **Mitigation**: Manual cleanup (if needed)
- **Recommendation**: Implement log retention policy

---

## Recommendations

### Immediate (Before Production Scale)

1. **Enable High Availability**
   - Enable Cloud SQL high availability
   - Set Cloud Run min-instances=1 (if acceptable cost)

2. **Implement Rate Limiting**
   - Add rate limiting middleware
   - Protect against API abuse

3. **Add Monitoring & Alerting**
   - Set up Cloud Monitoring alerts
   - Implement error tracking (Sentry)

4. **Security Hardening**
   - Change default setup token
   - Implement password rotation policy
   - Add security headers (CSP, HSTS)

### Short-Term (1-3 Months)

1. **Automated Testing**
   - Unit tests for business logic
   - Integration tests for API endpoints
   - E2E tests for critical flows

2. **Performance Optimization**
   - Implement pagination
   - Add database indexes
   - Implement caching (Redis)

3. **Backup Improvements**
   - Test restore procedure monthly
   - Increase backup retention (if needed)
   - Implement cross-region backups

4. **Documentation**
   - API documentation (OpenAPI/Swagger)
   - Runbook for common operations
   - Disaster recovery procedures

### Long-Term (3-6 Months)

1. **Scalability**
   - Implement read replicas
   - Add CDN for static assets
   - Implement horizontal scaling

2. **SSO Integration**
   - Implement OIDC/SAML
   - Integrate with corporate identity provider
   - Remove database-backed authentication

3. **Advanced Features**
   - Real-time notifications (WebSockets)
   - Background job processing (Celery)
   - Advanced analytics and reporting

4. **Compliance**
   - GDPR compliance (if applicable)
   - SOC 2 compliance (if needed)
   - Regular security audits

---

## Appendix

### URLs

#### Local Development
- **Frontend**: `http://localhost:5173`
- **Backend**: `http://127.0.0.1:8000`
- **API Docs**: `http://127.0.0.1:8000/docs`

#### Cloud Production
- **Frontend**: `https://uw-workbench-frontend-4szvavge6a-uc.a.run.app`
- **Backend**: `https://uw-workbench-backend-4szvavge6a-uc.a.run.app`
- **API Docs**: `https://uw-workbench-backend-4szvavge6a-uc.a.run.app/docs`

### Contact Information

- **Project Repository**: [Git Repository URL]
- **Cloud Project**: `ultra-ace-481723-e6`
- **Support**: [Support Contact]

### Related Documentation

- `ARCHITECTURE_OVERVIEW.md`: Detailed architecture documentation
- `DEPLOYMENT_PROCESS.md`: Deployment procedures
- `SECURITY.md`: Security policies
- `README.md`: Quick start guide
- `COST_ESTIMATE.md`: Cost analysis details

---

**Document End**
