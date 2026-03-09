# Underwriter Workbench - Developer Overview

## 📋 Application Overview

**Underwriter Workbench** is a full-stack web application designed for insurance underwriting management. It serves as a comprehensive CRM, document processing, and data analysis platform for insurance professionals to manage agencies, contacts, production data, and perform AI-powered research.

### Business Purpose
- **CRM Management**: Track agencies, contacts, interactions, and relationships
- **Production Tracking**: Monitor insurance production metrics (YTD, PYTD comparisons)
- **Document Processing**: AI-powered extraction and analysis of insurance submissions
- **Research Tools**: AI-assisted property analysis, agency research, ownership research
- **Administration**: User/employee management, office management, data import/export

---

## 🛠️ Technology Stack

### Backend (Python/FastAPI)

**Core Framework:**
- **FastAPI 0.104.1** - Modern, high-performance web framework with automatic OpenAPI docs
- **Python 3.11+** - Required Python version
- **Uvicorn** - ASGI server for production deployment

**Database & ORM:**
- **SQLAlchemy 2.0.23** - ORM for database operations
- **Alembic 1.13.0+** - Database migrations
- **SQLite** - Default for development (`workbench.db`)
- **PostgreSQL/MySQL** - Production-ready (via `DATABASE_URL` environment variable)
- **psycopg2-binary** - PostgreSQL adapter

**Data Validation & Serialization:**
- **Pydantic 2.5.0** - Data validation using Python type annotations
- **email-validator** - Email format validation

**AI & Machine Learning:**
- **OpenAI 1.6.1** - GPT-4o integration for AI features
- **httpx 0.25.2** - Async HTTP client for API calls

**File Processing:**
- **pandas 2.1.3** - Data manipulation and analysis
- **openpyxl 3.1.2** - Excel file reading/writing
- **pdfplumber 0.10.3** - PDF text extraction
- **python-docx 1.1.0** - Word document processing
- **python-multipart** - Form data handling for file uploads

**Security & Authentication:**
- **bcrypt 4.0.0+** - Password hashing
- **Proxy Header Authentication** - Custom implementation for Citrix/SSO integration

**Utilities:**
- **python-dotenv 1.0.0** - Environment variable management
- **python-dateutil 2.8.2** - Date parsing and manipulation

### Frontend (React/TypeScript)

**Core Framework:**
- **React 18+** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing

**No Major UI Libraries:**
- Custom-built components using inline styles
- Minimal dependencies for faster loads
- Custom design system in `ui/designSystem.ts`

**Build & Dev Tools:**
- **Vite** - Fast HMR (Hot Module Replacement)
- **TypeScript** - Static type checking
- **ESLint** - Code linting (if configured)

---

## 📁 Code Architecture

### Backend Structure

```
backend/
├── main.py                 # FastAPI app initialization, CORS, middleware
├── models.py              # SQLAlchemy ORM models (Employee, Agency, Contact, etc.)
├── schemas.py             # Pydantic schemas for request/response validation
├── crud.py                # Database CRUD operations
├── database.py            # Database connection and session management
├── ai_client.py           # OpenAI API integration wrapper
│
├── routers/               # API endpoint modules (FastAPI routers)
│   ├── agencies.py        # Agency CRUD: GET, POST, PUT, DELETE
│   ├── contacts.py        # Contact management
│   ├── employees.py       # Employee/user management with 1:1 User relationship
│   ├── offices.py         # Office management
│   ├── logs.py            # Interaction logging
│   ├── tasks.py           # Task tracking
│   ├── production.py      # Production data import/export
│   ├── admin.py           # Admin operations (password reset, data cleanup)
│   ├── document_scrubber.py  # AI document processing endpoint
│   ├── ai_router.py       # AI chat assistant endpoints
│   ├── auth.py            # Authentication endpoints (login, password reset)
│   └── users.py           # User account management
│
├── auth/
│   └── proxy_headers.py   # Authentication via proxy headers (Citrix SSO)
│                          # Supports TEMP_SETUP_MODE for development
│
├── services/
│   ├── audit.py           # Audit logging service (tracks all changes)
│   └── email.py           # Email service (SMTP, welcome emails, password reset)
│
└── alembic/               # Database migrations
    └── versions/
        ├── 0001_init.py
        ├── 0002_add_sessions_and_user_roles.py
        ├── 0003_add_user_security_fields.py
        └── 0004_add_employee_offices_many_to_many.py
```

### Frontend Structure

