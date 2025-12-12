import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiGet, apiPost, apiPut, apiDelete } from "../api/client";
import { TabbedProductionGraph } from "../components/TabbedProductionGraph";
import { LOG_ACTION_OPTIONS, LogAction } from "../constants/logActions";
import {
  cardStyle,
  panelStyle,
  inputStyle,
  labelStyle,
  tableContainerStyle,
  tableBaseStyle,
  tableHeaderCellStyle,
  tableCellStyle,
  tableHeaderStickyStyle,
  selectStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from "../ui/designSystem";

// Reuse types consistent with other CRM pages
 type Agency = {
  id: number;
  name: string;
  code?: string;
  office_id?: number | null;
  web_address?: string | null;
  notes?: string | null;
  primary_underwriter_id?: number | null;
  primary_underwriter?: string | null;
  active_flag?: string | null;
  dba?: string | null;
  email?: string | null;
};

type Contact = {
  id: number;
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  agency_id: number;
  notes?: string | null;
  linkedin_url?: string | null;
};

 type Employee = {
  id: number;
  name: string;
  office_id: number | null;
};

type Log = {
  id: number;
  user: string;
  datetime: string;
  action: string;
  agency_id?: number | null;
  office?: string | null;
  notes?: string | null;
  contact_id?: number | null;
  contact?: string | null;
 };

type ProductionRecord = {
  id: number;
  office: string;
  agency_code: string;
  agency_name: string;
  month: string;
  all_ytd_wp: number | null;
  pytd_wp: number | null;
  standard_lines_ytd_wp: number | null;
  standard_lines_pytd_wp: number | null;
  surplus_lines_ytd_wp: number | null;
  surplus_lines_pytd_wp: number | null;
};


 const CrmAgencyDetailPage: React.FC = () => {
  const { agencyId } = useParams<{ agencyId: string }>();
  const navigate = useNavigate();
  const agencyIdNum = agencyId ? Number(agencyId) : null;

  const [agency, setAgency] = useState<Agency | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [productionData, setProductionData] = useState<ProductionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contactSearch, setContactSearch] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [primaryContactId, setPrimaryContactId] = useState<number | null>(null);

  const [selectedUnderwriter, setSelectedUnderwriter] = useState<string>("");
  const [logAction, setLogAction] = useState<LogAction>("In Person");
  const [logNotes, setLogNotes] = useState("");
  const [logDate, setLogDate] = useState("");
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [logSuccess, setLogSuccess] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [isDeletingLogId, setIsDeletingLogId] = useState<number | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const isLogFormValid = Boolean(
    selectedContactId && selectedUnderwriter.trim() && logAction.trim() && logDate
  );

  const [newContactName, setNewContactName] = useState("");
  const [newContactTitle, setNewContactTitle] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactLinkedIn, setNewContactLinkedIn] = useState("");
  const [newContactNotes, setNewContactNotes] = useState("");
  const [isAddingContact, setIsAddingContact] = useState(false);

  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editContactName, setEditContactName] = useState("");
  const [editContactTitle, setEditContactTitle] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");

  const [isEditingAgency, setIsEditingAgency] = useState(false);
  const [editAgencyName, setEditAgencyName] = useState("");
  const [editAgencyDBA, setEditAgencyDBA] = useState("");
  const [editAgencyWebAddress, setEditAgencyWebAddress] = useState("");
  const [editAgencyPrimaryUW, setEditAgencyPrimaryUW] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!agencyIdNum) return;
      setIsLoading(true);
      setError(null);
      try {
        const [agenciesResp, contactsResp, employeesResp, logsResp, productionResp] = await Promise.all([
          apiGet<Agency[]>("/agencies"),
          apiGet<Contact[]>(`/contacts?agency_id=${agencyIdNum}`),
          apiGet<Employee[]>("/employees"),
          apiGet<Log[]>(`/logs?agency_id=${agencyIdNum}`),
          apiGet<ProductionRecord[]>("/production"),
        ]);
        const found = (agenciesResp || []).find((a) => a.id === agencyIdNum) || null;
        setAgency(found);
        setContacts(contactsResp || []);
        setEmployees(employeesResp || []);
        setLogs(logsResp || []);
        setProductionData(productionResp || []);
        if (contactsResp && contactsResp.length > 0) {
          const firstContactId = contactsResp[0].id;
          setSelectedContactId(firstContactId);
          setPrimaryContactId(firstContactId);
        }
        if (!found) {
          setError("Agency not found.");
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load agency");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [agencyIdNum]);

  const officeEmployees = useMemo(() => {
    if (!agency || !agency.office_id) return [];
    return employees.filter((e) => e.office_id === agency.office_id);
  }, [employees, agency]);

  const filteredContacts = useMemo(() => {
    const term = contactSearch.trim().toLowerCase();
    if (!term) return contacts;
    return contacts.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const title = (c.title || "").toLowerCase();
      return name.includes(term) || title.includes(term);
    });
  }, [contacts, contactSearch]);

  const selectedContact = useMemo(() => {
    if (primaryContactId) {
      return contacts.find((c) => c.id === primaryContactId) || null;
    }
    return contacts[0] || null;
  }, [contacts, primaryContactId]);

  const logsForAgency = useMemo(() => logs, [logs]);

  const getContactedInfoForContact = (contactId: number) => {
    if (!logsForAgency || logsForAgency.length === 0) {
      return { label: "never", isStale: true };
    }

    const matches = logsForAgency.filter((log) => {
      if (log.contact_id == null) return false;
      // eslint-disable-next-line eqeqeq
      return String(log.contact_id) == String(contactId);
    });

    if (!matches.length) {
      return { label: "never", isStale: true };
    }

    let latest: Date | null = null;
    matches.forEach((log) => {
      const d = new Date(log.datetime);
      if (!Number.isNaN(d.getTime())) {
        if (!latest || d > latest) latest = d;
      }
    });

    if (!latest) {
      return { label: "never", isStale: true };
    }

    const latestDate = latest as Date;
    const now = new Date();
    const diffMs = now.getTime() - latestDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const isStale = diffDays > 90;

    const label = latestDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return { label, isStale };
  };

  const underwritersForOffice = useMemo(() => {
    if (!agency || !agency.office_id) return [] as Employee[];
    return employees.filter((e) => e.office_id === agency.office_id);
  }, [agency, employees]);

  const getLastContactInfoForContact = (contactId: number) => {
    if (!logsForAgency || logsForAgency.length === 0) {
      return { label: "Never", isStale: true };
    }

    const logsForContact = logsForAgency
      .filter((log) => log.contact_id === contactId && log.datetime)
      .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

    if (logsForContact.length === 0) {
      return { label: "Never", isStale: true };
    }

    const last = new Date(logsForContact[0].datetime);
    const now = new Date();
    const diffMs = now.getTime() - last.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const isStale = diffDays > 90;

    const formattedLabel = last.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return { label: formattedLabel, isStale };
  };

  const handleCreateContact = async () => {
    if (!agencyIdNum) return;
    if (!newContactName.trim()) return;
    const payload = {
      name: newContactName.trim(),
      title: newContactTitle.trim() || undefined,
      email: newContactEmail.trim() || undefined,
      phone: newContactPhone.trim() || undefined,
      linkedin_url: newContactLinkedIn.trim() || undefined,
      notes: newContactNotes.trim() || undefined,
      agency_id: agencyIdNum,
    };
    try {
      await apiPost<Contact, typeof payload>("/contacts", payload);
      setNewContactName("");
      setNewContactTitle("");
      setNewContactEmail("");
      setNewContactPhone("");
      setNewContactLinkedIn("");
      setNewContactNotes("");
      setIsAddingContact(false);
      const refreshed = await apiGet<Contact[]>(`/contacts?agency_id=${agencyIdNum}`);
      setContacts(refreshed || []);
      if (refreshed && refreshed.length > 0) {
        const firstContactId = refreshed[0].id;
        setSelectedContactId(firstContactId);
        setPrimaryContactId(firstContactId);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create contact");
    }
  };

  const handleCreateLog = async () => {
    if (!agencyIdNum) return;
    setHasAttemptedSubmit(true);
    
    // Validation
    if (!selectedUnderwriter.trim() || !logAction.trim()) {
      setLogError("Underwriter and action are required.");
      return;
    }
    
    if (!selectedContactId) {
      setLogError("A contact must be selected.");
      return;
    }
    
    if (!logDate) {
      setLogError("Date is required.");
      return;
    }
    
    try {
      setIsSavingLog(true);
      setLogError(null);
      setLogSuccess(null);
      
      const datetimeIso = (() => {
        if (logDate) {
          // Use the selected date at midnight (no time component)
          const dateOnly = new Date(logDate);
          dateOnly.setHours(0, 0, 0, 0);
          return dateOnly.toISOString();
        }
        // Use today's date at midnight (no time component)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today.toISOString();
      })();
      
      const office = agency?.office_id ? String(agency.office_id) : null;
      
      // Get the contact name to freeze in the log
      const contactObj = contacts.find(c => c.id === selectedContactId);
      const contactName = contactObj?.name || null;
      
      // Create single log entry
      const payload = {
        user: selectedUnderwriter.trim(),
        datetime: datetimeIso,
        action: logAction.trim(),
        agency_id: agencyIdNum,
        office,
        notes: logNotes.trim() || null,
        contact_id: selectedContactId,
        contact: contactName,
      };
      
      await apiPost<Log, typeof payload>("/logs", payload);
      
      // Refresh logs
      const refreshed = await apiGet<Log[]>(`/logs?agency_id=${agencyIdNum}`);
      setLogs(refreshed || []);
      
      // Clear form
      setLogNotes("");
      setLogAction("In Person");
      setLogDate("");
      setLogSuccess("Marketing log saved.");
      setHasAttemptedSubmit(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setLogSuccess(null), 3000);
    } catch (err: any) {
      setLogError(err?.message || "Failed to create log");
    } finally {
      setIsSavingLog(false);
    }
  };
  
  const handleDeleteLog = async (logId: number) => {
    if (!agencyIdNum) return;
    setIsDeletingLogId(logId);
    setLogError(null);
    try {
      await apiDelete(`/logs/${logId}`);
      const refreshed = await apiGet<Log[]>(`/logs?agency_id=${agencyIdNum}`);
      setLogs(refreshed || []);
      setLogSuccess("Log deleted.");
      setTimeout(() => setLogSuccess(null), 3000);
    } catch (err: any) {
      setLogError(err?.message || "Failed to delete log");
    } finally {
      setIsDeletingLogId(null);
    }
  };

  const handleEditContact = () => {
    if (!selectedContact) return;
    setEditContactName(selectedContact.name);
    setEditContactTitle(selectedContact.title || "");
    setEditContactEmail(selectedContact.email || "");
    setEditContactPhone(selectedContact.phone || "");
    setIsEditingContact(true);
  };

  const handleSaveContactEdit = async () => {
    if (!agencyIdNum || !selectedContact) return;
    try {
      const payload = {
        name: editContactName.trim(),
        title: editContactTitle.trim() || undefined,
        email: editContactEmail.trim() || undefined,
        phone: editContactPhone.trim() || undefined,
      };
      await apiPut(`/contacts/${selectedContact.id}`, payload);
      const refreshed = await apiGet<Contact[]>(`/contacts?agency_id=${agencyIdNum}`);
      setContacts(refreshed || []);
      setIsEditingContact(false);
    } catch (err: any) {
      setError(err?.message || "Failed to update contact");
    }
  };

  const handleDeleteContact = async () => {
    if (!agencyIdNum || !selectedContact) return;
    if (!window.confirm(`Are you sure you want to delete contact "${selectedContact.name}"?`)) {
      return;
    }
    try {
      await apiDelete(`/contacts/${selectedContact.id}`);
      const refreshed = await apiGet<Contact[]>(`/contacts?agency_id=${agencyIdNum}`);
      setContacts(refreshed || []);
      if (selectedContact.id === selectedContactId) {
        setSelectedContactId(refreshed && refreshed.length > 0 ? refreshed[0].id : null);
        setPrimaryContactId(refreshed && refreshed.length > 0 ? refreshed[0].id : null);
      }
      if (selectedContact.id === primaryContactId) {
        setPrimaryContactId(refreshed && refreshed.length > 0 ? refreshed[0].id : null);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to delete contact");
    }
  };

  const handleEditAgency = () => {
    if (!agency) return;
    setEditAgencyName(agency.name || "");
    setEditAgencyDBA(agency.dba || "");
    setEditAgencyWebAddress(agency.web_address || "");
    setEditAgencyPrimaryUW(agency.primary_underwriter_id || null);
    setIsEditingAgency(true);
  };

  const handleSaveAgency = async () => {
    if (!agencyIdNum || !agency) return;
    if (!editAgencyName.trim()) {
      alert("Agency name is required.");
      return;
    }
    try {
      // Find the employee name for the selected underwriter ID
      const selectedEmployee = employees.find(e => e.id === editAgencyPrimaryUW);
      const payload = {
        name: editAgencyName.trim(),
        code: agency.code, // Preserve existing code
        office_id: agency.office_id, // Preserve existing office
        dba: editAgencyDBA.trim() || undefined,
        web_address: editAgencyWebAddress.trim() || undefined,
        primary_underwriter_id: editAgencyPrimaryUW || undefined,
        primary_underwriter: selectedEmployee?.name || undefined,
      };
      await apiPut(`/agencies/${agencyIdNum}`, payload);
      const refreshed = await apiGet<Agency[]>("/agencies");
      const updatedAgency = refreshed?.find(a => a.id === agencyIdNum);
      setAgency(updatedAgency || null);
      setIsEditingAgency(false);
    } catch (err: any) {
      setError(err?.message || "Failed to update agency");
    }
  };


  const formatDateTime = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    // Only show date, no time
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <>
      <div
        style={{
          height: 56,
          background: "linear-gradient(90deg, #111827, #1f2933)",
          color: "#f9fafb",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: "0.01em",
        }}
      >
        Agency Contact and Call Tracking
      </div>
      <div
        style={{
          padding: 16,
          display: "grid",
          gridTemplateColumns: "1.1fr 1.4fr 1.3fr",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        {/* LEFT COLUMN: Contacts */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Contacts</div>
          <button
            type="button"
            onClick={() => setIsAddingContact((v) => !v)}
            style={{
              padding: "6px 8px",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              background: "#f9fafb",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {isAddingContact ? "Close" : "Add Contact"}
          </button>
        </div>

        {isAddingContact && (
          <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            <input
              placeholder="Name*"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Title"
              value={newContactTitle}
              onChange={(e) => setNewContactTitle(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Email"
              value={newContactEmail}
              onChange={(e) => setNewContactEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Phone"
              value={newContactPhone}
              onChange={(e) => setNewContactPhone(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="LinkedIn URL"
              value={newContactLinkedIn}
              onChange={(e) => setNewContactLinkedIn(e.target.value)}
              style={inputStyle}
            />
            <textarea
              placeholder="Notes"
              value={newContactNotes}
              onChange={(e) => setNewContactNotes(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
              <button
                type="button"
                onClick={handleCreateContact}
                style={{
                  padding: "7px 10px",
                  borderRadius: 6,
                  border: "1px solid #2563eb",
                  background: "#2563eb",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
                disabled={!newContactName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 8 }}>
          <input
            type="text"
            placeholder="Search contacts-"
            value={contactSearch}
            onChange={(e) => setContactSearch(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {filteredContacts.map((c) => {
            const { label, isStale } = getContactedInfoForContact(c.id);
            const isPrimary = primaryContactId === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setPrimaryContactId(c.id)}
                style={{
                  textAlign: "left",
                  padding: "6px 8px",
                  borderRadius: 6,
                  border: "none",
                  backgroundColor: isPrimary ? "#eff6ff" : "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 12, minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: isPrimary ? 600 : 500 }}>{c.name}</span>
                    {c.title && (
                      <span style={{ color: "#6b7280" }}>
                        {" / "}
                        {c.title}
                      </span>
                    )}
                    {c.email && (
                      <>
                        {" / "}
                        <a href={`mailto:${c.email}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                          {c.email}
                        </a>
                      </>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      color: isStale ? "#b91c1c" : "#6b7280",
                    }}
                  >
                    {label === "never"
                      ? `Contacted: never`
                      : `Contacted: ${label}`}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredContacts.length === 0 && (
            <div style={{ fontSize: 12, color: "#6b7280" }}>No contacts found.</div>
          )}
        </div>
      </div>

      {/* MIDDLE COLUMN: Agency info + selected contact detail */}
      <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            marginBottom: 12,
            paddingBottom: 12,
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              {agency?.name || "Agency"}
            </div>
            {!isEditingAgency && (
              <button
                type="button"
                onClick={handleEditAgency}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid #2563eb",
                  background: "#fff",
                  color: "#2563eb",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                Edit Agency
              </button>
            )}
          </div>

          {isEditingAgency ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <label style={labelStyle}>Agency Name*</label>
                <input
                  value={editAgencyName}
                  onChange={(e) => setEditAgencyName(e.target.value)}
                  style={inputStyle}
                  placeholder="Agency Name"
                />
              </div>
              <div>
                <label style={labelStyle}>DBA (Doing Business As)</label>
                <input
                  value={editAgencyDBA}
                  onChange={(e) => setEditAgencyDBA(e.target.value)}
                  style={inputStyle}
                  placeholder="Optional DBA name"
                />
              </div>
              <div>
                <label style={labelStyle}>Web Address</label>
                <input
                  type="url"
                  value={editAgencyWebAddress}
                  onChange={(e) => setEditAgencyWebAddress(e.target.value)}
                  style={inputStyle}
                  placeholder="https://www.example.com"
                />
              </div>
              <div>
                <label style={labelStyle}>Primary Underwriter</label>
                <select
                  value={editAgencyPrimaryUW || ""}
                  onChange={(e) => setEditAgencyPrimaryUW(e.target.value ? Number(e.target.value) : null)}
                  style={selectStyle}
                >
                  <option value="">Unassigned</option>
                  {officeEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={handleSaveAgency}
                  style={{
                    ...primaryButtonStyle,
                    padding: "6px 16px",
                    fontSize: 12,
                  }}
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingAgency(false)}
                  style={{
                    ...secondaryButtonStyle,
                    padding: "6px 16px",
                    fontSize: 12,
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {agency?.dba && (
                <div style={{ fontSize: 16, fontWeight: 600, color: "#4b5563", marginTop: 2, marginBottom: 8 }}>
                  {agency.dba}
                </div>
              )}
              <div style={{ fontSize: 14, color: "#4b5563", marginBottom: 4 }}>
                Code: <strong>{agency?.code || "—"}</strong>
                {"  "}·{"  "}
                Primary UW: {agency?.primary_underwriter ? (
                  <strong>
                    <button
                      type="button"
                      onClick={() => {
                        const uw = officeEmployees.find(e => e.name === agency?.primary_underwriter || e.id === agency?.primary_underwriter_id);
                        const params = new URLSearchParams();
                        if (uw?.id) params.set("employeeId", String(uw.id));
                        if (agency?.primary_underwriter) params.set("employeeName", agency.primary_underwriter);
                        navigate(`/crm/employees?${params.toString()}`);
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#2563eb",
                        cursor: "pointer",
                        textDecoration: "underline",
                        padding: 0,
                        fontSize: "inherit",
                        fontWeight: "inherit",
                      }}
                    >
                      {agency.primary_underwriter}
                    </button>
                  </strong>
                ) : (
                  <strong>Unassigned</strong>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                {agency?.web_address && (
                  <div style={{ fontSize: 13 }}>
                    <span style={{ color: "#6b7280", marginRight: 6 }}>Website:</span>
                    <a
                      href={agency.web_address.startsWith('http') ? agency.web_address : `https://${agency.web_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#2563eb", textDecoration: "underline" }}
                    >
                      {agency.web_address}
                    </a>
                  </div>
                )}
                {contacts.filter(c => c.email).length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    <a
                      href={`mailto:?bcc=${contacts.filter(c => c.email).map(c => c.email).join(',')}`}
                      style={{
                        color: "#2563eb",
                        textDecoration: "none",
                        fontSize: 12,
                        padding: "4px 8px",
                        border: "1px solid #2563eb",
                        borderRadius: 4,
                        cursor: "pointer",
                        display: "inline-block",
                      }}
                    >
                      Email All Contacts
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {agency?.notes && <div style={{ fontSize: 12 }}>Notes: {agency.notes}</div>}

        {selectedContact && (
          <div 
            style={{ 
              marginTop: 16,
              padding: "20px",
              background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
              borderRadius: 12,
              border: "2px solid #e2e8f0",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Contact Details
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={handleEditContact}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid #2563eb",
                    background: "#eff6ff",
                    color: "#2563eb",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#2563eb";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#eff6ff";
                    e.currentTarget.style.color = "#2563eb";
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleDeleteContact}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid #ef4444",
                    background: "#fef2f2",
                    color: "#b91c1c",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#ef4444";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#fef2f2";
                    e.currentTarget.style.color = "#b91c1c";
                  }}
                >
                  Delete
                </button>
              </div>
            </div>

            {isEditingContact ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                <input
                  placeholder="Name*"
                  value={editContactName}
                  onChange={(e) => setEditContactName(e.target.value)}
                  style={inputStyle}
                />
                <input
                  placeholder="Title"
                  value={editContactTitle}
                  onChange={(e) => setEditContactTitle(e.target.value)}
                  style={inputStyle}
                />
                <input
                  placeholder="Email"
                  value={editContactEmail}
                  onChange={(e) => setEditContactEmail(e.target.value)}
                  style={inputStyle}
                />
                <input
                  placeholder="Phone"
                  value={editContactPhone}
                  onChange={(e) => setEditContactPhone(e.target.value)}
                  style={inputStyle}
                />
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingContact(false)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "1px solid #d1d5db",
                      background: "#f9fafb",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveContactEdit}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "1px solid #2563eb",
                      background: "#2563eb",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                    disabled={!editContactName.trim()}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Name and Title */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
                    {selectedContact.name}
                  </div>
                  {selectedContact.title && (
                    <div style={{ fontSize: 14, color: "#64748b", fontWeight: 500 }}>
                      {selectedContact.title}
                    </div>
                  )}
                </div>

                {/* Contact Information Grid */}
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "auto 1fr", 
                  gap: "12px 16px",
                  marginBottom: 16,
                  padding: "16px",
                  background: "#ffffff",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                }}>
                  {selectedContact.phone && (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>📞</div>
                      <div style={{ fontSize: 13, color: "#111827" }}>
                        <a href={`tel:${selectedContact.phone}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                          {selectedContact.phone}
                        </a>
                      </div>
                    </>
                  )}
                  {selectedContact.email && (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>✉️</div>
                      <div style={{ fontSize: 13, color: "#111827" }}>
                        <a href={`mailto:${selectedContact.email}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                          {selectedContact.email}
                        </a>
                      </div>
                    </>
                  )}
                  {selectedContact.linkedin_url && (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>🔗</div>
                      <div style={{ fontSize: 13, color: "#111827" }}>
                        <a
                          href={selectedContact.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#2563eb", textDecoration: "none" }}
                        >
                          LinkedIn Profile
                        </a>
                      </div>
                    </>
                  )}
                </div>

                {/* Contact Notes */}
                {(selectedContact.notes && selectedContact.notes.trim().length > 0) && (
                  <div
                    style={{
                      fontSize: 12,
                      marginBottom: 16,
                      padding: "12px",
                      background: "#fffbeb",
                      borderLeft: "3px solid #f59e0b",
                      borderRadius: 6,
                      whiteSpace: "pre-wrap",
                      color: "#92400e",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", marginBottom: 6, color: "#b45309" }}>
                      Notes
                    </div>
                    {selectedContact.notes}
                  </div>
                )}

                {/* Marketing Calls Section */}
                <div
                  style={{
                    fontSize: 12,
                    paddingTop: 16,
                    borderTop: "2px solid #e2e8f0",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "#111827" }}>
                    📞 Marketing Calls for This Contact
                  </div>
                  {(() => {
                    const logsForContact = logsForAgency
                      .filter((log) => log.contact_id === selectedContact.id)
                      .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
                    
                    if (logsForContact.length === 0) {
                      return (
                        <div style={{ 
                          fontSize: 12, 
                          color: "#94a3b8",
                          padding: "16px",
                          textAlign: "center",
                          background: "#f8fafc",
                          borderRadius: 8,
                          border: "1px dashed #cbd5e1",
                        }}>
                          No marketing calls yet for this contact.
                        </div>
                      );
                    }
                    
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {logsForContact.map((log) => (
                          <div
                            key={log.id}
                            style={{
                              fontSize: 12,
                              padding: "12px",
                              background: "#f8fafc",
                              borderRadius: 8,
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            <div style={{ display: "flex", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 600, color: "#111827" }}>{formatDateTime(log.datetime)}</span>
                              <span style={{ color: "#cbd5e1" }}>•</span>
                              <span style={{ color: "#64748b" }}>{log.user}</span>
                              <span style={{ color: "#cbd5e1" }}>•</span>
                              <span style={{ 
                                padding: "2px 8px",
                                background: "#dbeafe",
                                color: "#1e40af",
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600,
                              }}>
                                {log.action}
                              </span>
                            </div>
                            {log.notes && (
                              <div style={{ color: "#475569", fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
                                {log.notes.length > 80 ? `${log.notes.slice(0, 80)}...` : log.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Log form + history */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Log New Marketing Call</div>
          
          {/* Contact Select */}
          <label style={{ fontSize: 12, color: "#374151", display: "block" }}>
            Contact
            <select
              value={selectedContactId || ""}
              onChange={(e) => {
                const contactId = e.target.value ? Number(e.target.value) : null;
                setSelectedContactId(contactId);
                if (contactId) {
                  setPrimaryContactId(contactId);
                }
              }}
              style={selectStyle}
            >
              <option value="">Select a contact...</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.title ? ` - ${c.title}` : ""}
                </option>
              ))}
            </select>
          </label>

          {/* Underwriter Select */}
          <label style={{ fontSize: 12, color: "#374151", display: "block" }}>
            Underwriter
            <select
              value={selectedUnderwriter}
              onChange={(e) => setSelectedUnderwriter(e.target.value)}
              style={selectStyle}
            >
              <option value="">Select an underwriter...</option>
              {underwritersForOffice.map((uw) => (
                <option key={uw.id} value={uw.name}>
                  {uw.name}
                </option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: 12, color: "#374151", display: "block" }}>
            Action
            <select
              value={logAction}
              onChange={(e) => setLogAction(e.target.value as LogAction)}
              style={inputStyle}
            >
              {LOG_ACTION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, color: "#374151", flex: 1, minWidth: 140 }}>
              Date
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>

          <label style={{ fontSize: 12, color: "#374151", display: "block" }}>
            Notes
            <textarea
              value={logNotes}
              onChange={(e) => setLogNotes(e.target.value)}
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </label>

          {logError && <div style={{ color: "red", fontSize: 12 }}>{logError}</div>}
          {hasAttemptedSubmit && !isLogFormValid && !logError && (
            <div style={{ color: "#b91c1c", fontSize: 12 }}>
              Contact, underwriter, action, and date are required to save a log.
            </div>
          )}
          {logSuccess && <div style={{ color: "#16a34a", fontSize: 12 }}>{logSuccess}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleCreateLog}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #2563eb",
                background: "#2563eb",
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: 600,
              }}
              disabled={isSavingLog || !isLogFormValid}
            >
              {isSavingLog ? "Saving..." : "Save Log"}
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Marketing Log History</div>
          {logsForAgency.length === 0 ? (
            <div style={{ fontSize: 12, color: "#6b7280" }}>No marketing logs yet for this agency.</div>
          ) : (
            <div style={tableContainerStyle}>
              <table style={tableBaseStyle}>
                <thead>
                  <tr>
                    <th style={tableHeaderStickyStyle}>Date</th>
                    <th style={tableHeaderStickyStyle}>Contact</th>
                    <th style={tableHeaderStickyStyle}>User</th>
                    <th style={tableHeaderStickyStyle}>Action</th>
                    <th style={tableHeaderStickyStyle}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {logsForAgency
                    .slice()
                    .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
                    .map((log) => {
                      // Prefer frozen contact name, fall back to current contact lookup
                      const contactName =
                        log.contact ??
                        (log.contact_id
                          ? contacts.find(c => c.id === log.contact_id)?.name || null
                          : null) ??
                        "—";
                      
                      const isExpanded = expandedLogId === log.id;
                      const hasLongNotes = log.notes && log.notes.length > 80;
                      
                      const contact = log.contact_id ? contacts.find(c => c.id === log.contact_id) : null;
                      const logEmployee = officeEmployees.find(e => e.name.toLowerCase() === (log.user || "").toLowerCase());
                      
                      return (
                        <React.Fragment key={log.id}>
                          <tr>
                            <td style={tableCellStyle}>{formatDateTime(log.datetime)}</td>
                            <td style={tableCellStyle}>
                              {contact ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedContactId(contact.id)}
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    color: "#2563eb",
                                    cursor: "pointer",
                                    textDecoration: "underline",
                                    padding: 0,
                                    fontSize: "inherit",
                                  }}
                                >
                                  {contactName}
                                </button>
                              ) : (
                                contactName
                              )}
                            </td>
                            <td style={tableCellStyle}>
                              {logEmployee ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const params = new URLSearchParams();
                                    if (logEmployee.id) params.set("employeeId", String(logEmployee.id));
                                    if (logEmployee.name) params.set("employeeName", logEmployee.name);
                                    navigate(`/crm/employees?${params.toString()}`);
                                  }}
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    color: "#2563eb",
                                    cursor: "pointer",
                                    textDecoration: "underline",
                                    padding: 0,
                                    fontSize: "inherit",
                                  }}
                                >
                                  {log.user}
                                </button>
                              ) : (
                                log.user
                              )}
                            </td>
                            <td style={tableCellStyle}>{log.action}</td>
                            <td style={{ ...tableCellStyle, maxWidth: 240 }}>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  {hasLongNotes && !isExpanded ? (
                                    <>
                                      <span>{log.notes!.slice(0, 80)}...</span>
                                      <button
                                        type="button"
                                        onClick={() => setExpandedLogId(log.id)}
                                        style={{
                                          marginLeft: 4,
                                          border: "none",
                                          background: "none",
                                          color: "#2563eb",
                                          cursor: "pointer",
                                          fontSize: 11,
                                          textDecoration: "underline",
                                          padding: 0,
                                        }}
                                      >
                                        more
                                      </button>
                                    </>
                                  ) : (
                                    <span>{log.notes || "—"}</span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLog(log.id)}
                                  style={{
                                    border: "1px solid #ef4444",
                                    background: "#fff",
                                    color: "#b91c1c",
                                    borderRadius: 4,
                                    padding: "2px 6px",
                                    fontSize: 11,
                                    cursor: "pointer",
                                    flexShrink: 0,
                                  }}
                                  disabled={isDeletingLogId === log.id}
                                >
                                  {isDeletingLogId === log.id ? "Deleting..." : "Delete"}
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && hasLongNotes && (
                            <tr>
                              <td colSpan={5} style={{ ...tableCellStyle, background: "#f9fafb", padding: "8px 12px" }}>
                                <div style={{ fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                  <strong>Full Notes:</strong> {log.notes}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setExpandedLogId(null)}
                                  style={{
                                    marginTop: 6,
                                    border: "none",
                                    background: "none",
                                    color: "#2563eb",
                                    cursor: "pointer",
                                    fontSize: 11,
                                    textDecoration: "underline",
                                    padding: 0,
                                  }}
                                >
                                  show less
                                </button>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {error && <div style={{ gridColumn: "1 / span 3", color: "red", fontSize: 12 }}>{error}</div>}
      {isLoading && <div style={{ gridColumn: "1 / span 3", fontSize: 12, color: "#6b7280" }}>Loading agency...</div>}
      </div>

      {/* Agency Production Graph - Full Width */}
      {agency && agency.code && (
        <TabbedProductionGraph
          productionData={productionData.filter(p => p.agency_code === agency.code)}
          title={`Written Premium Trend - ${agency.name}${agency.code ? ` (${agency.code})` : ''}`}
          height={280}
        />
      )}
    </>
  );
};

export default CrmAgencyDetailPage;
