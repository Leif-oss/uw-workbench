# Agencies Page Checklist

This file tracks the detailed implementation status of the Agencies Workbench screen.

## Core Loading & State

- [x] Load agencies from backend on mount.
- [x] Load offices from backend on mount.
- [x] Load employees (underwriters) from backend on mount.
- [x] Maintain selected agency state.
- [x] Load contacts for selected agency.
- [x] Load marketing logs for selected agency.
- [x] Refresh button reloads agencies/offices/employees.

## Sidebar – Filters & List

- [x] Text search filters agencies by name or code.
- [x] Office dropdown filters agencies by office_id.
- [x] Primary underwriter dropdown filters agencies by primary_underwriter / primary_underwriter_id.
- [x] Scrollable agencies table shows Name, Code, Primary UW.
- [x] Selecting a row loads contacts and logs.
- [x] “Delete” button deletes an agency and refreshes the list.
- [x] Notes section explains how filters and list behave.

## KPI Cards

- [x] Total Agencies = total agency count from backend.
- [x] Agencies In View = count of filteredAgencies.
- [x] Selected Agency name shown or “None”.
- [x] Styling consistent with Workbench look and feel.

## Selected Agency Detail

- [x] Shows agency name and optional code.
- [x] Shows office (code + name if available).
- [x] Shows primary underwriter.
- [x] Button to open underwriter in Employees page.
- [x] Button to open office in Offices page.

## Contacts

- [x] Contacts section appears under selected agency.
- [x] Shows list of contacts with name, title, email, phone.
- [x] If no contacts: shows “No contacts on file for this agency.”
- [ ] (Future) Inline edit or manage contacts.

## Marketing Logs – Display & Filters

- [x] Marketing logs table shows: user, office, action, datetime, notes.
- [x] Logs sorted by datetime descending.
- [x] Filter by user (text).
- [x] Filter by action (dropdown).
- [x] Filter by range: all vs last 30 days.
- [x] Show totals: total logs, last 30 days, distinct users.
- [x] Export filtered logs to CSV.
- [x] If no logs match filters, show message.

## Marketing Log Input (New Call Form)

Current behavior:
- [x] User text input.
- [x] Office text input.
- [x] Action text input.
- [x] Date and time optional (defaults to now if empty).
- [x] Notes textarea.
- [x] Requires selected agency.
- [x] Validates that user and action are provided.
- [x] Saves log to backend and reloads logs.
- [x] Shows errors when save fails.

Planned refinements:
- [ ] User field becomes a dropdown of underwriters in the agency’s office.
- [ ] Office is no longer typed; it is derived from the agency’s office_id.
- [ ] Contact dropdown populated from agency contacts.
- [ ] Action dropdown with fixed values:
      - In Person Marketing Call
      - Phone
      - Email
- [ ] Ensure these values are used to drive office/underwriter marketing call metrics.

## Integration & Navigation

- [x] Agencies page uses WorkbenchLayout (title/subtitle/note).
- [x] Navigation to Employees page with underwriter info.
- [x] Navigation to Offices page with officeId.
- [ ] (Future) Navigation to Tasks view once implemented.
- [ ] (Future) Hook marketing logs and counts into office/underwriter dashboards.

Update this checklist as you complete each planned refinement.
