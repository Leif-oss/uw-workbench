# Underwriter Workbench - Architecture Overview

## Application Purpose
A comprehensive web application for insurance underwriting management, featuring CRM capabilities, document processing, AI-powered analysis, and production tracking. Designed for internal use by insurance underwriters to manage agencies, contacts, production data, and perform research tasks.

---

## Technology Stack

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **ORM:** SQLAlchemy 2.0
- **Database:** SQLite (development), PostgreSQL/MySQL (production-ready)
- **Authentication:** Proxy header-based (Citrix integration) with RBAC
- **Validation:** Pydantic v2
- **AI Integration:** OpenAI API (GPT-4o)
- **File Processing:** pandas, openpyxl, pdfplumber, python-docx

### Frontend
- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite
- **Routing:** React Router
- **UI:** Custom components (no major UI library)
- **Charts/Graphs:** Custom implementation with tabbed views

### Infrastructure
- **Deployment:** Internal Citrix environment (planned)
- **Reverse Proxy:** Citrix ADC/NetScaler (planned)
- **Authentication:** SSO via proxy headers (planned), dev mode fallback
- **Database:** Self-contained SQLite for dev, PostgreSQL for production

---

## Project Structure

```
uw-workbench/
├── backend/
│   ├── routers/              # API endpoints (FastAPI routers)
│   │   ├── agencies.py       # Agency CRUD operations
│   │   ├── contacts.py       # Contact management
│   │   ├── employees.py      # Employee/user management
│   │   ├── offices.py        # Office management
│   │   ├── logs.py           # Interaction logging
│   │   ├── tasks.py          # Task management
│   │   ├── production.py     # Production data import/export
│   │   ├── admin.py          # Admin operations
│   │   ├── document_scrubber.py  # AI document processing
│   │   └── ai_router.py      # AI chat assistant
│   ├── auth/
│   │   └── proxy_headers.py  # Authentication via proxy headers
│   ├── services/
│   │   └── audit.py         # Audit logging service
│   ├── models.py             # SQLAlchemy ORM models
│   ├── schemas.py            # Pydantic validation schemas
│   ├── crud.py               # Database operations
│   ├── database.py           # Database configuration
│   └── main.py               # FastAPI app initialization
│
├── frontend/
│   ├── src/
│   │   ├── pages/            # Page components
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── AgenciesPage.tsx
│   │   │   ├── CrmAgencyDetailPage.tsx
│   │   │   ├── CrmOfficeDetailPage.tsx
│   │   │   ├── CrmUnderwritersPage.tsx
│   │   │   ├── EmployeesPage.tsx
│   │   │   ├── AdminPage.tsx
│   │   │   ├── DocumentScrubberPage.tsx
│   │   │   └── AiAssistantPage.tsx
│   │   ├── components/       # Reusable components
│   │   │   ├── TabbedProductionGraph.tsx
│   │   │   └── AiAssistantPanel.tsx
│   │   ├── layout/           # Layout components
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Topbar.tsx
│   │   └── api/              # API client
│   │       ├── client.ts
│   │       └── agencies.ts
│   └── package.json
│
└── private/                   # Private data (not in Git)
    ├── databases/
    │   └── workbench.db      # SQLite database
    └── uploads/               # File uploads
```

---

## Core Features & Functionality

### 1. CRM System
- **Agencies:** Manage insurance agencies with production tracking
- **Contacts:** Manage contacts within agencies
- **Offices:** Regional office management
- **Employees:** Underwriter and staff management
- **Logs:** Interaction history (calls, meetings, notes)
- **Tasks:** Follow-up task tracking

### 2. Production Tracking
- **Excel Import:** Multi-sheet Excel import for monthly production data
- **YTD/PYTD Comparisons:** Year-to-date vs prior year tracking
- **Graphs:** Tabbed production graphs (All Lines, Standard Lines, Surplus Lines)
- **Metrics:** Bound, Quoted, Declined, Hit Ratio, Loss Ratio tracking
- **Aggregation:** Company, Office, Agency, and Underwriter level views

