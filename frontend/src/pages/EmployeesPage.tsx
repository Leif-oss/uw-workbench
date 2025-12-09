import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { WorkbenchLayout } from "../components/WorkbenchLayout";
import { apiGet, apiPost } from "../api/client";
import { LOG_ACTION_OPTIONS, LogAction } from "../constants/logActions";

type Office = {
  id: number;
  code: string;
  name: string;
};

type Employee = {
  id: number;
  name: string;
  office_id: number | null;
  // We will treat everyone as "active" for now; we can add is_active later
};

type Log = {
  id: number;
  user: string;
  datetime: string;
  action: string;
  agency_id: number | null;
  office: string | null;
  notes: string | null;
  contact_id?: number | null;
};

type Agency = {
  id: number;
  name: string;
  code: string;
  office_id: number | null;
  web_address?: string | null;
  notes?: string | null;
  primary_underwriter_id?: number | null;
  primary_underwriter?: string | null;
  active_flag?: string | null;
};

interface EmployeeWithOffice extends Employee {
  officeCode?: string;
  officeName?: string;
}

type Contact = {
  id: number;
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  agency_id: number;
  notes?: string | null;
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 9px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 13,
  outline: "none",
  backgroundColor: "#f9fafb",
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 12,
  padding: "12px 14px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  minWidth: 140,
  flex: 1,
};