```
frontend/
├── src/
│   ├── main.tsx           # React app entry point
│   ├── App.tsx            # Main router configuration
│   │
│   ├── pages/             # Page components (route handlers)
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── AgenciesPage.tsx
│   │   ├── CrmAgencyDetailPage.tsx
│   │   ├── CrmHomePage.tsx
│   │   ├── CrmOfficeDetailPage.tsx
│   │   ├── CrmUnderwritersPage.tsx
│   │   ├── EmployeesPage.tsx
│   │   ├── AdminPage.tsx
│   │   ├── DocumentScrubberPage.tsx
│   │   ├── AiAssistantPage.tsx
│   │   ├── OfficesPage.tsx
│   │   └── TasksPage.tsx
│   │
│   ├── components/        # Reusable UI components
│   │   ├── WorkbenchLayout.tsx    # Main layout wrapper
│   │   ├── AiAssistantPanel.tsx   # AI chat panel component
│   │   ├── TabbedProductionGraph.tsx  # Production chart component
│   │   └── ChangePasswordModal.tsx
│   │
│   ├── layout/            # Layout components
│   │   ├── AppLayout.tsx  # App shell
│   │   ├── Sidebar.tsx    # Navigation sidebar
│   │   └── Topbar.tsx     # Top navigation bar
│   │
│   ├── hooks/             # Custom React hooks
│   │   └── useAiAssistant.ts  # AI chat hook
│   │
│   ├── api/               # API client code
│   │   ├── client.ts      # HTTP client (apiGet, apiPost, etc.)
│   │   └── agencies.ts    # Agency-specific API helpers
│   │
│   └── ui/
│       └── designSystem.ts  # Shared design tokens (colors, styles)
```

---

## 🗄️ Database Schema

### Core Entities

**Offices**
- Regional offices (e.g., "BRA", "FNO", "LAF")
- Code (unique), Name

**Employees**
- Underwriters and staff members
- Name, Email (unique), Role (admin/manager/underwriter/partner)
- **Many-to-Many** relationship with Offices (via `employee_offices` junction table)
- **1:1** relationship with Users (every employee has a login account)

**Users**
- Login accounts (username, password_hash)
- Linked to Employee via `employee_id`
- Admin flag, active status, password reset tokens
- Session management

**Agencies**
- Insurance agencies
- Name, Code (unique), Office assignment
- Production tracking, active/inactive status
- Primary underwriter assignment

**Contacts**
- Agency contacts (people)
- Name, Email, Phone, Title
- Belongs to one Agency

**Logs**
- Interaction history (calls, meetings, notes)
- Timestamps, action type, notes
- Linked to Agency and optionally Contact

**Tasks**
- Follow-up tasks
- Title, Due date, Status, Owner
- Linked to Agency

**Production**
- Monthly production data (YTD, PYTD metrics)
- Office, Agency code, Month
- Premiums written, new business counts
- Standard lines, surplus lines breakdowns

**Submissions**
- Document scrubber submissions
- Extracted fields from insurance documents
- File metadata, extracted text

**Audit Logs**
- System-wide audit trail
- All CREATE, UPDATE, DELETE operations
- Actor tracking, timestamp, before/after snapshots

---

## 🔐 Authentication & Authorization

### Authentication Methods

1. **Production (Planned):** Proxy header-based (Citrix/SSO)
   - `X-Authenticated-User` header
   - `X-Groups` header for roles
   - No password required (handled by reverse proxy)

2. **Development:** `TEMP_SETUP_MODE=true`
   - Falls back to first employee in database
   - Allows development without SSO setup

3. **Direct Login:** Username/password authentication
   - JWT token-based sessions
   - Password hashing with bcrypt
   - Password reset via email tokens

### Authorization (RBAC)

- **Admin**: Full access, can manage all entities
- **Manager**: Office-scoped access
- **Underwriter**: Office-scoped read/write
- **Partner**: Read-only access

Office-scoping means users can only modify entities in their assigned office(s).

---

## 🔌 API Architecture

### RESTful Endpoints

**Base URL:** `http://localhost:8000` (dev) or configured production URL

**Authentication:**
- `POST /auth/login` - Username/password login
- `POST /auth/logout` - Logout
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token

**Agencies:**
- `GET /agencies` - List all agencies (filtered by office for non-admin)
- `GET /agencies/{id}` - Get agency details
- `POST /agencies` - Create agency
- `PUT /agencies/{id}` - Update agency
- `DELETE /agencies/{id}` - Delete agency

**Contacts:**
- `GET /contacts?agency_id={id}` - List contacts for agency
- `POST /contacts` - Create contact
- `PUT /contacts/{id}` - Update contact
- `DELETE /contacts/{id}` - Delete contact

**Employees:**
- `GET /employees?office={code}` - List employees
- `POST /employees` - Create employee (auto-creates User account)
- `PATCH /employees/{id}` - Update employee
- Returns temporary password for new users

