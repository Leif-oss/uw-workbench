import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { WorkbenchLayout } from "../components/WorkbenchLayout";
import { apiGet } from "../api/client";
import {
  panelStyle,
  sidebarHeadingStyle,
  tableContainerStyle,
  tableBaseStyle,
  tableHeaderCellStyle,
  tableCellStyle,
  tableHeaderStickyStyle,
  sectionHeadingStyle,
  sectionSubheadingStyle,
} from "../ui/designSystem";

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

type Log = {
  id: number;
  user: string;
  datetime: string;
  action: string;
  agency_id: number | null;
  office: string | null;
  notes: string | null;
};

interface OfficeWithEmployees extends Office {
  employees: Employee[];
}


export const OfficesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [offices, setOffices] = useState<Office[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goToEmployee = (employeeId?: number | null, employeeName?: string | null) => {
    if (!employeeId && !employeeName) return;
    const params = new URLSearchParams();
    if (employeeId) params.set("employeeId", String(employeeId));
    if (employeeName) params.set("employeeName", employeeName || "");
    navigate(`/crm/employees?${params.toString()}`);
  };

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

  const officesWithEmployees: OfficeWithEmployees[] = useMemo(() => {
    const byOfficeId = new Map<number, Employee[]>();
    employees.forEach((e) => {
      if (!e.office_id) return;
      if (!byOfficeId.has(e.office_id)) {
        byOfficeId.set(e.office_id, []);
      }
      byOfficeId.get(e.office_id)!.push(e);
    });

    return offices.map((o) => ({
      ...o,
      employees: byOfficeId.get(o.id) || [],
    }));
  }, [offices, employees]);

  const filteredOffices = useMemo(() => {
    return officesWithEmployees;
  }, [officesWithEmployees]);

  const selectedOffice =
    filteredOffices.find((o) => o.id === selectedOfficeId) ||
    filteredOffices[0] ||
    null;

  useEffect(() => {
    const idParam = searchParams.get("officeId");
    if (!idParam) return;
    if (offices.length === 0) return;

    const officeId = Number(idParam);
    if (Number.isNaN(officeId)) return;

    const exists = offices.some((o) => o.id === officeId);
    if (exists) {
      setSelectedOfficeId(officeId);
    }
  }, [searchParams, offices]);

  useEffect(() => {
    if (!selectedOffice && filteredOffices.length > 0) {
      setSelectedOfficeId(filteredOffices[0].id);
    }
  }, [filteredOffices, selectedOffice]);

  const officeLogs = useMemo(() => {
    if (!selectedOffice) return [];

    const code = (selectedOffice.code || "").trim().toLowerCase();
    if (!code) return [];

    return logs
      .filter((log) => {
        const logOfficeCode = (log.office || "").trim().toLowerCase();
        return logOfficeCode === code;
      })
      .sort((a, b) => {
        const da = new Date(a.datetime).getTime();
        const db = new Date(b.datetime).getTime();
        return db - da; // newest first
      });
  }, [logs, selectedOffice]);

  const officeTotalLogs = officeLogs.length;

  const officeLogsLast30 = useMemo(() => {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    return officeLogs.filter((log) => {
      const dt = new Date(log.datetime).getTime();
      if (Number.isNaN(dt)) return false;
      return now - dt <= thirtyDaysMs;
    }).length;
  }, [officeLogs]);

  const officeAgencies = useMemo(() => {
    if (!selectedOffice) return [];

    return agencies
      .filter((ag) => ag.office_id === selectedOffice.id)
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
  }, [agencies, selectedOffice]);

  const officeAgenciesCount = officeAgencies.length;

  const sidebar = (
    <>
      <div>
        <h2 style={sidebarHeadingStyle}>
          Offices
        </h2>
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>
          Click a row to view office details and team
        </div>
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>
        <div style={tableContainerStyle}>
          <table style={tableBaseStyle}>
            <thead>
              <tr>
                <th style={tableHeaderStickyStyle}>Code</th>
                <th style={tableHeaderStickyStyle}>Name</th>
                <th style={{ ...tableHeaderStickyStyle, textAlign: "right" }}>Employees</th>
              </tr>
            </thead>
            <tbody>
              {filteredOffices.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ ...tableCellStyle, textAlign: "center", color: "#9ca3af" }}>
                    No offices found
                  </td>
                </tr>
              ) : (
                filteredOffices.map((office) => {
                  const empCount = employees.filter((e) => e.office_id === office.id).length;
                  const isSelected = selectedOfficeId === office.id;
                  return (
                    <tr
                      key={office.id}
                      onClick={() => setSelectedOfficeId(office.id)}
                      style={{
                        cursor: "pointer",
                        backgroundColor: isSelected ? "#eff6ff" : "transparent",
                      }}
                    >
                      <td style={tableCellStyle}>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/crm/offices/${office.id}`);
                          }}
                          style={{
                            color: "#2563eb",
                            cursor: "pointer",
                            textDecoration: "underline",
                            fontWeight: 600,
                          }}
                        >
                          {office.code}
                        </span>
                      </td>
                      <td style={tableCellStyle}>{office.name}</td>
                      <td style={{ ...tableCellStyle, textAlign: "right" }}>{empCount}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 8 }}>
        {filteredOffices.length} items in view
      </div>
    </>
  );

  const detailPanel = (
    <section
      style={{
        ...panelStyle,
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
          <div style={sectionHeadingStyle}>
            {selectedOffice ? `${selectedOffice.code} - ${selectedOffice.name}` : "Select an office"}
          </div>
          <div style={sectionSubheadingStyle}>
            {selectedOffice
              ? "Assigned underwriters and future production metrics"
              : "Details and future metrics will appear here"}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, fontSize: 12 }}>
        {!selectedOffice ? (
          <div
            style={{
              fontSize: 12,
              color: "#9ca3af",
              marginTop: 20,
              textAlign: "center",
            }}
          >
            Choose an office from the list to view its assigned underwriters,<br />
            and later, aggregated production and call activity.
          </div>
        ) : (
          <>
            <div>
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
                Assigned Underwriters
              </div>
              {selectedOffice.employees.length === 0 ? (
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  No employees are assigned to this office yet.
                </div>
              ) : (
                <ul style={{ paddingLeft: 16, margin: 0 }}>
                  {selectedOffice.employees.map((e) => (
                    <li key={e.id} style={{ marginBottom: 4 }}>
                      <span
                        onClick={() => goToEmployee(e.id, e.name)}
                        style={{
                          color: "#2563eb",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        {e.name}
                      </span>
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
                Office Marketing Activity
              </div>
              {officeTotalLogs === 0 ? (
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  No marketing logs found for this office yet.
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
                      Total logs: <strong>{officeTotalLogs}</strong>
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
                      Last 30 days: <strong>{officeLogsLast30}</strong>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: "#6b7280",
                      marginBottom: 4,
                    }}
                  >
                    Recent activity (up to 10 latest logs for this office):
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
                            User
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
                        {officeLogs.slice(0, 10).map((log) => (
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
                              {log.user}
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
                Office Agencies
              </div>

              {officeAgenciesCount === 0 ? (
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  No agencies are currently tied to this office.
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
                      Total agencies: <strong>{officeAgenciesCount}</strong>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: "#6b7280",
                      marginBottom: 4,
                    }}
                  >
                    Showing up to 20 agencies for this office:
                  </div>

                  <div
                    style={{
                      maxHeight: 180,
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
                            Primary UW
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
                        {officeAgencies.slice(0, 20).map((ag) => {
                          const status = (ag.active_flag || "Unknown").trim() || "Unknown";
                          const primaryUw = (ag.primary_underwriter || "").trim() || "—";

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
                                {primaryUw}
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
          Loading offices and employees...
        </div>
      )}

      {detailPanel}
    </>
  );

  return (
    <WorkbenchLayout
      title="Underwriting Workbench - Offices"
      subtitle="Office-level view of underwriters and future production metrics"
      rightNote="Manager view - baseline version"
      sidebar={sidebar}
    >
      {content}
    </WorkbenchLayout>
  );
};

export default OfficesPage;