const formatDateTime = (value: string) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const EmployeesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [offices, setOffices] = useState<Office[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [selectedAgencyIdForTasks, setSelectedAgencyIdForTasks] = useState<number | null>(null);
  const [selectedTaskContactId, setSelectedTaskContactId] = useState<number | null>(null);
  const [logAction, setLogAction] = useState<LogAction>("In Person");
  const [logNotes, setLogNotes] = useState("");

  const [search, setSearch] = useState("");
  const [officeFilter, setOfficeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active"); // placeholder for future use

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [officesResp, employeesResp, logsResp, agenciesResp, contactsResp] = await Promise.all([
          apiGet<Office[]>("/offices"),
          apiGet<Employee[]>("/employees"),
          apiGet<Log[]>("/logs"),
          apiGet<Agency[]>("/agencies"),
          apiGet<Contact[]>("/contacts"),
        ]);

        setOffices(officesResp || []);
        setEmployees(employeesResp || []);
        setLogs(logsResp || []);
        setAgencies(agenciesResp || []);
        setContacts(contactsResp || []);
      } catch (err) {
        console.error("Failed to load offices/employees", err);
        setError("Failed to load offices/employees");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const employeesWithOffice: EmployeeWithOffice[] = useMemo(() => {
    const officeById = new Map<number, Office>();
    offices.forEach((o) => {
      officeById.set(o.id, o);
    });

    return employees.map((e) => {
      const office = e.office_id ? officeById.get(e.office_id) : undefined;
      return {
        ...e,
        officeCode: office?.code,
        officeName: office?.name,
      };
    });
  }, [employees, offices]);

  const filteredEmployees = useMemo(() => {
    let result = employeesWithOffice;

    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      result = result.filter((e) => {
        const haystack = `${e.name} ${e.officeName || ""} ${e.officeCode || ""}`.toLowerCase();
        return haystack.includes(needle);
      });
    }

    if (officeFilter !== "all") {
      result = result.filter((e) => String(e.office_id || "") === officeFilter);
    }

    // statusFilter is a placeholder for now; everyone is treated as "active"
    // Later, when is_active is in the schema, we can filter accordingly.

    return result;
  }, [employeesWithOffice, search, officeFilter, statusFilter]);

  const totalEmployees = employees.length;
  const totalInView = filteredEmployees.length;
  const officesInView = new Set(filteredEmployees.map((e) => e.officeCode || "")).size;

  const selectedEmployee = filteredEmployees.find((e) => e.id === selectedEmployeeId)
    || filteredEmployees[0]
    || null;

  useEffect(() => {
    const idParam = searchParams.get("employeeId");
    const nameParam = searchParams.get("employeeName");

    if (employees.length === 0) return;

    if (idParam) {
      const targetId = Number(idParam);
      if (!Number.isNaN(targetId)) {
        const exists = employees.some((e) => e.id === targetId);
        if (exists) {
          setSelectedEmployeeId(targetId);
          return;
        }
      }
    }

    if (nameParam) {
      const lower = nameParam.trim().toLowerCase();
      const byName = employees.find((e) => (e.name || "").trim().toLowerCase() === lower);
      if (byName) {
        setSelectedEmployeeId(byName.id);
      }
    }
  }, [searchParams, employees]);

  useEffect(() => {
    if (!selectedEmployee && filteredEmployees.length > 0) {
      setSelectedEmployeeId(filteredEmployees[0].id);
    }
  }, [filteredEmployees, selectedEmployee]);

  const employeeLogs = useMemo(() => {
    if (!selectedEmployee) return [];

    const name = (selectedEmployee.name || "").trim().toLowerCase();
    if (!name) return [];

    return logs
      .filter((log) => {
        const logUser = (log.user || "").trim().toLowerCase();
        return logUser === name;
      })
      .sort((a, b) => {
        const da = new Date(a.datetime).getTime();
        const db = new Date(b.datetime).getTime();
        return db - da; // newest first
      });
  }, [logs, selectedEmployee]);

  const employeeTotalLogs = employeeLogs.length;

  const employeeLogsLast30 = useMemo(() => {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    return employeeLogs.filter((log) => {
      const dt = new Date(log.datetime).getTime();
      if (Number.isNaN(dt)) return false;
      return now - dt <= thirtyDaysMs;
    }).length;
  }, [employeeLogs]);

  const employeeAgencies = useMemo(() => {
    if (!selectedEmployee) return [];

    const empId = selectedEmployee.id;
    const empName = (selectedEmployee.name || "").trim().toLowerCase();

    return agencies
      .filter((ag) => {
        const matchesId =
          typeof ag.primary_underwriter_id === "number" && ag.primary_underwriter_id === empId;

        const matchesName =
          (ag.primary_underwriter || "").trim().toLowerCase() === empName;

        return matchesId || matchesName;
      })
      .sort((a, b) => {
        const an = (a.name || "").toLowerCase();
        const bn = (b.name || "").toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        const ac = (a.code || "").toLowerCase();
        const bc = (b.code || "").toLowerCase();
        if (ac < bc) return -1;
        if (ac > bc) return 1;
        return 0;
      });
  }, [agencies, selectedEmployee]);

  useEffect(() => {
    if (employeeAgencies.length && !selectedAgencyIdForTasks) {
      setSelectedAgencyIdForTasks(employeeAgencies[0].id);
    }

    if (!employeeAgencies.length) {
      setSelectedAgencyIdForTasks(null);
      setSelectedTaskContactId(null);
    }
  }, [employeeAgencies, selectedAgencyIdForTasks]);

  const employeeAgenciesCount = employeeAgencies.length;

  const getContactedInfoForContact = (contactId: number) => {
    if (!logs || !logs.length) {
      return { label: "never", isStale: true };
    }

    const matches = logs.filter((log) => {
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

  const staleContactsForTasks = useMemo(() => {
    if (!contacts.length || !employeeAgencies.length) return [];
    const agencyIds = new Set(employeeAgencies.map((a) => a.id));
    return contacts
      .filter((c) => agencyIds.has(c.agency_id))
      .map((c) => ({ contact: c, contacted: getContactedInfoForContact(c.id) }))
      .filter(({ contacted }) => contacted.label === "never" || contacted.isStale);
  }, [contacts, employeeAgencies, logs]);

  const handleCreateEmployeeLog = async () => {
    if (!selectedTaskContactId || !selectedAgencyIdForTasks || !selectedEmployee) return;
    const payload = {
      user: selectedEmployee.name || "",
      datetime: new Date().toISOString(),
      action: logAction,
      agency_id: selectedAgencyIdForTasks,
      contact_id: selectedTaskContactId,
      notes: logNotes.trim() || undefined,
    };

    try {
      await apiPost<Log, typeof payload>("/logs", payload);
      const refreshed = await apiGet<Log[]>("/logs");
      setLogs(refreshed || []);
      setLogNotes("");
    } catch (err) {
      console.error("Failed to create employee log", err);
      setError("Failed to create marketing log");
    }
  };

  const sidebar = (
    <>
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: "#111827",
            marginBottom: 8,
          }}
        >
          Employee Filters
        </h2>
        <div style={{ marginBottom: 10 }}>
          <div style={fieldLabelStyle}>Search (Name or Office)</div>
          <input
            style={inputStyle}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. Allan, Daly, Fresno"
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={fieldLabelStyle}>Office</div>
          <select
            style={inputStyle}
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
          <div style={fieldLabelStyle}>Status</div>
          <select
            style={inputStyle}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="active">Active (placeholder)</option>
            <option value="all">All (placeholder)</option>
          </select>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          fontSize: 11,
          fontWeight: 500,
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: 4,
        }}
      >
        Employee List
      </div>

      <div
        style={{
          maxHeight: 260,
          overflow: "auto",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          background: "#ffffff",
          marginBottom: 8,
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12,
          }}
        >
          <thead
            style={{
              background: "#f9fafb",
              position: "sticky",
              top: 0,
              zIndex: 1,
            }}
          >
            <tr>
              <th
                style={{
                  padding: "6px 8px",
                  textAlign: "left",
                  borderBottom: "1px solid #f1f5f9",
                  fontWeight: 500,
                  color: "#6b7280",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Name
              </th>
              <th
                style={{
                  padding: "6px 8px",
                  borderBottom: "1px solid #f1f5f9",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#6b7280",
                }}
              >
                Office
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((e) => {
              const isSelected = selectedEmployee && e.id === selectedEmployee.id;
              return (
                <tr
                  key={e.id}
                  onClick={() => setSelectedEmployeeId(e.id)}
                  style={{
                    cursor: "pointer",
                    transition: "background-color 0.1s ease",
                    backgroundColor: isSelected ? "#dbeafe" : "transparent",
                  }}
                >
                  <td
                    style={{
                      padding: "6px 8px",
                      borderBottom: "1px solid #f1f5f9",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {e.name}
                  </td>
                  <td
                    style={{
                      padding: "6px 8px",
                      borderBottom: "1px solid #f1f5f9",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {e.officeCode ? `${e.officeCode} - ${e.officeName}` : "Unassigned"}
                  </td>
                </tr>
              );
            })}
            {filteredEmployees.length === 0 && (
              <tr>
                <td
                  colSpan={2}
                  style={{
                    padding: "8px 8px",
                    textAlign: "center",
                    fontSize: 12,
                    color: "#9ca3af",
                  }}
                >
                  No employees match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
        <div style={fieldLabelStyle}>Notes</div>
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          <li>Filters are local (front-end only) for now.</li>
          <li>Later: add production + call counts per employee.</li>
          <li>Use this as a starting point for manager views.</li>
        </ul>
      </div>
    </>
  );

  const kpiCards = (
    <div
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div style={cardStyle}>
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            color: "#6b7280",
            letterSpacing: "0.05em",
            marginBottom: 6,
          }}
        >
          Total Employees
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>
          {totalEmployees}
        </div>
        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
          In the database
        </div>
      </div>

      <div style={cardStyle}>
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            color: "#6b7280",
            letterSpacing: "0.05em",
            marginBottom: 6,
          }}
        >
          In View
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>
          {totalInView}
        </div>
        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
          Matching current filters
        </div>
      </div>

      <div style={cardStyle}>
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            color: "#6b7280",
            letterSpacing: "0.05em",
            marginBottom: 6,
          }}
        >
          Offices in View
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>
          {officesInView}
        </div>
        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
          Based on filtered employees
        </div>
      </div>
    </div>
  );

  const detailPanel = (
    <section
      style={{
        background: "#ffffff",
        borderRadius: 12,
        padding: "10px 12px",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 320,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#111827",
            }}
          >
            {selectedEmployee ? selectedEmployee.name : "Select an employee"}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>
            {selectedEmployee
              ? selectedEmployee.officeName
                ? `${selectedEmployee.officeCode} - ${selectedEmployee.officeName}`
                : "No office assigned yet"
              : "Details and future metrics will appear here"}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, fontSize: 12 }}>
        {!selectedEmployee ? (
          <div
            style={{
              fontSize: 12,
              color: "#9ca3af",
              marginTop: 20,
              textAlign: "center",
            }}
          >
            Choose an employee from the list to view details,<br />
            office assignment, and (later) activity, calls, and production.
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "8px 16px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 2,
                  }}
                >
                  Name
                </div>
                <div style={{ fontSize: 12, color: "#111827" }}>
                  {selectedEmployee.name}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 2,
                  }}
                >
                  Office
                </div>
                <div style={{ fontSize: 12, color: "#111827" }}>
                  {selectedEmployee.officeName
                    ? `${selectedEmployee.officeCode} - ${selectedEmployee.officeName}`
                    : "Unassigned"}
                </div>
              </div>
            </div>

            {selectedEmployee && (
              <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
                <div
                  style={{
                    flex: 1,
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 8,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                    Agencies for {selectedEmployee.name}
                  </div>
                  {employeeAgencies.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#6b7280" }}>No agencies assigned.</div>
                  ) : (
                    <ul style={{ listStyle: "none", paddingLeft: 0, margin: 0 }}>
                      {employeeAgencies.map((a) => (
                        <li key={a.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedAgencyIdForTasks(a.id)}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: "4px 6px",
                              borderRadius: 6,
                              border: "none",
                              marginBottom: 4,
                              fontSize: 12,
                              cursor: "pointer",
                              backgroundColor:
                                a.id === selectedAgencyIdForTasks ? "#eff6ff" : "transparent",
                            }}
                          >
                            <div style={{ fontWeight: 500 }}>{a.name}</div>
                            {a.code && (
                              <div style={{ fontSize: 11, color: "#6b7280" }}>{a.code}</div>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div
                  style={{
                    flex: 1.4,
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 8,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                    Marketing tasks (never / &gt;90 days)
                  </div>
                  {staleContactsForTasks.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#16a34a" }}>No stale contacts. 🎉</div>
                  ) : (
                    <ul style={{ listStyle: "none", paddingLeft: 0, margin: 0 }}>
                      {staleContactsForTasks.map(({ contact, contacted }) => (
                        <li key={contact.id} style={{ marginBottom: 4 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTaskContactId(contact.id);
                              setSelectedAgencyIdForTasks(contact.agency_id);
                            }}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: "4px 6px",
                              borderRadius: 6,
                              border: "none",
                              fontSize: 12,
                              cursor: "pointer",
                              backgroundColor:
                                contact.id === selectedTaskContactId ? "#fef3c7" : "transparent",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 500 }}>{contact.name}</div>
                                {contact.title && (
                                  <div style={{ fontSize: 11, color: "#6b7280" }}>{contact.title}</div>
                                )}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 500,
                                  whiteSpace: "nowrap",
                                  color: "#b91c1c",
                                }}
                              >
                                {contacted.label === "never"
                                  ? "Contacted: never"
                                  : `Contacted: ${contacted.label}`}
                              </div>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div
                  style={{
                    flex: 1.2,
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                    Log new marketing call
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {selectedTaskContactId
                      ? "Logging for selected task contact."
                      : "Select a contact in the middle column to log a call."}
                  </div>
                  <label style={{ fontSize: 12, color: "#374151", display: "block" }}>
                    Action
                    <select
                      value={logAction}
                      onChange={(e) => setLogAction(e.target.value as LogAction)}
                      style={inputStyle}
                      disabled={!selectedTaskContactId}
                    >
                      {LOG_ACTION_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ fontSize: 12, color: "#374151", display: "block" }}>
                    Notes
                    <textarea
                      value={logNotes}
                      onChange={(e) => setLogNotes(e.target.value)}
                      rows={3}
                      style={{ ...inputStyle, resize: "vertical" }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleCreateEmployeeLog}
                    disabled={!selectedTaskContactId || !selectedAgencyIdForTasks}
                    style={{
                      padding: "7px 10px",
                      borderRadius: 6,
                      border: "1px solid #2563eb",
                      background: "#2563eb",
                      color: "#fff",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Save Log
                  </button>
                </div>
              </div>
            )}

            <div
              style={{
                marginTop: 8,
                paddingTop: 6,
                borderTop: "1px dashed #e5e7eb",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: "#6b7280",
                  letterSpacing: "0.06em",
                  marginBottom: 4,
                }}
              >
                Marketing Activity
              </div>

              {employeeTotalLogs === 0 ? (
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  No marketing logs found for this employee yet.
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      flexWrap: "wrap",
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        padding: "6px 8px",
                        borderRadius: 8,
                        background: "#eff6ff",
                        fontSize: 11,
                        color: "#1d4ed8",
                      }}
                    >
                      Total logs: <strong>{employeeTotalLogs}</strong>
                    </div>
                    <div
                      style={{
                        padding: "6px 8px",
                        borderRadius: 8,
                        background: "#ecfdf3",
                        fontSize: 11,
                        color: "#15803d",
                      }}
                    >
                      Last 30 days: <strong>{employeeLogsLast30}</strong>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: "#6b7280",
                      marginBottom: 4,
                    }}
                  >
                    Recent activity (up to 10 latest logs):
                  </div>
                  <div
                    style={{
                      maxHeight: 160,
                      overflow: "auto",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      background: "#f9fafb",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 11,
                      }}
                    >
                      <thead
                        style={{
                          position: "sticky",
                          top: 0,
                          background: "#e5e7eb",
                        }}
                      >
                        <tr>
                          <th
                            style={{
                              padding: "4px 6px",
                              textAlign: "left",
                              borderBottom: "1px solid #e5e7eb",
                            }}
                          >
                            Date
                          </th>
                          <th
                            style={{
                              padding: "4px 6px",
                              textAlign: "left",
                              borderBottom: "1px solid #e5e7eb",
                            }}
                          >
                            Action
                          </th>
                          <th
                            style={{
                              padding: "4px 6px",
                              textAlign: "left",
                              borderBottom: "1px solid #e5e7eb",
                            }}
                          >
                            Agency
                          </th>
                          <th
                            style={{
                              padding: "4px 6px",
                              textAlign: "left",
                              borderBottom: "1px solid #e5e7eb",
                            }}
                          >
                            Notes
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeeLogs.slice(0, 10).map((log) => (
                          <tr key={log.id}>
                            <td
                              style={{
                                padding: "4px 6px",
                                borderBottom: "1px solid #e5e7eb",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {formatDateTime(log.datetime)}
                            </td>
                            <td
                              style={{
                                padding: "4px 6px",
                                borderBottom: "1px solid #e5e7eb",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {log.action}
                            </td>
                            <td
                              style={{
                                padding: "4px 6px",
                                borderBottom: "1px solid #e5e7eb",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {log.agency_id ?? ""}
                            </td>
                            <td
                              style={{
                                padding: "4px 6px",
                                borderBottom: "1px solid #e5e7eb",
                                maxWidth: 220,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={log.notes || undefined}
                            >
                              {log.notes || ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div
              style={{
                marginTop: 8,
                paddingTop: 6,
                borderTop: "1px dashed #e5e7eb",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: "#6b7280",
                  letterSpacing: "0.06em",
                  marginBottom: 4,
                }}
              >
                Assigned Agencies
              </div>

              {employeeAgenciesCount === 0 ? (
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  No agencies are currently assigned to this employee.
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      flexWrap: "wrap",
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        padding: "6px 8px",
                        borderRadius: 8,
                        background: "#fef3c7",
                        fontSize: 11,
                        color: "#92400e",
                      }}
                    >
                      Total agencies: <strong>{employeeAgenciesCount}</strong>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: "#6b7280",
                      marginBottom: 4,
                    }}
                  >
                    Showing up to 15 assigned agencies:
                  </div>

                  <div
                    style={{
                      maxHeight: 160,
                      overflow: "auto",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      background: "#f9fafb",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 11,
                      }}
                    >
                      <thead
                        style={{
                          position: "sticky",
                          top: 0,
                          background: "#e5e7eb",
                        }}
                      >
                        <tr>
                          <th
                            style={{
                              padding: "4px 6px",
                              textAlign: "left",
                              borderBottom: "1px solid #e5e7eb",
                            }}
                          >
                            Code
                          </th>
                          <th
                            style={{
                              padding: "4px 6px",
                              textAlign: "left",
                              borderBottom: "1px solid #e5e7eb",
                            }}
                          >
                            Agency
                          </th>
                          <th
                            style={{
                              padding: "4px 6px",
                              textAlign: "left",
                              borderBottom: "1px solid #e5e7eb",
                            }}
                          >
                            Office
                          </th>
                          <th
                            style={{
                              padding: "4px 6px",
                              textAlign: "left",
                              borderBottom: "1px solid #e5e7eb",
                            }}
                          >
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeeAgencies.slice(0, 15).map((ag) => {
                          const office = offices.find((o) => o.id === ag.office_id);
                          const officeLabel = office
                            ? `${office.code} - ${office.name}`
                            : "Unassigned";

                          const status = (ag.active_flag || "Unknown").trim() || "Unknown";

                          return (
                            <tr key={ag.id}>
                              <td
                                style={{
                                  padding: "4px 6px",
                                  borderBottom: "1px solid #e5e7eb",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {ag.code}
                              </td>
                              <td
                                style={{
                                  padding: "4px 6px",
                                  borderBottom: "1px solid #e5e7eb",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {ag.name}
                              </td>
                              <td
                                style={{
                                  padding: "4px 6px",
                                  borderBottom: "1px solid #e5e7eb",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {officeLabel}
                              </td>
                              <td
                                style={{
                                  padding: "4px 6px",
                                  borderBottom: "1px solid #e5e7eb",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {status}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );

  const content = (
    <>
      {error && (
        <div style={{ color: "red", fontSize: 12, marginBottom: 4 }}>{error}</div>
      )}
      {isLoading && (
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
          Loading employees and offices...
        </div>
      )}

      {kpiCards}

      <div style={{ display: "flex", gap: 12, flex: 1, minHeight: 320 }}>
        {detailPanel}
      </div>
    </>
  );

  return (
    <WorkbenchLayout
      title="Underwriting Workbench - Employees"
      subtitle="Company view of underwriters and office assignments"
      rightNote="Manager view - baseline version"
      sidebar={sidebar}
      hideHeader
    >
      {content}
    </WorkbenchLayout>
  );
};

export default EmployeesPage;
