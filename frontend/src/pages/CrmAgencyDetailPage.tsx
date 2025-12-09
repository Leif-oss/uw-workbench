import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiGet, apiPost } from "../api/client";

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
};

 type Contact = {
  id: number;
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  agency_id: number;
  notes?: string | null;
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
};

 const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 10,
  backgroundColor: "#ffffff",
};

 const logFieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 13,
  lineHeight: "20px",
  backgroundColor: "#f9fafb",
};

 const CrmAgencyDetailPage: React.FC = () => {
  const { agencyId } = useParams<{ agencyId: string }>();
  const navigate = useNavigate();
  const agencyIdNum = agencyId ? Number(agencyId) : null;

  const [agency, setAgency] = useState<Agency | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contactSearch, setContactSearch] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);

  const [logUser, setLogUser] = useState("");
  const [logContact, setLogContact] = useState("");
  const [logAction, setLogAction] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [logDate, setLogDate] = useState("");
  const [logTime, setLogTime] = useState("");
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const [newContactName, setNewContactName] = useState("");
  const [newContactTitle, setNewContactTitle] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactNotes, setNewContactNotes] = useState("");
  const [isAddingContact, setIsAddingContact] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!agencyIdNum) return;
      setIsLoading(true);
      setError(null);
      try {
        const [agenciesResp, contactsResp, employeesResp, logsResp] = await Promise.all([
          apiGet<Agency[]>("/agencies"),
          apiGet<Contact[]>(`/contacts?agency_id=${agencyIdNum}`),
          apiGet<Employee[]>("/employees"),
          apiGet<Log[]>(`/logs?agency_id=${agencyIdNum}`),
        ]);
        const found = (agenciesResp || []).find((a) => a.id === agencyIdNum) || null;
        setAgency(found);
        setContacts(contactsResp || []);
        setEmployees(employeesResp || []);
        setLogs(logsResp || []);
        if (contactsResp && contactsResp.length > 0) {
          setSelectedContactId(contactsResp[0].id);
          setLogContact(String(contactsResp[0].id));
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
    if (selectedContactId) {
      return contacts.find((c) => c.id === selectedContactId) || null;
    }
    return contacts[0] || null;
  }, [contacts, selectedContactId]);

  const logsForAgency = useMemo(() => logs, [logs]);

  const underwritersForOffice = useMemo(() => {
    if (!agency || !agency.office_id) return [] as Employee[];
    return employees.filter((e) => e.office_id === agency.office_id);
  }, [agency, employees]);

  const handleCreateContact = async () => {
    if (!agencyIdNum) return;
    if (!newContactName.trim()) return;
    const payload = {
      name: newContactName.trim(),
      title: newContactTitle.trim() || undefined,
      email: newContactEmail.trim() || undefined,
      phone: newContactPhone.trim() || undefined,
      notes: newContactNotes.trim() || undefined,
      agency_id: agencyIdNum,
    };
    try {
      await apiPost<Contact, typeof payload>("/contacts", payload);
      setNewContactName("");
      setNewContactTitle("");
      setNewContactEmail("");
      setNewContactPhone("");
      setNewContactNotes("");
      setIsAddingContact(false);
      const refreshed = await apiGet<Contact[]>(`/contacts?agency_id=${agencyIdNum}`);
      setContacts(refreshed || []);
      if (refreshed && refreshed.length > 0) {
        setSelectedContactId(refreshed[0].id);
        setLogContact(String(refreshed[0].id));
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create contact");
    }
  };

  const handleCreateLog = async () => {
    if (!agencyIdNum) return;
    if (!logUser.trim() || !logAction.trim()) {
      setLogError("User and action are required.");
      return;
    }
    try {
      setIsSavingLog(true);
      setLogError(null);
      const datetimeIso = (() => {
        if (logDate) {
          const timePart = logTime || "09:00";
          const localString = `${logDate}T${timePart}`;
          const dt = new Date(localString);
          return dt.toISOString();
        }
        return new Date().toISOString();
      })();
      const payload = {
        user: logUser.trim(),
        datetime: datetimeIso,
        action: logAction.trim(),
        agency_id: agencyIdNum,
        office: agency?.office_id ? String(agency.office_id) : null,
        notes: logNotes.trim() || null,
      };
      await apiPost<Log, typeof payload>("/logs", payload);
      const refreshed = await apiGet<Log[]>(`/logs?agency_id=${agencyIdNum}`);
      setLogs(refreshed || []);
      setLogNotes("");
      setLogAction("");
      setLogDate("");
      setLogTime("");
    } catch (err: any) {
      setLogError(err?.message || "Failed to create log");
    } finally {
      setIsSavingLog(false);
    }
  };

  const formatDateTime = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };

  return (
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
              style={logFieldStyle}
            />
            <input
              placeholder="Title"
              value={newContactTitle}
              onChange={(e) => setNewContactTitle(e.target.value)}
              style={logFieldStyle}
            />
            <input
              placeholder="Email"
              value={newContactEmail}
              onChange={(e) => setNewContactEmail(e.target.value)}
              style={logFieldStyle}
            />
            <input
              placeholder="Phone"
              value={newContactPhone}
              onChange={(e) => setNewContactPhone(e.target.value)}
              style={logFieldStyle}
            />
            <textarea
              placeholder="Notes"
              value={newContactNotes}
              onChange={(e) => setNewContactNotes(e.target.value)}
              rows={3}
              style={{ ...logFieldStyle, resize: "vertical" }}
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
            style={logFieldStyle}
          />
        </div>

        <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {filteredContacts.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedContactId(c.id)}
              style={{
                textAlign: "left",
                padding: "6px 8px",
                borderRadius: 6,
                border: "none",
                backgroundColor: c.id === selectedContactId ? "#eff6ff" : "transparent",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <div style={{ fontWeight: 500 }}>{c.name}</div>
              {c.title && <div style={{ fontSize: 11, color: "#6b7280" }}>{c.title}</div>}
            </button>
          ))}
          {filteredContacts.length === 0 && <div style={{ fontSize: 12, color: "#6b7280" }}>No contacts found.</div>}
        </div>
      </div>

      {/* MIDDLE COLUMN: Agency info + selected contact detail */}
      <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            textAlign: "center",
            marginBottom: 12,
            paddingBottom: 12,
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#111827",
              marginBottom: 4,
            }}
          >
            {agency?.name || "Agency"}
          </div>

          <div style={{ fontSize: 14, color: "#4b5563" }}>
            Code: <strong>{agency?.code || "—"}</strong>
            {"  "}·{"  "}
            Primary UW: <strong>{agency?.primary_underwriter || "Unassigned"}</strong>
          </div>
        </div>

        {agency?.notes && <div style={{ fontSize: 12 }}>Notes: {agency.notes}</div>}

        {selectedContact && (
          <div style={{ marginTop: 4, paddingTop: 6, borderTop: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Contact Details</div>
            <div style={{ fontSize: 13 }}>{selectedContact.name}</div>
            {selectedContact.title && <div style={{ fontSize: 12, color: "#6b7280" }}>{selectedContact.title}</div>}
            {selectedContact.phone && <div style={{ fontSize: 12 }}>Phone: {selectedContact.phone}</div>}
            {selectedContact.email && <div style={{ fontSize: 12 }}>Email: {selectedContact.email}</div>}
            {selectedContact.notes && <div style={{ fontSize: 12, marginTop: 4 }}>Notes: {selectedContact.notes}</div>}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Log form + history */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Log New Marketing Call</div>
          <label style={{ fontSize: 12, color: "#374151", display: "block" }}>
            Underwriter
            <select
              value={logUser}
              onChange={(e) => setLogUser(e.target.value)}
              style={logFieldStyle}
              disabled={!underwritersForOffice.length}
            >
              <option value="">Select underwriter-</option>
              {underwritersForOffice.map((uw) => (
                <option key={uw.id} value={uw.name}>
                  {uw.name}
                </option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: 12, color: "#374151", display: "block" }}>
            Contact
            <select
              value={logContact}
              onChange={(e) => setLogContact(e.target.value)}
              style={logFieldStyle}
              disabled={!contacts.length}
            >
              <option value="">Select contact-</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: 12, color: "#374151", display: "block" }}>
            Action
            <select
              value={logAction}
              onChange={(e) => setLogAction(e.target.value)}
              style={logFieldStyle}
            >
              <option value="">Select action-</option>
              <option value="In person marketing call">In person marketing call</option>
              <option value="Phone / Zoom / Email">Phone / Zoom / Email</option>
            </select>
          </label>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, color: "#374151", flex: 1, minWidth: 140 }}>
              Date
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                style={logFieldStyle}
              />
            </label>
            <label style={{ fontSize: 12, color: "#374151", flex: 1, minWidth: 140 }}>
              Time
              <input
                type="time"
                value={logTime}
                onChange={(e) => setLogTime(e.target.value)}
                style={logFieldStyle}
              />
            </label>
          </div>

          <label style={{ fontSize: 12, color: "#374151", display: "block" }}>
            Notes
            <textarea
              value={logNotes}
              onChange={(e) => setLogNotes(e.target.value)}
              rows={4}
              style={{ ...logFieldStyle, resize: "vertical" }}
            />
          </label>

          {logError && <div style={{ color: "red", fontSize: 12 }}>{logError}</div>}

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
              disabled={isSavingLog}
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
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                  <th style={{ padding: "4px 6px" }}>Date/Time</th>
                  <th style={{ padding: "4px 6px" }}>User</th>
                  <th style={{ padding: "4px 6px" }}>Action</th>
                  <th style={{ padding: "4px 6px" }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {logsForAgency
                  .slice()
                  .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
                  .map((log) => (
                    <tr key={log.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "4px 6px" }}>{formatDateTime(log.datetime)}</td>
                      <td style={{ padding: "4px 6px" }}>{log.user}</td>
                      <td style={{ padding: "4px 6px" }}>{log.action}</td>
                      <td style={{ padding: "4px 6px", maxWidth: 240 }}>
                        {log.notes && log.notes.length > 80 ? `${log.notes.slice(0, 80)}-` : log.notes}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {error && <div style={{ gridColumn: "1 / span 3", color: "red", fontSize: 12 }}>{error}</div>}
      {isLoading && <div style={{ gridColumn: "1 / span 3", fontSize: 12, color: "#6b7280" }}>Loading agency...</div>}
    </div>
  );
};

export default CrmAgencyDetailPage;