### 3. Document Scrubber
- **AI-Powered Extraction:** Uses OpenAI to extract data from documents
- **File Support:** PDF, DOCX, Excel, TXT
- **Field Mapping:** Automatic mapping to underwriting submission fields
- **Export:** CSV, JSON, TXT formats
- **Manual Entry:** Manual data entry and verification

### 4. AI Assistant
- **Property Analysis:** Location-specific underwriting intelligence
- **Agency Research:** Find contacts and employees from agency websites
- **Ownership Research:** Determine common ownership between parties
- **Business Hazard Research:** Fire risk, chemicals, hazard analysis
- **Chat Interface:** ChatGPT-style conversation interface

### 5. Admin Functions
- **User Management:** Create/edit employees, assign to offices
- **Data Management:** Clear production data, manage agencies
- **System Configuration:** Environment variable management

---

## Database Schema

### Core Entities
- **offices:** Regional offices (id, name, code)
- **employees:** Users/underwriters (id, name, email, office_id, password_hash)
- **agencies:** Insurance agencies (id, name, office_id, underwriter_id, active status)
- **contacts:** Agency contacts (id, agency_id, name, email, phone, etc.)
- **logs:** Interaction history (id, agency_id, contact_id, employee_id, action, notes, date)
- **tasks:** Follow-up tasks (id, agency_id, employee_id, description, due_date, status)
- **production:** Monthly production data (id, agency_id, month, year, ytd_wp, pytd_wp, etc.)
- **audit_log:** Audit trail (id, timestamp, actor_email, action, entity_type, entity_id, details_json)

### Relationships
- Office → Employees (one-to-many)
- Office → Agencies (one-to-many)
- Employee → Agencies (one-to-many, as underwriter)
- Agency → Contacts (one-to-many)
- Agency → Logs (one-to-many)
- Agency → Tasks (one-to-many)
- Agency → Production (one-to-many, monthly records)

---

## API Architecture

### Authentication & Authorization
- **Method:** Proxy header-based (X-Authenticated-User, X-Groups)
- **RBAC:** Role-based access control (admin, underwriter, manager, read_only)
- **Office Scoping:** Users can view all data but only modify their office's data
- **Dev Mode:** Falls back to first employee in database if no headers

### API Endpoints Structure
```
GET    /offices              # List all offices
GET    /offices/{id}         # Get office details
POST   /offices              # Create office (admin/office-scoped)
PATCH  /offices/{id}         # Update office (admin/office-scoped)
DELETE /offices/{id}         # Delete office (admin only)

GET    /employees            # List all employees
GET    /employees/{id}       # Get employee details
POST   /employees            # Create employee (admin/office-scoped)
PATCH  /employees/{id}       # Update employee (admin/office-scoped)

GET    /agencies             # List all agencies (filtered by office for non-admin)
GET    /agencies/{id}        # Get agency details
POST   /agencies             # Create agency (admin/office-scoped)
PATCH  /agencies/{id}        # Update agency (admin/office-scoped)
DELETE /agencies/{id}        # Delete agency (admin/office-scoped)

GET    /contacts             # List contacts
GET    /contacts/{id}        # Get contact details
POST   /contacts             # Create contact (admin/office-scoped)
PATCH  /contacts/{id}        # Update contact (admin/office-scoped)

GET    /logs                 # List logs
POST   /logs                 # Create log entry
GET    /tasks                # List tasks
POST   /tasks                # Create task

GET    /production           # Get production data (filtered)
POST   /production/import    # Import production data from Excel

POST   /admin/clear-data     # Clear production data (admin only)
```

### Data Flow
1. **Request** → FastAPI middleware (CORS, auth)
2. **Authentication** → `get_current_user()` extracts user from headers
3. **Authorization** → `require_office_access()` checks permissions
4. **Business Logic** → Router handler processes request
5. **Database** → SQLAlchemy ORM queries/updates
6. **Audit** → `log_audit_event()` records action
7. **Response** → Pydantic schema serializes response

---

## Frontend Architecture

