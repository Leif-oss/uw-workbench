# Underwriting Workbench – Project Roadmap

## Overview

This repository contains the next-generation Underwriting Workbench for Deans & Homer, based on the original Streamlit CRM ("appy") and implemented as a React + TypeScript frontend with a FastAPI backend.

Core goals:
- Centralize agency, contact, and marketing call workflows.
- Provide clean dashboards for agencies, offices, and underwriters.
- Eventually add tasks, renewals, and underwriting workbench flows.

---

## Current Status (Dec 2025)

### Frontend

#### ? Agencies Page (AgenciesPage.tsx)
- Loads agencies, offices, and employees from the backend on mount.
- Sidebar with filters:
  - Search (agency name/code)
  - Office filter
  - Primary underwriter filter
  - Scrollable agency table with select + delete.
- KPI cards:
  - Total Agencies
  - Agencies In View (matching filters)
  - Selected Agency
- Main panel for selected agency:
  - Agency summary (name, code, office, primary UW).
  - Contacts list for the agency.
  - Marketing logs table with:
    - Filters: user, action, date range (all / last 30 days).
    - CSV export.
    - Counts: total logs, last 30 days, distinct users.
- Log form in side panel:
  - User, office, action, date/time, notes.
  - Validates required fields.
  - Writes logs to backend and refreshes agency logs.

#### ?? In Progress
- Refine marketing log input to match real workflows:
  - User = dropdown of underwriters in the agency’s office.
  - Office inferred from the agency’s office (not typed).
  - Action = standardized marketing call types (In Person, Phone, Email).
  - Contact = dropdown of the agency’s contacts.
- Wire marketing logs to office/underwriter marketing call metrics.

#### ? Planned (Frontend)
- Tasks system:
  - Per agency and/or per underwriter.
  - Task list + filters + status + due dates.
- Office dashboard:
  - Office-level KPIs (premium, calls, tasks).
  - Drill-down to agencies and employees.
- Renewals workbench:
  - Renewal queues by office and underwriter.
  - Filters for date ranges, hazard, size, etc.

---

## Backend

- FastAPI backend with endpoints for:
  - /agencies
  - /offices
  - /employees
  - /contacts
  - /logs
- Frontend uses a thin API client (apiGet/apiPost/apiDelete).

---

## Tracks

- **Track A – Agencies Workbench**
  - Focus: agencies, contacts, marketing logs, and agency-centric workflow.
  - Status: First version complete; refinements in progress.

- **Track B – Tasks**
  - Focus: tracking work items for underwriters and/or agencies.
  - Status: Not started (frontend); TBD on backend.

- **Track C – Office & Underwriter Dashboards**
  - Focus: office-level summary, underwriter performance, marketing call counts.
  - Status: Not started.

---

## Next Steps

1. Finish marketing log refinements on AgenciesPage:
   - Underwriter dropdown by agency office.
   - Contact dropdown.
   - Action dropdown: In Person Marketing Call, Phone, Email.
   - Derive office code from selected agency’s office_id.
2. Define data model and API endpoints for tasks.
3. Implement initial Tasks UI (filtered by agency and underwriter).
4. Add office dashboard page that surfaces:
   - Total calls by office and underwriter.
   - Top agencies by activity.
   - Task counts (open/overdue/completed).
5. Gradually port more workflows from the original “appy” into the new UI.

---

Keep this ROADMAP updated as features are completed or goals change.
