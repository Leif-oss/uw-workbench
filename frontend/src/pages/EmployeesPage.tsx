import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { WorkbenchLayout } from "../components/WorkbenchLayout";
import { apiGet } from "../api/client";

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

export const EmployeesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [offices, setOffices] = useState<Office[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

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
        const [officesResp, employeesResp, logsResp, agenciesResp] = await Promise.all([
          apiGet<Office[]>("/offices"),
          apiGet<Employee[]>("/employees"),
          apiGet<Log[]>("/logs"),
          apiGet<Agency[]>("/agencies"),
        ]);

        setOffices(officesResp || []);
        setEmployees(employeesResp || []);
        setLogs(logsResp || []);
        setAgencies(agenciesResp || []);
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

  const employeeAgenciesCount = employeeAgencies.length;

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

  const listPanel = (
    <section
      style={{
        background: "#ffffff",
        borderRadius: 12,
        padding: "10px 12px",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
        display: "flex",
        flexDirection: "column",
        flex: 1.3,
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
            Employee List
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>
            Click a row to view details and activity
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>
          {filteredEmployees.length} item
          {filteredEmployees.length === 1 ? "" : "s"} in view
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          borderRadius: 10,
          border: "1px solid #e5e7eb",
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
    </section>
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
                            Date/Time
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
                              {new Date(log.datetime).toLocaleString()}
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
        {listPanel}
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
    >
      {content}
    </WorkbenchLayout>
  );
};

export default EmployeesPage;