**Production:**
- `GET /production?office={code}&agency_code={code}` - Get production data
- `POST /admin/production/import` - Import Excel file

**Admin:**
- `POST /admin/employees/{id}/reset-password` - Generate password reset link
- `DELETE /admin/employees/{id}` - Delete employee (and user account)
- `GET /admin/users/debug` - List all user accounts (debug)

**AI & Document Processing:**
- `POST /submissions/upload` - Upload document for AI processing
- `POST /ai/chat` - AI chat assistant

### Response Formats

- **Success:** JSON with entity data
- **Error:** JSON with `{"detail": "error message"}`
- **Validation Errors:** 422 with Pydantic validation details

---

## 🎨 Frontend Architecture

### State Management

- **Local State:** React `useState` hooks in components
- **No Global State Library:** Redux/Zustand not used
- **Server State:** Fetched on-demand via API calls
- **Caching:** Manual refresh via `fetchData()` functions

### Routing

React Router with nested routes:
- `/` - Dashboard
- `/crm/agencies` - Agencies list
- `/crm/agencies/:id` - Agency detail
- `/crm/employees` - Employees
- `/admin` - Admin panel
- `/document-scrubber` - Document processing
- `/ai-assistant` - AI chat

### API Communication

Custom API client in `api/client.ts`:
- `apiGet<T>(path)` - GET request
- `apiPost<T>(path, body)` - POST request
- `apiPut<T>(path, body)` - PUT request
- `apiPatch<T>(path, body)` - PATCH request
- `apiDelete<T>(path)` - DELETE request

Handles:
- Authentication headers (JWT token)
- Error parsing and user-friendly messages
- CORS preflight requests

---

## 🚀 Development Workflow

### Local Development

1. **Backend:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env with your API keys
   uvicorn backend.main:app --reload --port 8000
   ```

2. **Frontend:**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   npm run dev
   ```

3. **Database:**
   - SQLite created automatically at `private/databases/workbench.db`
   - Migrations run automatically on first start
   - Can reset by deleting `.db` file

### Environment Variables

**Backend (`backend/.env`):**
```env
AI_API_KEY=sk-...              # OpenAI API key (required for AI features)
DATABASE_URL=sqlite:///./workbench.db  # Database connection
TEMP_SETUP_MODE=true           # Development mode (bypasses auth)
CORS_ORIGINS=http://localhost:5173  # Frontend URL
FRONTEND_URL=http://localhost:5173
ENVIRONMENT=development
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://127.0.0.1:8000  # Backend API URL
```

---

## 📦 Key Dependencies & Resources

### External APIs

1. **OpenAI API** (GPT-4o)
   - Used for: Document extraction, AI chat assistant, property research
   - Cost: Pay-per-use (monitor usage)
   - Rate Limits: Based on tier

2. **Email Service** (SMTP)
   - Currently: Gmail SMTP (smtp.gmail.com:587)
   - Used for: Welcome emails, password reset links
   - Credentials stored in environment variables

### File Processing

- **Excel Files:** Production data import, multi-office processing
- **PDF Files:** Document scrubber (insurance submissions)
- **Word Documents:** Document processing
- **Upload Location:** `private/uploads/` (not in Git)

### Data Storage

- **SQLite** (dev): Single file database
- **PostgreSQL/MySQL** (prod): Server-based database
- **File Storage:** Local filesystem (uploads, exports)

---

## 🔄 Data Flow Patterns

### Creating an Employee

1. Frontend: User fills form in `AdminPage.tsx`
2. Frontend: `POST /employees` with employee data
3. Backend: `routers/employees.py` → `create_employee()`
4. Backend: Creates `Employee` record in database
5. Backend: Automatically creates `User` account (1:1 relationship)
6. Backend: Generates temporary password
7. Backend: Returns employee data + temporary password
8. Frontend: Shows modal with credentials (cannot be missed)
9. Frontend: Refreshes employee list

### Document Processing

1. Frontend: User uploads file via `DocumentScrubberPage.tsx`
2. Frontend: `POST /submissions/upload` (multipart/form-data)
3. Backend: `routers/document_scrubber.py` → `upload_submission()`
4. Backend: Detects file type (PDF, DOCX, Excel, TXT)
5. Backend: Extracts text using appropriate library
6. Backend: Sends to OpenAI GPT-4o for structured extraction
7. Backend: Returns extracted fields (JSON)
8. Frontend: Displays fields in form for verification
9. Frontend: User can edit and save to database

### Authentication Flow