### Page Structure
- **Dashboard:** Company-wide production overview with graphs
- **Offices:** Office list and detail pages with production metrics
- **Agencies:** Agency list and detail pages with contacts, logs, tasks
- **Underwriters:** Employee list with assigned agencies and metrics
- **Admin:** User management, data clearing, system config

### Component Patterns
- **TabbedProductionGraph:** Reusable graph component with tabbed views
- **Layout Components:** AppLayout, Sidebar, Topbar for consistent UI
- **API Client:** Centralized fetch wrapper with error handling

### State Management
- **Local State:** React hooks (useState, useEffect)
- **No Global State:** No Redux/Zustand (consider adding for complex state)
- **Data Fetching:** Direct API calls in components

### Navigation
- **React Router:** Client-side routing
- **Programmatic Navigation:** Links between related entities (agency → contact, employee → agency)

---

## Security Architecture

### Current Implementation
- **Authentication:** Proxy header-based (production), dev fallback
- **Authorization:** RBAC + office scoping
- **Audit Logging:** All CREATE/UPDATE/DELETE operations logged
- **Password Hashing:** bcrypt for password storage
- **CORS:** Configurable via environment variable
- **Error Handling:** No stack traces in production responses

### Planned Enhancements
- **SSO Integration:** OIDC/SAML via Citrix proxy
- **HTTPS/TLS:** Internal certificate
- **Rate Limiting:** API endpoint protection
- **Security Headers:** HSTS, CSP, X-Frame-Options

---

## Data Import/Export

### Production Data Import
- **Format:** Multi-sheet Excel file
- **Process:** 
  1. Parse Excel sheets (one per office)
  2. Extract production metrics (premium, written premium, etc.)
  3. Deduplicate by agency/month
  4. Create/update agencies
  5. Store production records
- **Validation:** Email uniqueness, office code matching

### Export Capabilities
- **Document Scrubber:** CSV, JSON, TXT export
- **Production Data:** API endpoints for data retrieval

---

## Performance Considerations

### Current State
- **Database:** SQLite (single connection, file-based)
- **Queries:** ORM-based, some N+1 query potential
- **Caching:** None implemented
- **Pagination:** Not implemented (loads all records)
- **Audit Logging:** Synchronous (could be async)

### Known Bottlenecks
- **Large Datasets:** Loading all agencies/contacts at once
- **Production Graphs:** Aggregating data on-the-fly
- **Excel Import:** Processing large files synchronously
- **Audit Logs:** Blocking on every write

---

## Deployment Architecture

### Current (Development)
- **Backend:** FastAPI on localhost:8000
- **Frontend:** Vite dev server on localhost:5173
- **Database:** SQLite file in `private/databases/`

### Planned (Production)
- **Hosting:** Internal VM/K8s/service
- **Reverse Proxy:** Citrix ADC/NetScaler
- **Access:** Internal-only (behind Citrix)
- **Database:** PostgreSQL (migrated from SQLite)
- **HTTPS:** Internal certificate
- **SSO:** Via Citrix proxy headers

---

## Areas for Architecture Improvement

### 1. State Management
- **Current:** Local component state only
- **Suggestion:** Consider Redux Toolkit or Zustand for:
  - User authentication state
  - Office/agency filters
  - Production data caching

### 2. API Optimization
- **Current:** No pagination, loads all data
- **Suggestion:** 
  - Implement pagination (offset/limit or cursor-based)
  - Add filtering/sorting at API level
  - Implement field selection (sparse fieldsets)

### 3. Database Performance
- **Current:** SQLite, potential N+1 queries
- **Suggestion:**
  - Add database indexes on foreign keys and frequently queried fields
  - Use eager loading for relationships
  - Consider read replicas for production

### 4. Caching Strategy
- **Current:** No caching
- **Suggestion:**
  - Redis for production data aggregates
  - Browser caching for static assets
  - API response caching for read-heavy endpoints

### 5. Background Processing
- **Current:** Synchronous Excel import
- **Suggestion:**
  - Celery or similar for async task processing
  - Queue system for large imports
  - WebSocket for progress updates

