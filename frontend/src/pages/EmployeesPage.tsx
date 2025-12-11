import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { WorkbenchLayout } from "../components/WorkbenchLayout";
import { apiGet } from "../api/client";
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

type Production = {
  id: number;
  office: string;
  agency_code: string;
  agency_name: string;
  active_flag: string | null;
  month: string;
  all_ytd_wp: number | null;
  all_ytd_nb: number | null;
  pytd_wp: number | null;
  pytd_nb: number | null;
  py_total_nb: number | null;
};

interface EmployeeWithOffice extends Employee {
  officeCode?: string;
  officeName?: string;
}


export const EmployeesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [offices, setOffices] = useState<Office[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [production, setProduction] = useState<Production[]>([]);
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
        const [officesResp, employeesResp, logsResp, agenciesResp, productionResp] = await Promise.all([
          apiGet<Office[]>("/offices"),
          apiGet<Employee[]>("/employees"),
          apiGet<Log[]>("/logs"),
          apiGet<Agency[]>("/agencies"),
          apiGet<Production[]>("/production"),
        ]);

        setOffices(officesResp || []);
        setEmployees(employeesResp || []);
        setLogs(logsResp || []);
        setAgencies(agenciesResp || []);
        setProduction(productionResp || []);
      } catch (err) {
        console.error("Failed to load offices/employees", err);
        setError("Failed to load offices/employees");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  interface GroupedEmployee {
    name: string;
    employeeIds: number[];
    officeIds: number[];
    officeCodes: string[];
    officeNames: string[];
  }

  const groupedEmployees: GroupedEmployee[] = useMemo(() => {
    const officeById = new Map<number, Office>();
    offices.forEach((o) => {
      officeById.set(o.id, o);
    });

    const groups = new Map<string, GroupedEmployee>();
    
    employees.forEach((emp) => {
      if (!groups.has(emp.name)) {
        groups.set(emp.name, {
          name: emp.name,
          employeeIds: [],
          officeIds: [],
          officeCodes: [],
          officeNames: [],
        });
      }
      const group = groups.get(emp.name)!;
      group.employeeIds.push(emp.id);
      group.officeIds.push(emp.office_id);
      
      const office = officeById.get(emp.office_id);
      if (office) {
        group.officeCodes.push(office.code);
        group.officeNames.push(office.name);
      }
    });
    
    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, offices]);

  const filteredEmployees = useMemo(() => {
    let result = groupedEmployees;

    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      result = result.filter((group) => {
        const haystack = `${group.name} ${group.officeNames.join(" ")} ${group.officeCodes.join(" ")}`.toLowerCase();
        return haystack.includes(needle);
      });
    }

    if (officeFilter !== "all") {
      result = result.filter((group) => 
        group.officeIds.some((id) => String(id) === officeFilter)
      );
    }

    // statusFilter is a placeholder for now; everyone is treated as "active"
    // Later, when is_active is in the schema, we can filter accordingly.

    return result;
  }, [groupedEmployees, search, officeFilter, statusFilter]);

  const totalEmployees = groupedEmployees.length;
  const totalInView = filteredEmployees.length;
  const officesInView = new Set(filteredEmployees.flatMap((g) => g.officeCodes)).size;

  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) {
      return filteredEmployees[0] || null;
    }
    // Find the group that contains the selected employee ID
    return filteredEmployees.find((group) => group.employeeIds.includes(selectedEmployeeId)) || filteredEmployees[0] || null;
  }, [selectedEmployeeId, filteredEmployees]);

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
      setSelectedEmployeeId(filteredEmployees[0].employeeIds[0]);
    }
  }, [filteredEmployees, selectedEmployee]);

  const employeeLogs = useMemo(() => {
    if (!selectedEmployee) return [];

    const name = selectedEmployee.name.trim().toLowerCase();
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

    const empIds = selectedEmployee.employeeIds;
    const empName = selectedEmployee.name.trim().toLowerCase();

    return agencies
      .filter((ag) => {
        const matchesId =
          typeof ag.primary_underwriter_id === "number" && empIds.includes(ag.primary_underwriter_id);

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

  // Calculate production metrics for employee's agencies
  const employeeProduction = useMemo(() => {
    if (!selectedEmployee || employeeAgencies.length === 0) {
      return {
        currentYearTotal: 0,
        priorYearTotal: 0,
        percentChange: 0,
        agencyCount: 0,
        monthlyData: [],
      };
    }

    // Get agency codes for this employee
    const agencyCodes = new Set(employeeAgencies.map((ag) => ag.code.trim().toUpperCase()));

    // Group production records by month and aggregate
    const monthlyMap = new Map<string, { currentYear: number, priorYear: number }>();
    
    production.forEach((record) => {
      const codeNorm = record.agency_code.trim().toUpperCase();
      if (agencyCodes.has(codeNorm)) {
        const existing = monthlyMap.get(record.month) || { currentYear: 0, priorYear: 0 };
        existing.currentYear += record.all_ytd_nb || 0;
        existing.priorYear += record.pytd_nb || 0;
        monthlyMap.set(record.month, existing);
      }
    });

    // Get latest production data for YTD totals
    const latestByAgency = new Map<string, Production>();
    production.forEach((record) => {
      const codeNorm = record.agency_code.trim().toUpperCase();
      if (agencyCodes.has(codeNorm)) {
        const existing = latestByAgency.get(codeNorm);
        if (!existing || record.month > existing.month) {
          latestByAgency.set(codeNorm, record);
        }
      }
    });

    let currentYearTotal = 0;
    let priorYearTotal = 0;

    latestByAgency.forEach((record) => {
      currentYearTotal += record.all_ytd_nb || 0;
      priorYearTotal += record.pytd_nb || 0;
    });

    const percentChange = priorYearTotal > 0 
      ? ((currentYearTotal - priorYearTotal) / priorYearTotal) * 100 
      : 0;

    // Create monthly data for line graph (sorted by month, last 12 months)
    const sortedMonths = Array.from(monthlyMap.keys()).sort();
    const monthlyData = sortedMonths.slice(-12).map((month) => {
      const data = monthlyMap.get(month)!;
      const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' });
      return {
        month: monthLabel,
        currentYear: data.currentYear,
        priorYear: data.priorYear,
      };
    });

    return {
      currentYearTotal,
      priorYearTotal,
      percentChange,
      agencyCount: latestByAgency.size,
      monthlyData,
    };
  }, [selectedEmployee, employeeAgencies, production]);

  const sidebar = (
    <>
      <div>
        <h2 style={sidebarHeadingStyle}>
          Employees
        </h2>
        <div style={{ marginBottom: 10 }}>
          <input
            style={inputStyle}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or office..."
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <select
            style={selectStyle}
            value={officeFilter}
            onChange={(e) => setOfficeFilter(e.target.value)}
          >
            <option value="all">All offices</option>
            {offices.map((o) => (
              <option key={o.id} value={String(o.id)}>
                {o.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>
        {filteredEmployees.length} employee{filteredEmployees.length === 1 ? "" : "s"}
      </div>

      {/* Employee List Table */}
      <div style={{ flex: 1, overflowY: "auto", marginTop: 10 }}>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <tbody>
            {filteredEmployees.map((group) => {
              const isSelected = selectedEmployee && selectedEmployee.name === group.name;
              const officeDisplay = group.officeCodes.length > 0 
                ? group.officeCodes.join(", ") 
                : "—";
              
              return (
                <tr
                  key={group.name}
                  onClick={() => setSelectedEmployeeId(group.employeeIds[0])}
                  style={{
                    cursor: "pointer",
                    transition: "background-color 0.1s ease",
                    backgroundColor: isSelected ? "#dbeafe" : "transparent",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  <td style={{ padding: "8px 4px" }}>
                    <div style={{ fontWeight: 600, color: "#111827" }}>{group.name}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{officeDisplay}</div>
                  </td>
                </tr>
              );
            })}
            {filteredEmployees.length === 0 && (
              <tr>
                <td style={{ padding: "8px 4px", textAlign: "center", fontSize: 11, color: "#9ca3af" }}>
                  No employees found
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
        <div style={kpiLabelStyle}>
          Total Employees
        </div>
        <div style={kpiValueStyle}>
          {totalEmployees}
        </div>
        <div style={kpiSubtextStyle}>
          In the database
        </div>
      </div>

      <div style={cardStyle}>
        <div style={kpiLabelStyle}>
          In View
        </div>
        <div style={kpiValueStyle}>
          {totalInView}
        </div>
        <div style={kpiSubtextStyle}>
          Matching current filters
        </div>
      </div>

      <div style={cardStyle}>
        <div style={kpiLabelStyle}>
          Offices in View
        </div>
        <div style={kpiValueStyle}>
          {officesInView}
        </div>
        <div style={kpiSubtextStyle}>
          Based on filtered employees
        </div>
      </div>
    </div>
  );

  const listPanel = (
    <section
      style={{
        ...panelStyle,
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
          <div style={sectionHeadingStyle}>
            Employee List
          </div>
          <div style={sectionSubheadingStyle}>
            Click a row to view details and activity
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>
          {filteredEmployees.length} item
          {filteredEmployees.length === 1 ? "" : "s"} in view
        </div>
      </div>

      <div style={tableContainerStyle}>
        <table style={tableBaseStyle}>
          <thead>
            <tr>
              <th style={tableHeaderStickyStyle}>
                Name
              </th>
              <th style={tableHeaderStickyStyle}>
                Office
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((group) => {
              const isSelected = selectedEmployee && selectedEmployee.name === group.name;
              const officeDisplay = group.officeCodes.length > 0 
                ? group.officeCodes.join(", ") 
                : "Unassigned";
              
              return (
                <tr
                  key={group.name}
                  onClick={() => setSelectedEmployeeId(group.employeeIds[0])}
                  style={{
                    cursor: "pointer",
                    transition: "background-color 0.1s ease",
                    backgroundColor: isSelected ? "#dbeafe" : "transparent",
                  }}
                >
                  <td style={tableCellStyle}>
                    {group.name}
                  </td>
                  <td style={tableCellStyle}>
                    {officeDisplay}
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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {!selectedEmployee ? (
        <div
          style={{
            ...panelStyle,
            fontSize: 13,
            color: "#9ca3af",
            padding: 40,
            textAlign: "center",
          }}
        >
          Choose an employee from the list to view details and activity.
        </div>
      ) : (
        <>
          {/* Employee Header */}
          <div style={{ ...panelStyle, padding: 16 }}>
            <h2 style={{ margin: "0 0 8px 0", fontSize: 20, fontWeight: 600, color: "#111827" }}>
              {selectedEmployee.name}
            </h2>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              {selectedEmployee.officeCodes.length > 0 
                ? selectedEmployee.officeCodes.map((code, idx) => {
                    const officeName = selectedEmployee.officeNames[idx];
                    return `${code} - ${officeName}`;
                  }).join(" • ")
                : "No office assigned"}
            </div>
          </div>

          {/* Activity Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div style={{ ...panelStyle, padding: 16 }}>
              <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                Total Calls
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#1e40af" }}>
                {employeeTotalLogs}
              </div>
            </div>
            <div style={{ ...panelStyle, padding: 16 }}>
              <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                Last 30 Days
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#059669" }}>
                {employeeLogsLast30}
              </div>
            </div>
            <div style={{ ...panelStyle, padding: 16 }}>
              <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                Agencies
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#7c3aed" }}>
                {employeeAgenciesCount}
              </div>
            </div>
          </div>

          {/* Production Performance */}
          <div style={{ ...panelStyle, padding: 20 }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600, color: "#111827" }}>
              New Business Production (Assigned Agencies)
            </h3>

            {employeeProduction.agencyCount === 0 ? (
              <div style={{ fontSize: 13, color: "#9ca3af", padding: 20, textAlign: "center" }}>
                No production data available for this employee's agencies.
              </div>
            ) : (
              <>
                {/* Production Metrics */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                  <div style={{ padding: 12, background: "#eff6ff", borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                      Current Year YTD
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#1e40af" }}>
                      ${(employeeProduction.currentYearTotal / 1000).toFixed(0)}k
                    </div>
                  </div>
                  <div style={{ padding: 12, background: "#f3f4f6", borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                      Prior Year YTD
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#6b7280" }}>
                      ${(employeeProduction.priorYearTotal / 1000).toFixed(0)}k
                    </div>
                  </div>
                  <div style={{ padding: 12, background: employeeProduction.percentChange >= 0 ? "#ecfdf5" : "#fef2f2", borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: employeeProduction.percentChange >= 0 ? "#059669" : "#dc2626", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                      Year-over-Year
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: employeeProduction.percentChange >= 0 ? "#059669" : "#dc2626" }}>
                      {employeeProduction.percentChange >= 0 ? "+" : ""}{employeeProduction.percentChange.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div style={{ display: "flex", gap: 24, justifyContent: "center", fontSize: 12, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 24, height: 3, background: "#3b82f6", borderRadius: 2 }}></div>
                    <span style={{ color: "#374151", fontWeight: 600 }}>Current Year</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 24, height: 3, background: "#9ca3af", borderRadius: 2 }}></div>
                    <span style={{ color: "#374151", fontWeight: 600 }}>Prior Year</span>
                  </div>
                </div>

                {/* Line Graph */}
                {employeeProduction.monthlyData.length > 0 ? (
                  <div style={{ position: "relative", height: 240 }}>
                    <svg 
                      width="100%" 
                      height="100%" 
                      style={{ overflow: "visible" }}
                      viewBox="0 0 600 200"
                      preserveAspectRatio="none"
                    >
                      {/* Grid lines */}
                      {[0, 25, 50, 75, 100].map((percent) => (
                        <line
                          key={percent}
                          x1="0"
                          y1={200 - (percent * 2)}
                          x2="600"
                          y2={200 - (percent * 2)}
                          stroke="#e5e7eb"
                          strokeWidth="1"
                          vectorEffect="non-scaling-stroke"
                        />
                      ))}

                      {(() => {
                        const maxValue = Math.max(
                          ...employeeProduction.monthlyData.flatMap(d => [d.currentYear, d.priorYear])
                        );
                        const stepX = 600 / (employeeProduction.monthlyData.length - 1 || 1);

                        // Prior Year line
                        const priorYearPath = employeeProduction.monthlyData
                          .map((data, i) => {
                            const x = i * stepX;
                            const y = 200 - (maxValue > 0 ? (data.priorYear / maxValue) * 200 : 0);
                            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                          })
                          .join(' ');

                        // Current Year line
                        const currentYearPath = employeeProduction.monthlyData
                          .map((data, i) => {
                            const x = i * stepX;
                            const y = 200 - (maxValue > 0 ? (data.currentYear / maxValue) * 200 : 0);
                            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                          })
                          .join(' ');

                        return (
                          <>
                            {/* Prior Year Line */}
                            <path
                              d={priorYearPath}
                              fill="none"
                              stroke="#9ca3af"
                              strokeWidth="3"
                              vectorEffect="non-scaling-stroke"
                            />

                            {/* Current Year Line */}
                            <path
                              d={currentYearPath}
                              fill="none"
                              stroke="#3b82f6"
                              strokeWidth="3"
                              vectorEffect="non-scaling-stroke"
                            />

                            {/* Data points for Prior Year */}
                            {employeeProduction.monthlyData.map((data, i) => {
                              const x = i * stepX;
                              const y = 200 - (maxValue > 0 ? (data.priorYear / maxValue) * 200 : 0);
                              return (
                                <circle
                                  key={`prior-${i}`}
                                  cx={x}
                                  cy={y}
                                  r="4"
                                  fill="#9ca3af"
                                  stroke="#fff"
                                  strokeWidth="2"
                                  vectorEffect="non-scaling-stroke"
                                  style={{ cursor: "pointer" }}
                                >
                                  <title>{`${data.month}: $${(data.priorYear / 1000).toFixed(0)}k`}</title>
                                </circle>
                              );
                            })}

                            {/* Data points for Current Year */}
                            {employeeProduction.monthlyData.map((data, i) => {
                              const x = i * stepX;
                              const y = 200 - (maxValue > 0 ? (data.currentYear / maxValue) * 200 : 0);
                              return (
                                <circle
                                  key={`current-${i}`}
                                  cx={x}
                                  cy={y}
                                  r="4"
                                  fill="#3b82f6"
                                  stroke="#fff"
                                  strokeWidth="2"
                                  vectorEffect="non-scaling-stroke"
                                  style={{ cursor: "pointer" }}
                                >
                                  <title>{`${data.month}: $${(data.currentYear / 1000).toFixed(0)}k`}</title>
                                </circle>
                              );
                            })}
                          </>
                        );
                      })()}
                    </svg>

                    {/* Month labels */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6b7280", marginTop: 8 }}>
                      {employeeProduction.monthlyData.map((data, i) => (
                        <span key={i}>{data.month}</span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "#9ca3af", padding: 40, textAlign: "center" }}>
                    No monthly production data available
                  </div>
                )}

                <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280", textAlign: "center" }}>
                  Based on {employeeProduction.agencyCount} {employeeProduction.agencyCount === 1 ? "agency" : "agencies"} with production data
                </div>
              </>
            )}
          </div>

          {/* Recent Activity */}
          <div style={{ ...panelStyle, padding: 16 }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 600, color: "#111827" }}>
              Recent Marketing Calls
            </h3>

            {employeeTotalLogs === 0 ? (
              <div style={{ fontSize: 13, color: "#9ca3af", padding: 20, textAlign: "center" }}>
                No marketing calls found for this employee yet.
              </div>
            ) : (
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <thead style={{ position: "sticky", top: 0, background: "#f9fafb" }}>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280" }}>Date</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280" }}>Action</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280" }}>Agency</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280" }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeLogs.slice(0, 20).map((log) => (
                      <tr key={log.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                          {new Date(log.datetime).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          {log.action}
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          {log.agency_id ?? "—"}
                        </td>
                        <td style={{ padding: "8px 12px", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.notes || undefined}>
                          {log.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Assigned Agencies */}
          <div style={{ ...panelStyle, padding: 16 }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 600, color: "#111827" }}>
              Assigned Agencies ({employeeAgenciesCount})
            </h3>

            {employeeAgenciesCount === 0 ? (
              <div style={{ fontSize: 13, color: "#9ca3af", padding: 20, textAlign: "center" }}>
                No agencies are currently assigned to this employee.
              </div>
            ) : (
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <thead style={{ position: "sticky", top: 0, background: "#f9fafb" }}>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280" }}>Code</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280" }}>Agency</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280" }}>Office</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeAgencies.slice(0, 50).map((ag) => {
                      const office = offices.find((o) => o.id === ag.office_id);
                      const officeLabel = office ? office.code : "—";

                      return (
                        <tr key={ag.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "8px 12px" }}>{ag.code}</td>
                          <td style={{ padding: "8px 12px" }}>{ag.name}</td>
                          <td style={{ padding: "8px 12px" }}>{officeLabel}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
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

      {detailPanel}
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
