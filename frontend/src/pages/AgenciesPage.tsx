



import React, { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { apiGet, apiPost, apiDelete } from "../api/client";

import { WorkbenchLayout } from "../components/WorkbenchLayout";



type Agency = {

  id: number;

  name: string;

  code?: string;

  office_id?: number | null;

  primary_underwriter_id?: number | null;

  primary_underwriter?: string | null;

  active_flag?: string | null;

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



const AgenciesPage: React.FC = () => {



  const [status, setStatus] = useState<string>("");

  const [agencies, setAgencies] = useState<Agency[]>([]);

  const [offices, setOffices] = useState<Office[]>([]);

  const [employees, setEmployees] = useState<Employee[]>([]);

  const [loading, setLoading] = useState(false);

  const [secondaryLoading, setSecondaryLoading] = useState(false);



  const [newAgencyName, setNewAgencyName] = useState<string>("");



  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);

  const [contacts, setContacts] = useState<Contact[]>([]);

  const [logs, setLogs] = useState<Log[]>([]);



  const [logUser, setLogUser] = useState<string>("");

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

        return name.includes(needle) || code.includes(needle);

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

  const underwritersForSelectedAgency = useMemo(
    () => {
      if (!selectedAgency || !selectedAgency.office_id) return [];
      return employees.filter((e) => e.office_id === selectedAgency.office_id);
    },
    [selectedAgency, employees],
  );



  const cardStyle: React.CSSProperties = {

    background: "#ffffff",

    borderRadius: 12,

    padding: "12px 14px",

    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",

    minWidth: 140,

    flex: 1,

  };



  const resetLogForm = () => {

    setLogUser("");

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



  const handleCreateAgency = async () => {

    if (!newAgencyName.trim()) {

      setStatus("Please enter an agency name before creating.");

      return;

    }

    try {

      setLoading(true);

      setStatus("Creating agency...");

      const created = await apiPost<Agency, { name: string }>("/agencies", {

        name: newAgencyName.trim(),

      });

      const data = await apiGet<Agency[]>("/agencies");

      setAgencies(data);

      setNewAgencyName("");

      setStatus(`Agency "${created.name}" created successfully.`);

    } catch (err: any) {

      setStatus(`Create agency failed: ${err?.message || err}`);

    } finally {

      setLoading(false);

    }

  };



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



  const goToOffice = (officeId?: number | null) => {

    if (!officeId) return;

    const params = new URLSearchParams();

    params.set("officeId", String(officeId));

    navigate(`/offices?${params.toString()}`);

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

          Agency Filters

        </h2>



        <div style={{ marginBottom: 10 }}>

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

            Search (Name or Code)

          </div>

          <input

            style={{

              width: "100%",

              padding: "7px 9px",

              borderRadius: 8,

              border: "1px solid #d1d5db",

              fontSize: 13,

              outline: "none",

              backgroundColor: "#f9fafb",

            }}

            placeholder="e.g. Snapp, C3, Fresno"

            value={searchText}

            onChange={(e) => setSearchText(e.target.value)}

          />

        </div>



        <div style={{ marginBottom: 10 }}>

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

            Office

          </div>

          <select

            style={{

              width: "100%",

              padding: "7px 9px",

              borderRadius: 8,

              border: "1px solid #d1d5db",

              fontSize: 13,

              outline: "none",

              backgroundColor: "#f9fafb",

            }}

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

            Primary Underwriter

          </div>

          <select

            style={{

              width: "100%",

              padding: "7px 9px",

              borderRadius: 8,

              border: "1px solid #d1d5db",

              fontSize: 13,

              outline: "none",

              backgroundColor: "#f9fafb",

            }}

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

                    onClick={() => loadContactsAndLogs(ag)}

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

                          loadContactsAndLogs(ag);

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



  const kpiCards = (

    <div

      style={{

        display: "flex",

        gap: 12,

        flexWrap: "wrap",

        marginBottom: 8,

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

          Total Agencies

        </div>

        <div style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>{totalAgencies}</div>

        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>In the database</div>

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

          Agencies In View

        </div>

        <div style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>{agenciesInView}</div>

        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Matching current filters</div>

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

          Selected Agency

        </div>

        <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>{selectedAgencyName}</div>

        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Click an agency row to select</div>

      </div>

    </div>

  );



  return (

    <WorkbenchLayout

      title="Underwriting Workbench ? Agencies"

      subtitle="Agency-level view of contacts, logs, and ownership"

      rightNote="Agency workbench"

      sidebar={sidebar}

    >

      <>

        {status && (

          <div style={{ marginBottom: 8, fontSize: 12, color: "#374151" }}>

            {status} {loading && "(loading...)"}

          </div>

        )}

        {kpiCards}



        <section

          style={{

            background: "#ffffff",

            borderRadius: 12,

            padding: "10px 12px",

            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",

            display: "flex",

            flexDirection: "column",

            gap: 8,

          }}

        >

          <div

            style={{

              display: "flex",

              justifyContent: "space-between",

              alignItems: "baseline",

            }}

          >

            <div>

              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Agencies Workbench</div>

              <div style={{ fontSize: 11, color: "#9ca3af" }}>

                Select an agency from the sidebar, review contacts and logs, and record new activity.

              </div>

            </div>

            <div style={{ display: "flex", gap: 6 }}>

              <button

                type="button"

                onClick={loadAllData}

                style={{

                  padding: "6px 10px",

                  borderRadius: 8,

                  border: "1px solid #d1d5db",

                  background: "#f9fafb",

                  cursor: "pointer",

                }}

                disabled={loading}

              >

                {loading ? "Refreshing..." : "Refresh"}

              </button>

            </div>

          </div>



          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>

            <input

              placeholder="New agency name"

              value={newAgencyName}

              onChange={(e) => setNewAgencyName(e.target.value)}

              style={{

                padding: "7px 9px",

                borderRadius: 8,

                border: "1px solid #d1d5db",

                fontSize: 13,

                minWidth: 220,

              }}

            />

            <button

              type="button"

              onClick={handleCreateAgency}

              style={{

                padding: "7px 12px",

                borderRadius: 8,

                border: "1px solid #2563eb",

                background: "#2563eb",

                color: "#ffffff",

                cursor: "pointer",

              }}

              disabled={loading}

            >

              {loading ? "Saving..." : "Create Agency"}

            </button>

          </div>



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

                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{selectedAgency.name}</div>

                      <div style={{ fontSize: 11, color: "#9ca3af" }}>

                        {selectedAgency.code ? `Code: ${selectedAgency.code}` : "Agency selected"}

                      </div>

                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4, display: "flex", gap: 8 }}>

                        {selectedAgency.primary_underwriter && (

                          <button

                            type="button"

                            onClick={() =>

                              goToEmployee(

                                selectedAgency.primary_underwriter_id ?? null,

                                selectedAgency.primary_underwriter || null,

                              )

                            }

                            style={{

                              border: "none",

                              padding: "4px 8px",

                              borderRadius: 999,

                              background: "#eff6ff",

                              color: "#1d4ed8",

                              cursor: "pointer",

                            }}

                          >

                            View underwriter in Employees

                          </button>

                        )}

                        {selectedAgency.office_id && (

                          <button

                            type="button"

                            onClick={() => goToOffice(selectedAgency.office_id)}

                            style={{

                              border: "none",

                              padding: "4px 8px",

                              borderRadius: 999,

                              background: "#ecfdf3",

                              color: "#15803d",

                              cursor: "pointer",

                            }}

                          >

                            View office in Offices

                          </button>

                        )}

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

                          return office ? `${office.code} ? ${office.name}` : "Unassigned";

                        })()}

                      </div>

                    </div>

                    <div>

                      <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>

                        Primary Underwriter

                      </div>

                      <div style={{ fontSize: 12, color: "#111827" }}>

                        {selectedAgency.primary_underwriter || "Not set"}

                      </div>

                    </div>

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

                      Contacts

                    </div>

                    {contacts.length === 0 ? (

                      <div style={{ fontSize: 12, color: "#9ca3af" }}>No contacts on file for this agency.</div>

                    ) : (

                      <ul style={{ margin: 0, paddingLeft: 16 }}>

                        {contacts.map((c) => (

                          <li key={c.id} style={{ fontSize: 12, marginBottom: 4 }}>
                            <strong>{c.name}</strong>
                            {c.title ? ` · ${c.title}` : ""}
                            {c.email ? ` · ${c.email}` : ""}
                            {c.phone ? ` · ${c.phone}` : ""}
                          </li>

                        ))}

                      </ul>

                    )}

                  </div>



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

                      <button

                        type="button"

                        onClick={handleExportLogsCsv}

                        style={{

                          padding: "6px 10px",

                          borderRadius: 8,

                          border: "1px solid #d1d5db",

                          background: "#f9fafb",

                          cursor: "pointer",

                        }}

                        disabled={!filteredLogs.length}

                      >

                        Export CSV

                      </button>

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



              <label style={{ fontSize: 12, color: "#374151" }}>
                Underwriter
                <select
                  value={logUser}
                  onChange={(e) => setLogUser(e.target.value)}
                  disabled={!selectedAgency || underwritersForSelectedAgency.length === 0}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    marginTop: 4,
                    marginBottom: 8,
                    backgroundColor: "#f9fafb",
                  }}
                >
                  <option value="">Select underwriter...</option>
                  {underwritersForSelectedAgency.map((emp) => (
                    <option key={emp.id} value={emp.name}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </label>



              <label style={{ fontSize: 12, color: "#374151" }}>

                Action

                <input

                  value={logAction}

                  onChange={(e) => setLogAction(e.target.value)}

                  style={{

                    width: "100%",

                    padding: "6px 8px",

                    borderRadius: 8,

                    border: "1px solid #d1d5db",

                    marginTop: 4,

                    marginBottom: 8,

                  }}

                />

              </label>



              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>

                <label style={{ fontSize: 12, color: "#374151", flex: 1, minWidth: 140 }}>

                  Date

                  <input

                    type="date"

                    value={logDate}

                    onChange={(e) => setLogDate(e.target.value)}

                    style={{

                      width: "100%",

                      padding: "6px 8px",

                      borderRadius: 8,

                      border: "1px solid #d1d5db",

                      marginTop: 4,

                      marginBottom: 8,

                    }}

                  />

                </label>

                <label style={{ fontSize: 12, color: "#374151", flex: 1, minWidth: 140 }}>

                  Time

                  <input

                    type="time"

                    value={logTime}

                    onChange={(e) => setLogTime(e.target.value)}

                    style={{

                      width: "100%",

                      padding: "6px 8px",

                      borderRadius: 8,

                      border: "1px solid #d1d5db",

                      marginTop: 4,

                      marginBottom: 8,

                    }}

                  />

                </label>

              </div>



              <label style={{ fontSize: 12, color: "#374151" }}>

                Notes

                <textarea

                  value={logNotes}

                  onChange={(e) => setLogNotes(e.target.value)}

                  rows={4}

                  style={{

                    width: "100%",

                    padding: "6px 8px",

                    borderRadius: 8,

                    border: "1px solid #d1d5db",

                    marginTop: 4,

                    marginBottom: 8,

                    resize: "vertical",

                  }}

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

          </div>

        </section>

      </>

    </WorkbenchLayout>

  );

};



export default AgenciesPage;