1. User navigates to `/login` (or auto-redirect if not authenticated)
2. Frontend: `LoginPage.tsx` collects username/password
3. Frontend: `POST /auth/login` with credentials
4. Backend: `routers/auth.py` → `login()`
5. Backend: Verifies password hash, creates session token
6. Backend: Returns JWT token
7. Frontend: Stores token in `localStorage`
8. Frontend: Redirects to dashboard
9. All subsequent requests include `Authorization: Bearer {token}` header

---

## 🎯 Key Features Implementation

### 1. Employee-Office Many-to-Many Relationship

**Problem:** Employees can be assigned to multiple offices
**Solution:** Junction table `employee_offices`

```python
# models.py
employee_offices = Table(
    'employee_offices',
    Base.metadata,
    Column('employee_id', Integer, ForeignKey('employees.id', ondelete='CASCADE')),
    Column('office_id', Integer, ForeignKey('offices.id', ondelete='CASCADE')),
)

class Employee(Base):
    offices = relationship("Office", secondary=employee_offices, back_populates="employees")
```

### 2. 1:1 Employee-User Relationship

**Problem:** Every employee must have a login account
**Solution:** Automatic user creation on employee creation

- When employee created → user account auto-created
- Temporary password generated and returned
- Employee deletion → user account also deleted

### 3. Office-Scoped Authorization

**Implementation:** `auth/proxy_headers.py`
- `require_office_access()` checks if user has access to office
- Non-admin users filtered by `office_ids` array
- Admin users see all data

### 4. Audit Logging

**Service:** `services/audit.py`
- Logs all CREATE, UPDATE, DELETE operations
- Stores before/after snapshots
- Tracks actor, timestamp, IP address
- Immutable log (no deletions)

---

## 🐛 Common Development Issues

### Issue: Temporary Password Not Showing
**Solution:** Check backend returns `temporary_password` in response, frontend modal displays it

### Issue: Employee Not Showing in Office
**Solution:** Check `employee.office_ids` array (not `office_id`), ensure many-to-many relationship loaded

### Issue: Orphaned User Accounts
**Solution:** Use `/admin/users/debug` endpoint to find orphaned users, delete via admin panel

### Issue: CORS Errors
**Solution:** Check `CORS_ORIGINS` in `backend/.env`, ensure frontend URL matches

### Issue: Email Not Sending
**Solution:** Check SMTP credentials in environment variables, verify network allows SMTP (port 587)

---

## 📊 Performance Considerations

- **Database Queries:** Use `selectinload()` for eager loading relationships
- **Pagination:** Production data endpoints support filtering (not full pagination yet)
- **File Uploads:** Files stored on filesystem (consider object storage for production)
- **Caching:** No caching layer currently (consider Redis for production)
- **API Rate Limiting:** Not implemented (consider for OpenAI API usage)

---

## 🔒 Security Features

- **Password Hashing:** bcrypt with salt
- **SQL Injection Prevention:** SQLAlchemy ORM (parameterized queries)
- **XSS Prevention:** React escapes by default
- **CSRF Protection:** Not implemented (planned)
- **Audit Logging:** All data changes logged
- **Input Validation:** Pydantic schemas validate all inputs
- **CORS:** Configured for specific origins
- **Environment Variables:** Secrets stored in `.env` (not in Git)

---

## 🚧 Areas for Improvement

1. **Testing:** No test suite yet (pytest for backend, Jest for frontend)
2. **Error Handling:** Could be more comprehensive
3. **Loading States:** Some pages lack loading indicators
4. **Offline Support:** Not implemented
5. **Mobile Responsiveness:** Limited (desktop-first design)
6. **API Documentation:** Swagger UI available but could be enhanced
7. **Database Migrations:** Manual migration runs needed
8. **File Size Limits:** Not enforced (could cause issues)

---

## 📚 Key Code Patterns

### Backend Pattern: Router → CRUD → Database

```python
# router
@router.post("/employees")
def create_employee(emp: schemas.EmployeeCreate, db: Session = Depends(get_db)):
    return crud.create_employee(db, emp)

# crud.py
def create_employee(db: Session, employee: schemas.EmployeeCreate):
    db_employee = models.Employee(**employee.dict())
    db.add(db_employee)
    db.commit()
    return db_employee
```

### Frontend Pattern: Page → API Call → State Update

```typescript
const [employees, setEmployees] = useState<Employee[]>([]);

const fetchData = async () => {
  const data = await apiGet<Employee[]>("/employees");
  setEmployees(data || []);
};
```

---

## 🎓 Learning Resources

- **FastAPI:** https://fastapi.tiangolo.com/
- **React:** https://react.dev/
- **SQLAlchemy:** https://docs.sqlalchemy.org/
- **OpenAI API:** https://platform.openai.com/docs
- **TypeScript:** https://www.typescriptlang.org/

---

**Last Updated:** December 2024
**Version:** 1.0.0