### 6. Error Handling
- **Current:** Basic error responses
- **Suggestion:**
  - Structured error codes
  - Retry logic for transient failures
  - Error boundary components in React

### 7. Testing
- **Current:** No test suite
- **Suggestion:**
  - Unit tests for business logic
  - Integration tests for API endpoints
  - E2E tests for critical user flows

### 8. Monitoring & Observability
- **Current:** Basic logging
- **Suggestion:**
  - Application performance monitoring (APM)
  - Error tracking (Sentry)
  - Metrics collection (Prometheus)
  - Health check endpoints

### 9. API Versioning
- **Current:** No versioning
- **Suggestion:**
  - Version API endpoints (/api/v1/...)
  - Deprecation strategy
  - Backward compatibility

### 10. Frontend Optimization
- **Current:** No code splitting
- **Suggestion:**
  - Route-based code splitting
  - Lazy loading for heavy components
  - Bundle size optimization

---

## Technology Debt

1. **No Test Coverage:** Critical for production stability
2. **SQLite in Dev:** Should use same DB as production for consistency
3. **No Migration System:** Using Alembic but not fully utilized
4. **Hardcoded Values:** Some configuration still in code (being fixed)
5. **No API Documentation:** Swagger exists but could be enhanced
6. **Synchronous Operations:** Some should be async (imports, audit logs)
7. **No Rate Limiting:** API vulnerable to abuse
8. **Limited Error Recovery:** No retry logic or circuit breakers

---

## Scalability Considerations

### Current Limitations
- **Single Database:** No read replicas
- **No Load Balancing:** Single backend instance
- **File Storage:** Local filesystem (not scalable)
- **Session Management:** Stateless (good) but no session storage

### Scaling Path
1. **Horizontal Scaling:** Multiple backend instances behind load balancer
2. **Database:** PostgreSQL with read replicas
3. **File Storage:** Object storage (S3, Azure Blob)
4. **Caching Layer:** Redis cluster
5. **CDN:** For static frontend assets

---

## Integration Points

### External Services
- **OpenAI API:** For AI features (document processing, research)
- **Citrix Proxy:** For authentication (planned)
- **SSO Provider:** OIDC/SAML (planned)

### Internal Systems
- **Email System:** (Not yet integrated, but planned for notifications)
- **Reporting System:** (Not yet integrated)
- **Document Storage:** (Currently local, should be object storage)

---

## Development Workflow

### Current Process
1. Local development with SQLite
2. Git workflow (feature branches)
3. Manual testing
4. Manual deployment (planned)

### Suggested Improvements
1. **CI/CD Pipeline:** Automated testing and deployment
2. **Database Migrations:** Automated via Alembic
3. **Environment Parity:** Dev/staging/prod consistency
4. **Code Quality:** Pre-commit hooks, linting, formatting

---

## Questions for Architecture Review

1. **State Management:** Should we add Redux/Zustand for global state?
2. **API Design:** RESTful enough, or should we consider GraphQL?
3. **Database:** Is SQLAlchemy ORM the right choice, or should we consider alternatives?
4. **Caching:** What caching strategy makes sense for this use case?
5. **Background Jobs:** What task queue system fits best (Celery, RQ, etc.)?
6. **Frontend Framework:** Is React the right choice, or consider alternatives?
7. **Deployment:** Containerization (Docker) vs VM vs serverless?
8. **Monitoring:** What observability stack is recommended?
9. **Testing Strategy:** Unit vs integration vs E2E - what's the right balance?
10. **Performance:** What are the biggest performance bottlenecks to address first?

---

## Summary

This is a **monolithic application** with a **FastAPI backend** and **React frontend**, designed for **internal enterprise use**. It's currently in **development/production-ready** state with good security practices but needs improvements in:

- **Performance** (pagination, caching, async operations)
- **Scalability** (database optimization, horizontal scaling)
- **Reliability** (testing, error handling, monitoring)
- **Developer Experience** (CI/CD, better tooling)

The architecture is **solid but traditional** - a good foundation that can be enhanced incrementally without major rewrites.

