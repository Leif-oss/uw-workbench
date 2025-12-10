



import React, { useEffect, useMemo, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import { apiGet, apiPost, apiDelete, apiPut } from "../api/client";

import { WorkbenchLayout } from "../components/WorkbenchLayout";
import {
  cardStyle,
  panelStyle,
  inputStyle,
  labelStyle,
  sidebarHeadingStyle,
  tableContainerStyle,
  tableBaseStyle,
  tableHeaderCellStyle,
  tableCellStyle,
  tableHeaderStickyStyle,
  kpiLabelStyle,
  kpiValueStyle,
  kpiSubtextStyle,
  sectionHeadingStyle,
  sectionSubheadingStyle,
  selectStyle,
} from "../ui/designSystem";



type Agency = {

  id: number;

  name: string;

  code?: string;

  office_id?: number | null;

  primary_underwriter_id?: number | null;

  primary_underwriter?: string | null;

  active_flag?: string | null;

  dba?: string | null;

  email?: string | null;

};



type Office = {

  id: number;

  code: string;

  name: string;

};



type Employee = {

  id: number;

  name: string;

  office_id: number | null;

};



type Contact = {

  id: number;

  name: string;

  title?: string | null;

  email?: string | null;

  phone?: string | null;

  agency_id: number;

  linkedin_url?: string | null;

  notes?: string | null;

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



const AgenciesPage: React.FC = () => {



  const [status, setStatus] = useState<string>("");

  const [agencies, setAgencies] = useState<Agency[]>([]);

  const [offices, setOffices] = useState<Office[]>([]);

  const [employees, setEmployees] = useState<Employee[]>([]);

  const [loading, setLoading] = useState(false);

  const [secondaryLoading, setSecondaryLoading] = useState(false);



  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);

  const [contacts, setContacts] = useState<Contact[]>([]);

  const [logs, setLogs] = useState<Log[]>([]);



  // Edit contact state
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editName, setEditName] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLinkedIn, setEditLinkedIn] = useState("");
  const [editNotes, setEditNotes] = useState("");



  const [logUser, setLogUser] = useState<string>("");

  const [logContact, setLogContact] = useState<string>("");

  const [logAction, setLogAction] = useState<string>("");

  const [logNotes, setLogNotes] = useState<string>("");

  const [logDate, setLogDate] = useState("");

  const [logTime, setLogTime] = useState("");

  const [logOffice, setLogOffice] = useState("");

  const [isSavingLog, setIsSavingLog] = useState(false);

  const [logError, setLogError] = useState<string | null>(null);



  const [logFilterUser, setLogFilterUser] = useState("");

  const [logFilterRange, setLogFilterRange] = useState<"all" | "30d">("all");

  const [logFilterAction, setLogFilterAction] = useState("all");



  const [searchText, setSearchText] = useState("");

  const [officeFilter, setOfficeFilter] = useState<string>("all");

  const [underwriterFilter, setUnderwriterFilter] = useState<string>("all");



  const navigate = useNavigate();

  const location = useLocation();

  const isCrm = location.pathname.startsWith("/crm");



  const sortedLogs = useMemo(() => {

    return [...logs].sort((a, b) => {

      const da = new Date(a.datetime).getTime();

      const db = new Date(b.datetime).getTime();

      return db - da;

    });

  }, [logs]);



  const totalLogsCount = sortedLogs.length;



  const logsLast30Count = sortedLogs.filter((log) => {

    const dt = new Date(log.datetime).getTime();

    if (Number.isNaN(dt)) return false;

    const now = Date.now();

    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    return now - dt <= thirtyDaysMs;

  }).length;



  const distinctUsersCount = useMemo(() => {

    const s = new Set<string>();

    sortedLogs.forEach((log) => {

      const user = (log.user || "").trim().toLowerCase();

      if (user) s.add(user);

    });

    return s.size;

  }, [sortedLogs]);



  const availableActions = useMemo(() => {

    const s = new Set<string>();

    sortedLogs.forEach((log) => {

      const action = (log.action || "").trim();

      if (action) s.add(action);

    });

    return Array.from(s);

  }, [sortedLogs]);



  const filteredLogs = sortedLogs.filter((log) => {

    if (logFilterUser.trim()) {

      const needle = logFilterUser.trim().toLowerCase();

      if (!log.user.toLowerCase().includes(needle)) {

        return false;

      }

    }

    if (logFilterRange === "30d") {

      const dt = new Date(log.datetime).getTime();

      if (Number.isNaN(dt)) return false;

      const now = Date.now();

      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      if (now - dt > thirtyDaysMs) return false;

    }

    if (logFilterAction !== "all") {

      const action = (log.action || "").toLowerCase();

      if (action !== logFilterAction.toLowerCase()) return false;

    }

    return true;

  });



  const filteredAgencies = useMemo(() => {

    let result = agencies;

    if (searchText.trim()) {

      const needle = searchText.trim().toLowerCase();

      result = result.filter((ag) => {

        const name = (ag.name || "").toLowerCase();

        const code = (ag.code || "").toLowerCase();

        const dba = (ag.dba || "").toLowerCase();

        return name.includes(needle) || code.includes(needle) || dba.includes(needle);

      });

    }

    if (officeFilter !== "all") {

      const officeId = Number(officeFilter);

      if (!Number.isNaN(officeId)) {

        result = result.filter((ag) => ag.office_id === officeId);

      }

    }

    if (underwriterFilter !== "all") {

      const empId = Number(underwriterFilter);

      const emp = employees.find((e) => e.id === empId);

      const empName = (emp?.name || "").trim().toLowerCase();

      result = result.filter((ag) => {

        const matchesId =

          typeof ag.primary_underwriter_id === "number" &&

          ag.primary_underwriter_id === empId;

        const matchesName =

          empName &&

          (ag.primary_underwriter || "").trim().toLowerCase() === empName;

        return matchesId || matchesName;

      });

    }

    return result;

  }, [agencies, searchText, officeFilter, underwriterFilter, employees]);



  const totalAgencies = agencies.length;

  const agenciesInView = filteredAgencies.length;

  const selectedAgencyName = selectedAgency ? selectedAgency.name : "None";

  const ninetyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d;
  }, []);

  const getContactedInfoForContact = (contactId: number) => {
    if (!logs || !logs.length) {
      return { label: "never", isStale: true };
    }

    let matches = logs.filter((log) => {
      if (log.contact_id != null) {
        // eslint-disable-next-line eqeqeq
        return String(log.contact_id) == String(contactId);
      }
      return false;
    });

    if (!matches.length) {
      matches = logs;
    }

    if (!matches.length) {
      return { label: "never", isStale: true };
    }

    let latest: Date | null = null;
    matches.forEach((log) => {
      const d = new Date(log.datetime);
      if (!Number.isNaN(new Date(log.datetime).getTime())) {
        if (!latest || d > latest) latest = d;
      }
    });

    if (!latest) {
      return { label: "never", isStale: true };
    }

    const now = new Date();
    const diffMs = now.getTime() - latest.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const isStale = diffDays > 90;

    const label = latest.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return { label, isStale };
  };

  const underwritersForSelectedAgency = useMemo(
    () => {
      if (!selectedAgency || !selectedAgency.office_id) return [];
      return employees.filter((e) => e.office_id === selectedAgency.office_id);
    },
    [selectedAgency, employees],
  );






  const resetLogForm = () => {

    setLogUser("");

    setLogContact("");

    setLogAction("");

    setLogNotes("");

    setLogDate("");

    setLogTime("");

    setLogOffice("");

    setLogError(null);

    setIsSavingLog(false);

    setLogFilterUser("");

    setLogFilterRange("all");

    setLogFilterAction("all");

  };



  useEffect(() => {

    resetLogForm();

  }, [selectedAgency?.id]);



  const loadAllData = async () => {

    try {

      setLoading(true);

      setStatus("Loading agencies...");

      const [agenciesResp, officesResp, employeesResp] = await Promise.all([

        apiGet<Agency[]>("/agencies"),

        apiGet<Office[]>("/offices"),

        apiGet<Employee[]>("/employees"),

      ]);

      setAgencies(agenciesResp || []);

      setOffices(officesResp || []);

      setEmployees(employeesResp || []);

      setStatus(`Loaded ${agenciesResp?.length ?? 0} agencies.`);

    } catch (err: any) {

      setStatus(`Failed to load agencies: ${err?.message || err}`);

      setAgencies([]);

    } finally {

      setLoading(false);

    }

  };



  useEffect(() => {

    loadAllData();

  }, []);



  const handleDeleteAgency = async (id: number) => {

    try {

      setLoading(true);

      setStatus(`Deleting agency ID ${id}...`);

      await apiDelete(`/agencies/${id}`);

      const data = await apiGet<Agency[]>("/agencies");

      setAgencies(data);

      if (selectedAgency && selectedAgency.id === id) {

        setSelectedAgency(null);

        setContacts([]);

        setLogs([]);

      }

      setStatus(`Agency ID ${id} deleted.`);

    } catch (err: any) {

      setStatus(`Delete agency failed: ${err?.message || err}`);

    } finally {

      setLoading(false);

    }

  };



  const loadContactsAndLogs = async (agency: Agency) => {

    try {

      setSecondaryLoading(true);

      setStatus(`Loading contacts and logs for "${agency.name}"...`);

      const [contactsData, logsData] = await Promise.all([

        apiGet<Contact[]>(`/contacts?agency_id=${agency.id}`),

        apiGet<Log[]>(`/logs?agency_id=${agency.id}`),

      ]);

      setSelectedAgency(agency);

      setContacts(contactsData || []);

      setLogs(logsData || []);

      setStatus(

        `Loaded ${contactsData?.length ?? 0} contacts and ${logsData?.length ?? 0} logs for "${agency.name}".`,

      );

    } catch (err: any) {

      setStatus(`Loading contacts/logs failed: ${err?.message || err}`);

      setContacts([]);

      setLogs([]);

    } finally {

      setSecondaryLoading(false);

    }

  };



  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsEditingContact(true);
    setEditName(contact.name);
    setEditTitle(contact.title || "");
    setEditEmail(contact.email || "");
    setEditPhone(contact.phone || "");
    setEditLinkedIn(contact.linkedin_url || "");
    setEditNotes(contact.notes || "");
  };

  const handleSaveContact = async () => {
    if (!selectedContact || !selectedAgency) return;

    if (!editName.trim()) {
      alert("Contact name is required.");
      return;
    }

    const payload = {
      name: editName.trim() || undefined,
      title: editTitle.trim() || undefined,
      email: editEmail.trim() || undefined,
      phone: editPhone.trim() || undefined,
      linkedin_url: editLinkedIn.trim() || undefined,
      notes: editNotes.trim() || undefined,
      agency_id: selectedContact.agency_id,
    };

    try {
      await apiPut<Contact, typeof payload>(`/contacts/${selectedContact.id}`, payload);
      // Reload contacts for the selected agency
      await loadContactsAndLogs(selectedAgency);
      // Update the selected contact reference
      const refreshedContact = contacts.find(c => c.id === selectedContact.id);
      setSelectedContact(refreshedContact || null);
      setIsEditingContact(false);
    } catch (err: any) {
      console.error("Failed to update contact:", err);
      alert(`Failed to update contact: ${err?.message || err}`);
    }
  };



  const handleCreateLog = async () => {

    if (!selectedAgency) {

      setLogError("Select an agency before logging a marketing call.");

      return;

    }

    if (!logUser.trim() || !logAction.trim()) {

      setLogError("User and action are required for a marketing log.");

      return;

    }

    try {

      setSecondaryLoading(true);

      setIsSavingLog(true);

      setLogError(null);

      setStatus(`Creating marketing log for "${selectedAgency.name}"...`);

      let datetimeIso: string;

      if (logDate) {

        const timePart = logTime || "09:00";

        const localString = `${logDate}T${timePart}`;

        const dt = new Date(localString);

        datetimeIso = dt.toISOString();

      } else {

        datetimeIso = new Date().toISOString();

      }

      const officeForLog = (() => {

        if (!selectedAgency || !selectedAgency.office_id) return null;

        const office = offices.find((o) => o.id === selectedAgency.office_id);

        if (!office) return null;

        return office.code || office.name || null;

      })();



      const payload = {

        user: logUser.trim(),

        datetime: datetimeIso,

        action: logAction.trim(),

        agency_id: selectedAgency.id,

        office: officeForLog,

        notes: logNotes.trim() || null,

      };

      await apiPost<Log, typeof payload>("/logs", payload);

      setLogDate("");

      setLogTime("");

      setLogOffice("");

      const updatedLogs = await apiGet<Log[]>(`/logs?agency_id=${selectedAgency.id}`);

      setLogs(updatedLogs || []);

      setLogAction("");

      setLogNotes("");

      setStatus(`Marketing log created for "${selectedAgency.name}".`);

    } catch (err: any) {

      setLogError(err?.message || "Create log failed");

      setStatus(`Create log failed: ${err?.message || err}`);

    } finally {

      setSecondaryLoading(false);

      setIsSavingLog(false);

    }

  };



  const handleExportLogsCsv = () => {

    if (!selectedAgency || !filteredLogs.length) {

      return;

    }

    const header = ["User", "Office", "Action", "Datetime", "Notes"];

    const rows = filteredLogs.map((log) => {

      const user = log.user ?? "";

      const office = log.office ?? "";

      const action = log.action ?? "";

      const datetime = log.datetime ? new Date(log.datetime).toLocaleString() : "";

      const notes = log.notes ?? "";

      const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;

      return [escape(user), escape(office), escape(action), escape(datetime), escape(notes)].join(",");

    });

    const csvContent = [header.join(","), ...rows].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    const agencyName = (selectedAgency && selectedAgency.name) || "agency";

    link.href = url;

    link.setAttribute("download", `marketing_logs_${agencyName.replace(/[^a-z0-9-_]+/gi, "_")}.csv`);

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

  };



  const formatDateTime = (value: string) => {

    if (!value) return "";

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) return value;

    return d.toLocaleString();

  };



  const goToEmployee = (employeeId?: number | null, employeeName?: string | null) => {

    if (!employeeId && !employeeName) return;

    const params = new URLSearchParams();

    if (employeeId) params.set("employeeId", String(employeeId));

    if (employeeName) params.set("employeeName", employeeName || "");

    navigate(`/employees?${params.toString()}`);

  };



  const handleAgencySelect = (agency: Agency) => {

    loadContactsAndLogs(agency);

  };



  const goToOffice = (officeId?: number | null) => {

    if (!officeId) return;

    const params = new URLSearchParams();

    params.set("officeId", String(officeId));

    navigate(`/offices?${params.toString()}`);

  };



  const sidebar = (

    <>

      <div>

        <h2 style={sidebarHeadingStyle}>

          Agency Filters

        </h2>



        <div style={{ marginBottom: 10 }}>

          <div style={labelStyle}>

            Search (Name or Code)

          </div>
          <input

            style={inputStyle}

            placeholder="e.g. Snapp, C3, Fresno"

            value={searchText}

            onChange={(e) => setSearchText(e.target.value)}

          />

        </div>



        <div style={{ marginBottom: 10 }}>

          <div style={labelStyle}>

            Office

          </div>
          <select

            style={selectStyle}

            value={officeFilter}

            onChange={(e) => setOfficeFilter(e.target.value)}

          >

            <option value="all">All offices</option>

            {offices.map((o) => (

              <option key={o.id} value={String(o.id)}>

                {o.code} - {o.name}

              </option>

            ))}

          </select>

        </div>



        <div style={{ marginBottom: 10 }}>

          <div style={labelStyle}>

            Primary Underwriter

          </div>
          <select

            style={selectStyle}

            value={underwriterFilter}

            onChange={(e) => setUnderwriterFilter(e.target.value)}

          >

            <option value="all">All underwriters</option>

            {employees.map((emp) => (

              <option key={emp.id} value={String(emp.id)}>

                {emp.name}

              </option>

            ))}

          </select>

        </div>

      </div>



      <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #e5e7eb" }}>

        <div

          style={{

            fontSize: 11,

            fontWeight: 600,

            color: "#6b7280",

            textTransform: "uppercase",

            letterSpacing: "0.04em",

            marginBottom: 4,

          }}

        >

          Agencies ({filteredAgencies.length})

        </div>



        <div

          style={{

            maxHeight: 380,

            overflow: "auto",

            borderRadius: 8,

            border: "1px solid #e5e7eb",

            background: "#ffffff",

          }}

        >

          <table

            style={{

              width: "100%",

              borderCollapse: "collapse",

              fontSize: 11,

            }}

          >

            <thead style={{ position: "sticky", top: 0, background: "#f9fafb", zIndex: 1 }}>

              <tr>

                <th style={{ padding: "4px 6px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>

                  Name

                </th>

                <th style={{ padding: "4px 6px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>

                  Code

                </th>

                <th style={{ padding: "4px 6px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>

                  Primary UW

                </th>

                <th style={{ padding: "4px 6px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>

                  Actions

                </th>

              </tr>

            </thead>

            <tbody>

              {filteredAgencies.map((ag) => {

                const isSelected = selectedAgency && ag.id === selectedAgency.id;

                const primaryName = (ag.primary_underwriter || "").trim() || "-";

                return (

                  <tr

                    key={ag.id}

                    style={{ backgroundColor: isSelected ? "#dbeafe" : "transparent", cursor: "pointer" }}

                    onClick={() => handleAgencySelect(ag)}

                  >

                    <td style={{ padding: "4px 6px", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>

                      {ag.name}

                    </td>

                    <td style={{ padding: "4px 6px", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>

                      {ag.code}

                    </td>

                    <td style={{ padding: "4px 6px", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>

                      {primaryName === "-" ? (

                        "-"

                      ) : (

                        <button

                          type="button"

                          onClick={(e) => {

                            e.stopPropagation();

                            goToEmployee(ag.primary_underwriter_id ?? null, ag.primary_underwriter || null);

                          }}

                          style={{

                            border: "none",

                            padding: "2px 6px",

                            borderRadius: 999,

                            background: "#eff6ff",

                            color: "#1d4ed8",

                            cursor: "pointer",

                            fontSize: 11,

                          }}

                        >

                          {primaryName}

                        </button>

                      )}

                    </td>

                    <td style={{ padding: "4px 6px", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>

                      <button

                        type="button"

                        onClick={(e) => {

                          e.stopPropagation();

                          handleAgencySelect(ag);

                        }}

                        style={{

                          marginRight: 6,

                          padding: "2px 6px",

                          borderRadius: 6,

                          border: "1px solid #d1d5db",

                          background: "#f9fafb",

                          cursor: "pointer",

                        }}

                      >

                        Select

                      </button>

                      <button

                        type="button"

                        onClick={(e) => {

                          e.stopPropagation();

                          handleDeleteAgency(ag.id);

                        }}

                        style={{

                          padding: "2px 6px",

                          borderRadius: 6,

                          border: "1px solid #f87171",

                          background: "#fef2f2",

                          color: "#b91c1c",

                          cursor: "pointer",

                        }}

                        disabled={loading || secondaryLoading}

                      >

                        Delete

                      </button>

                    </td>

                  </tr>

                );

              })}

              {filteredAgencies.length === 0 && (

                <tr>

                  <td

                    colSpan={4}

                    style={{ padding: "6px 6px", textAlign: "center", fontSize: 11, color: "#9ca3af" }}

                  >

                    No agencies match current filters.

                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>



      <div

        style={{

          borderTop: "1px solid #e5e7eb",

          paddingTop: 10,

          marginTop: 6,

          fontSize: 11,

          color: "#4b5563",

        }}

      >

        <div

          style={{

            fontSize: 11,

            fontWeight: 500,

            color: "#6b7280",

            textTransform: "uppercase",

            letterSpacing: "0.04em",

            marginBottom: 4,

          }}

        >

          Notes

        </div>

        <ul style={{ margin: 0, paddingLeft: 16 }}>

          <li>Filters update the list and KPI counts.</li>

          <li>Use search for code or name; Office narrows by office assignment.</li>

          <li>This page is the main agency workbench.</li>

        </ul>

      </div>

    </>

  );




  return (

    <WorkbenchLayout

      title="Agencies"

      subtitle="Agency-level view of contacts, logs, and ownership"

      rightNote=""

      sidebar={sidebar}

    >

      <>

        <section

          style={{

            ...panelStyle,

            gap: 8,

          }}

        >


          <div

            style={{

              display: "flex",

              gap: 12,

              minHeight: 360,

            }}

          >

            <section

              style={{

                flex: 1.6,

                display: "flex",

                flexDirection: "column",

                borderRadius: 10,

                border: "1px solid #e5e7eb",

                padding: "8px 10px",

                background: "#ffffff",

                gap: 10,

              }}

            >

              {!selectedAgency ? (

                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>

                  Select an agency from the sidebar list to view contacts and marketing logs.

                </div>

              ) : (

                <>

                  <div

                    style={{

                      display: "flex",

                      justifyContent: "space-between",

                      alignItems: "baseline",

                      marginBottom: 4,

                    }}

                  >

                    <div>

                      <div
                        style={{
                          marginBottom: 12,
                          paddingBottom: 12,
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        <div style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
                          {selectedAgency.name}
                        </div>
                        {selectedAgency.dba && (
                          <div style={{ fontSize: 16, fontWeight: 600, color: "#4b5563", marginTop: 2, marginBottom: 8 }}>
                            {selectedAgency.dba}
                          </div>
                        )}
                        <div style={{ fontSize: 14, color: "#4b5563", marginBottom: 4 }}>
                          Code: <strong>{selectedAgency.code || "—"}</strong>
                          {"  "}·{"  "}
                          Primary UW:{" "}
                          {selectedAgency.primary_underwriter ? (
                            <strong
                              onClick={() => goToEmployee(selectedAgency.primary_underwriter_id, selectedAgency.primary_underwriter)}
                              style={{ color: "#2563eb", cursor: "pointer", textDecoration: "underline" }}
                            >
                              {selectedAgency.primary_underwriter}
                            </strong>
                          ) : (
                            <strong>Unassigned</strong>
                          )}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                          <div>
                            {selectedAgency.email && (
                              <a
                                href={`mailto:${selectedAgency.email}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "#2563eb", textDecoration: "underline", fontSize: 13 }}
                              >
                                {selectedAgency.email}
                              </a>
                            )}
                          </div>
                          {contacts.filter(c => c.email).length > 0 && (
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
                              }}
                            >
                              Email All Contacts
                            </a>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`/crm/agencies/${selectedAgency.id}`)}
                          style={{
                            marginTop: 8,
                            padding: "6px 12px",
                            borderRadius: 6,
                            border: "1px solid #2563eb",
                            backgroundColor: "#2563eb",
                            color: "#ffffff",
                            fontSize: 13,
                            cursor: "pointer",
                            width: "100%",
                          }}
                        >
                          Contacts and Log Calls
                        </button>
                      </div>

                    </div>

                  </div>



                  <div

                    style={{

                      display: "grid",

                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",

                      gap: "8px 12px",

                    }}

                  >

                    <div>

                      <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>

                        Office

                      </div>

                      <div style={{ fontSize: 12, color: "#111827" }}>

                        {(() => {

                          const office = offices.find((o) => o.id === selectedAgency.office_id);

                          if (office) {
                            return (
                              <span
                                onClick={() => goToOffice(selectedAgency.office_id)}
                                style={{ color: "#2563eb", cursor: "pointer", textDecoration: "underline" }}
                              >
                                {`${office.code} - ${office.name}`}
                              </span>
                            );
                          }

                          return "Unassigned";

                        })()}

                      </div>

                    </div>

                  </div>




                  {selectedContact && (
                    <div
                      style={{
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: "1px solid #e5e7eb",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            color: "#6b7280",
                            letterSpacing: "0.06em",
                          }}
                        >
                          Contact Details
                        </div>
                        {!isEditingContact && (
                          <button
                            type="button"
                            onClick={() => handleEditContact(selectedContact)}
                            style={{
                              padding: "4px 8px",
                              borderRadius: 6,
                              border: "1px solid #d1d5db",
                              background: "#f9fafb",
                              cursor: "pointer",
                              fontSize: 11,
                            }}
                          >
                            Edit Contact
                          </button>
                        )}
                      </div>

                      {isEditingContact ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                          <input
                            placeholder="Name*"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            style={{
                              ...inputStyle,
                              fontSize: 12,
                              padding: "6px 8px",
                            }}
                          />
                          <input
                            placeholder="Title"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            style={{
                              ...inputStyle,
                              fontSize: 12,
                              padding: "6px 8px",
                            }}
                          />
                          <input
                            placeholder="Email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            style={{
                              ...inputStyle,
                              fontSize: 12,
                              padding: "6px 8px",
                            }}
                          />
                          <input
                            placeholder="Phone"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            style={{
                              ...inputStyle,
                              fontSize: 12,
                              padding: "6px 8px",
                            }}
                          />
                          <input
                            placeholder="LinkedIn URL"
                            value={editLinkedIn}
                            onChange={(e) => setEditLinkedIn(e.target.value)}
                            style={{
                              ...inputStyle,
                              fontSize: 12,
                              padding: "6px 8px",
                            }}
                          />
                          <textarea
                            placeholder="Notes"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            rows={3}
                            style={{
                              ...inputStyle,
                              fontSize: 12,
                              padding: "6px 8px",
                              resize: "vertical",
                            }}
                          />
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                            <button
                              type="button"
                              onClick={handleSaveContact}
                              style={{
                                padding: "6px 12px",
                                borderRadius: 6,
                                border: "1px solid #2563eb",
                                background: "#2563eb",
                                color: "#ffffff",
                                cursor: "pointer",
                                fontSize: 12,
                              }}
                              disabled={!editName.trim()}
                            >
                              Save Changes
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEditingContact(false)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: 6,
                                border: "1px solid #d1d5db",
                                background: "#f9fafb",
                                cursor: "pointer",
                                fontSize: 12,
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedContact.name}</div>
                          {selectedContact.title && (
                            <div style={{ fontSize: 12, color: "#6b7280" }}>{selectedContact.title}</div>
                          )}
                          {selectedContact.email && (
                            <div style={{ fontSize: 12, marginTop: 4 }}>
                              Email:{" "}
                              <a href={`mailto:${selectedContact.email}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                                {selectedContact.email}
                              </a>
                            </div>
                          )}
                          {selectedContact.phone && (
                            <div style={{ fontSize: 12 }}>Phone: {selectedContact.phone}</div>
                          )}
                          {selectedContact.linkedin_url && (
                            <div style={{ fontSize: 12 }}>
                              LinkedIn:{" "}
                              <a
                                href={selectedContact.linkedin_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: "#2563eb", textDecoration: "none" }}
                              >
                                {selectedContact.linkedin_url}
                              </a>
                            </div>
                          )}
                          {selectedContact.notes && selectedContact.notes.trim().length > 0 && (
                            <div
                              style={{
                                fontSize: 12,
                                marginTop: 8,
                                paddingTop: 6,
                                borderTop: "1px dashed #e5e7eb",
                                whiteSpace: "pre-wrap",
                                color: "#4b5563",
                              }}
                            >
                              <strong>Notes:</strong> {selectedContact.notes}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}



                  <div

                    style={{

                      marginTop: 8,

                      paddingTop: 6,

                      borderTop: "1px dashed #e5e7eb",

                      display: "flex",

                      flexDirection: "column",

                      gap: 8,

                    }}

                  >

                    <div

                      style={{

                        display: "flex",

                        justifyContent: "space-between",

                        alignItems: "center",

                      }}

                    >

                      <div>

                        <div

                          style={{

                            fontSize: 11,

                            fontWeight: 600,

                            textTransform: "uppercase",

                            color: "#6b7280",

                            letterSpacing: "0.06em",

                          }}

                        >

                          Marketing Logs

                        </div>

                        <div style={{ fontSize: 11, color: "#9ca3af" }}>

                          Showing activity for the selected agency.

                        </div>

                      </div>

                    </div>



                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>

                      <input

                        placeholder="Filter by user"

                        value={logFilterUser}

                        onChange={(e) => setLogFilterUser(e.target.value)}

                        style={{

                          padding: "6px 8px",

                          borderRadius: 8,

                          border: "1px solid #d1d5db",

                          fontSize: 12,

                        }}

                      />

                      <select

                        value={logFilterAction}

                        onChange={(e) => setLogFilterAction(e.target.value)}

                        style={{

                          padding: "6px 8px",

                          borderRadius: 8,

                          border: "1px solid #d1d5db",

                          fontSize: 12,

                        }}

                      >

                        <option value="all">All actions</option>

                        {availableActions.map((a) => (

                          <option key={a} value={a}>

                            {a}

                          </option>

                        ))}

                      </select>

                      <select

                        value={logFilterRange}

                        onChange={(e) => setLogFilterRange(e.target.value as "all" | "30d")}

                        style={{

                          padding: "6px 8px",

                          borderRadius: 8,

                          border: "1px solid #d1d5db",

                          fontSize: 12,

                        }}

                      >

                        <option value="all">All time</option>

                        <option value="30d">Last 30 days</option>

                      </select>

                    </div>



                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11 }}>

                      <div

                        style={{

                          padding: "6px 8px",

                          borderRadius: 8,

                          background: "#eff6ff",

                          color: "#1d4ed8",

                        }}

                      >

                        Total logs: <strong>{totalLogsCount}</strong>

                      </div>

                      <div

                        style={{

                          padding: "6px 8px",

                          borderRadius: 8,

                          background: "#ecfdf3",

                          color: "#15803d",

                        }}

                      >

                        Last 30 days: <strong>{logsLast30Count}</strong>

                      </div>

                      <div

                        style={{

                          padding: "6px 8px",

                          borderRadius: 8,

                          background: "#fff7ed",

                          color: "#92400e",

                        }}

                      >

                        Distinct users: <strong>{distinctUsersCount}</strong>

                      </div>

                    </div>



                    <div

                      style={{

                        border: "1px solid #e5e7eb",

                        borderRadius: 8,

                        overflow: "hidden",

                      }}

                    >

                      <table

                        style={{

                          width: "100%",

                          borderCollapse: "collapse",

                          fontSize: 12,

                        }}

                      >

                        <thead style={{ background: "#f9fafb" }}>

                          <tr>

                            <th style={{ padding: "6px 8px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>

                              User

                            </th>

                            <th style={{ padding: "6px 8px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>

                              Office

                            </th>

                            <th style={{ padding: "6px 8px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>

                              Action

                            </th>

                            <th style={{ padding: "6px 8px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>

                              Datetime

                            </th>

                            <th style={{ padding: "6px 8px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>

                              Notes

                            </th>

                          </tr>

                        </thead>

                        <tbody>

                          {filteredLogs.map((log) => (

                            <tr key={log.id}>

                              <td style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>{log.user}</td>

                              <td style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>

                                {log.office || ""}

                              </td>

                              <td style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>

                                {log.action}

                              </td>

                              <td style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>

                                {formatDateTime(log.datetime)}

                              </td>

                              <td style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>

                                {log.notes || ""}

                              </td>

                            </tr>

                          ))}

                          {filteredLogs.length === 0 && (

                            <tr>

                              <td

                                colSpan={5}

                                style={{

                                  padding: "8px 8px",

                                  textAlign: "center",

                                  fontSize: 12,

                                  color: "#9ca3af",

                                }}

                              >

                                No logs match the current filters.

                              </td>

                            </tr>

                          )}

                        </tbody>

                      </table>

                    </div>

                  </div>

                </>

              )}

            </section>



            {false && (
            <section

              style={{

                flex: 1.0,

                display: "flex",

                flexDirection: "column",

                borderRadius: 10,

                border: "1px solid #e5e7eb",

                padding: "8px 10px",

                background: "#ffffff",

                gap: 8,

              }}

            >

              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Log New Marketing Call</div>

              <div style={{ fontSize: 11, color: "#9ca3af" }}>

                Fill out the call details and save. Agency selection comes from the sidebar.

              </div>



              <label style={{ fontSize: 12, color: "#374151", display: "block", marginBottom: 8 }}>
                Underwriter
                <select
                  value={logUser}
                  onChange={(e) => setLogUser(e.target.value)}
                  disabled={!selectedAgency || underwritersForSelectedAgency.length === 0}
                  style={logFieldStyle}
                >
                  <option value="">Select underwriter...</option>
                  {underwritersForSelectedAgency.map((emp) => (
                    <option key={emp.id} value={emp.name}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ fontSize: 12, color: "#374151", display: "block", marginBottom: 8 }}>
                Contact
                <select
                  value={logContact}
                  onChange={(e) => setLogContact(e.target.value)}
                  style={logFieldStyle}
                  disabled={!selectedAgency}
                >
                  <option value="">Select contact...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>



              <label style={{ fontSize: 12, color: "#374151", display: "block", marginBottom: 8 }}>

                Action

                <select

                  value={logAction}

                  onChange={(e) => setLogAction(e.target.value)}

                  style={logFieldStyle}

                >

                  <option value="">Select action…</option>

                  <option value="In person marketing call">In person marketing call</option>

                  <option value="Phone / Zoom / Email">Phone / Zoom / Email</option>

                </select>

              </label>



              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>

                <label style={{ fontSize: 12, color: "#374151", flex: 1, minWidth: 140, display: "block", marginBottom: 8 }}>

                  Date

                  <input
                    type="date"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    style={logFieldStyle}
                  />

                </label>

                <label style={{ fontSize: 12, color: "#374151", flex: 1, minWidth: 140, display: "block", marginBottom: 8 }}>

                  Time

                  <input
                    type="time"
                    value={logTime}
                    onChange={(e) => setLogTime(e.target.value)}
                    style={logFieldStyle}
                  />

                </label>

              </div>



              <label style={{ fontSize: 12, color: "#374151", display: "block", marginBottom: 8 }}>

                Notes

                <textarea

                  value={logNotes}

                  onChange={(e) => setLogNotes(e.target.value)}

                  rows={4}

                  style={{ ...logFieldStyle, resize: "vertical" }}

                />

              </label>



              {logError && <div style={{ color: "red", fontSize: 12 }}>{logError}</div>}



              <button

                type="button"

                onClick={handleCreateLog}

                style={{

                  padding: "9px 12px",

                  borderRadius: 8,

                  border: "1px solid #2563eb",

                  background: "#2563eb",

                  color: "#ffffff",

                  cursor: "pointer",

                  fontWeight: 600,

                }}

                disabled={secondaryLoading || isSavingLog || !selectedAgency}

              >

                {isSavingLog ? "Saving..." : "Save Log"}

              </button>

              {!selectedAgency && (

                <div style={{ fontSize: 11, color: "#9ca3af" }}>

                  Select an agency first to enable the log form.

                </div>

              )}

            </section>
            )}

          </div>
        </section>

      </>

    </WorkbenchLayout>

  );

};



export default AgenciesPage;



