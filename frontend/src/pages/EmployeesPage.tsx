import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { WorkbenchLayout } from "../components/WorkbenchLayout";
import { apiGet } from "../api/client";
import { TabbedProductionGraph } from "../components/TabbedProductionGraph";
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
  office_id?: number | null; // Deprecated: kept for backward compatibility
  office_ids?: number[]; // List of office IDs (many-to-many relationship)
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
  contact_id: number | null;
  contact: string | null;
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
  twelve_mo_bound?: number | null;
  twelve_mo_quoted?: number | null;
  twelve_mo_decline?: number | null;
  three_year_plus?: number | null;
};

type Contact = {
  id: number;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  notes: string | null;
  agency_id: number;
  contact_frequency_days?: number | null;
};

interface EmployeeWithOffice extends Employee {
  officeCode?: string;
  officeName?: string;
}


export const EmployeesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [offices, setOffices] = useState<Office[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [production, setProduction] = useState<Production[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
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
        const [officesResp, employeesResp, logsResp, agenciesResp, productionResp, contactsResp] = await Promise.all([
          apiGet<Office[]>("/offices"),
          apiGet<Employee[]>("/employees"),
          apiGet<Log[]>("/logs"),
          apiGet<Agency[]>("/agencies"),
          apiGet<Production[]>("/production"),
          apiGet<Contact[]>("/contacts"),
        ]);

        setOffices(officesResp || []);
        setEmployees(employeesResp || []);
        setLogs(logsResp || []);
        setAgencies(agenciesResp || []);
        setProduction(productionResp || []);
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
      
      // Get all office IDs for this employee (many-to-many relationship)
      const employeeOfficeIds = emp.office_ids || (emp.office_id ? [emp.office_id] : []);
      
      // Add each office to the group
      employeeOfficeIds.forEach((officeId) => {
        if (!group.officeIds.includes(officeId)) {
          group.officeIds.push(officeId);
        }
        const office = officeById.get(officeId);
        if (office) {
          if (!group.officeCodes.includes(office.code)) {
            group.officeCodes.push(office.code);
          }
          if (!group.officeNames.includes(office.name)) {
            group.officeNames.push(office.name);
          }
        }
      });
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

  // Calculate activity metrics for employee
  const employeeActivityMetrics = useMemo(() => {
    const now = Date.now();
    const twelveMonthsMs = 12 * 30 * 24 * 60 * 60 * 1000; // Approximate 12 months
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    const logs12Months = employeeLogs.filter((log) => {
      const dt = new Date(log.datetime).getTime();
      if (Number.isNaN(dt)) return false;
      return now - dt <= twelveMonthsMs;
    });

    const logs30Days = employeeLogs.filter((log) => {
      const dt = new Date(log.datetime).getTime();
      if (Number.isNaN(dt)) return false;
      return now - dt <= thirtyDaysMs;
    });

    const inPerson12Mo = logs12Months.filter(log => log.action === "In Person").length;
    const emails12Mo = logs12Months.filter(log => log.action === "Email" || log.action === "Email Sent").length;
    const phone12Mo = logs12Months.filter(log => log.action === "Call / Zoom").length;
    const inPerson30d = logs30Days.filter(log => log.action === "In Person").length;
    const emails30d = logs30Days.filter(log => log.action === "Email" || log.action === "Email Sent").length;
    const phone30d = logs30Days.filter(log => log.action === "Call / Zoom").length;

    return {
      inPerson12Mo,
      emails12Mo,
      phone12Mo,
      inPerson30d,
      emails30d,
      phone30d,
    };
  }, [employeeLogs]);

  const employeeAgencies = useMemo(() => {
    if (!selectedEmployee) return [];

    const empIds = selectedEmployee.employeeIds;

    // Filter agencies where this employee is the CURRENT primary underwriter
    // Only use primary_underwriter_id - do NOT fall back to name matching
    // This ensures contacts switch correctly when primary underwriter changes
    return agencies
      .filter((ag) => {
        // Match by primary_underwriter_id only (most accurate)
        return typeof ag.primary_underwriter_id === "number" && empIds.includes(ag.primary_underwriter_id);
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

  // Get production data for employee's agencies (only primary underwriter)
  const employeeProductionData = useMemo(() => {
    if (!selectedEmployee || employeeAgencies.length === 0) return [];
    const agencyCodes = new Set(employeeAgencies.map(a => a.code?.toUpperCase()).filter(Boolean));
    return production.filter(p => agencyCodes.has(p.agency_code.toUpperCase()));
  }, [production, employeeAgencies, selectedEmployee]);

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

  // Calculate contacts needing attention (not contacted in 90+ days or never)
  // Shows all contacts from agencies where this employee is the CURRENT primary underwriter
  // When primary underwriter changes, contacts automatically switch to new underwriter
  const contactsNeedingAttention = useMemo(() => {
    if (!selectedEmployee || employeeAgencies.length === 0) return [];

    // Get agency IDs where this employee is CURRENTLY the primary underwriter
    const agencyIds = new Set(employeeAgencies.map((ag) => ag.id));
    const now = Date.now();
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

    // Get ALL contacts from agencies where this employee is the primary underwriter
    // Exclude contacts with contact_frequency_days === null (never contact)
    const employeeContacts = contacts.filter((contact) => {
      return agencyIds.has(contact.agency_id) && contact.contact_frequency_days !== null;
    });

    // For each contact, find the most recent log specifically for that contact
    const contactsWithLastContact = employeeContacts.map((contact) => {
      // Look for logs specifically for this contact (by contact_id)
      // This ensures we track when THIS specific contact was contacted, not just the agency
      const contactLogs = logs.filter((log) => 
        log.contact_id !== null && log.contact_id === contact.id
      );
      
      let mostRecentLog: Log | null = null;
      let mostRecentTime = 0;

      // Find the most recent contact-specific log
      contactLogs.forEach((log) => {
        const logTime = new Date(log.datetime).getTime();
        if (!Number.isNaN(logTime) && logTime > mostRecentTime) {
          mostRecentTime = logTime;
          mostRecentLog = log;
        }
      });

      const agency = agencies.find((ag) => ag.id === contact.agency_id);

      // Calculate days since last contact
      // If no contact-specific logs exist, contact was never contacted (daysSinceContact = Infinity)
      const daysSinceContact = mostRecentLog 
        ? Math.floor((now - mostRecentTime) / (24 * 60 * 60 * 1000)) 
        : Infinity;

      // Get the contact's frequency setting (default to 90 if not set)
      const frequencyDays = contact.contact_frequency_days ?? 90;

      return {
        contact,
        agency,
        lastContactDate: mostRecentLog ? new Date(mostRecentLog.datetime) : null,
        daysSinceContact,
        frequencyDays,
      };
    });

    // Filter to only contacts that need attention:
    // - Never been contacted (daysSinceContact = Infinity)
    // - Last contacted more than their frequency_days ago (daysSinceContact > frequencyDays)
    const needsAttention = contactsWithLastContact.filter(
      (item) => item.daysSinceContact > item.frequencyDays || item.daysSinceContact === Infinity
    );

    // Sort by agency name, then contact name for easy browsing
    return needsAttention.sort((a, b) => {
      const agencyA = (a.agency?.name || "").toLowerCase();
      const agencyB = (b.agency?.name || "").toLowerCase();
      if (agencyA < agencyB) return -1;
      if (agencyA > agencyB) return 1;
      const nameA = (a.contact.name || "").toLowerCase();
      const nameB = (b.contact.name || "").toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });
  }, [selectedEmployee, employeeAgencies, contacts, logs, agencies]);

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
            <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", marginBottom: 8 }}>
              <div>
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
              {(() => {
                // Get production data for employee's agencies (only where they are primary underwriter)
                const empIds = selectedEmployee.employeeIds;
                const employeeAgencies = agencies.filter((ag) => {
                  return typeof ag.primary_underwriter_id === "number" && empIds.includes(ag.primary_underwriter_id);
                });
                const agencyCodes = new Set(employeeAgencies.map(a => a.code?.toUpperCase()).filter(Boolean));
                const employeeProductionData = production.filter(p => agencyCodes.has(p.agency_code.toUpperCase()));
                
                let totalBound = 0;
                let totalQuoted = 0;
                let totalDeclined = 0;
                let avgLossRatio = 0;
                let hitRatio = 0;
                
                if (employeeProductionData.length > 0) {
                  const mostRecentMonth = employeeProductionData.map(r => r.month).sort().pop();
                  if (mostRecentMonth) {
                    const recentRecords = employeeProductionData.filter(r => r.month === mostRecentMonth);
                    totalBound = recentRecords.reduce((sum, r) => sum + (r.twelve_mo_bound || 0), 0);
                    totalQuoted = recentRecords.reduce((sum, r) => sum + (r.twelve_mo_quoted || 0), 0);
                    totalDeclined = recentRecords.reduce((sum, r) => sum + (r.twelve_mo_decline || 0), 0);
                    const recordsWithLossRatio = recentRecords.filter(r => r.three_year_plus != null && r.three_year_plus > 0);
                    avgLossRatio = recordsWithLossRatio.length > 0
                      ? recordsWithLossRatio.reduce((sum, r) => sum + (r.three_year_plus || 0), 0) / recordsWithLossRatio.length
                      : 0;
                    hitRatio = totalQuoted > 0 ? (totalBound / totalQuoted) * 100 : 0;
                  }
                }
                
                return (
                  <div style={{ display: "flex", gap: 24, alignItems: "center", marginLeft: "auto" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Bound</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#059669" }}>
                        {totalBound > 0 ? totalBound.toLocaleString() : "—"}
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Quoted</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#3b82f6" }}>
                        {totalQuoted > 0 ? totalQuoted.toLocaleString() : "—"}
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Hit Ratio</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: hitRatio > 30 ? "#059669" : hitRatio > 20 ? "#f59e0b" : hitRatio > 0 ? "#dc2626" : "#6b7280" }}>
                        {hitRatio > 0 ? `${hitRatio.toFixed(1)}%` : "—"}
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Declined</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#dc2626" }}>
                        {totalDeclined > 0 ? totalDeclined.toLocaleString() : "—"}
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>3YR LR</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: avgLossRatio > 60 ? "#dc2626" : avgLossRatio > 50 ? "#f59e0b" : avgLossRatio > 0 ? "#059669" : "#6b7280" }}>
                        {avgLossRatio > 0 ? `${avgLossRatio.toFixed(1)}%` : "—"}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Activity Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
            <div style={{ ...panelStyle, padding: 16 }}>
              <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                In Person (12 Mo)
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#1e40af" }}>
                {employeeActivityMetrics.inPerson12Mo}
              </div>
            </div>
            <div style={{ ...panelStyle, padding: 16 }}>
              <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                Emails (12 Mo)
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#059669" }}>
                {employeeActivityMetrics.emails12Mo}
              </div>
            </div>
            <div style={{ ...panelStyle, padding: 16 }}>
              <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                Phone (12 Mo)
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#7c3aed" }}>
                {employeeActivityMetrics.phone12Mo}
              </div>
            </div>
            <div style={{ ...panelStyle, padding: 16 }}>
              <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                In Person (30d)
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#1e40af" }}>
                {employeeActivityMetrics.inPerson30d}
              </div>
            </div>
            <div style={{ ...panelStyle, padding: 16 }}>
              <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                Emails (30d)
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#059669" }}>
                {employeeActivityMetrics.emails30d}
              </div>
            </div>
            <div style={{ ...panelStyle, padding: 16 }}>
              <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                Phone (30d)
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#7c3aed" }}>
                {employeeActivityMetrics.phone30d}
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
                {/* Production Graph */}
                {employeeProductionData.length > 0 ? (
                  <TabbedProductionGraph
                    productionData={employeeProductionData}
                    title={`Written Premium Trend - ${selectedEmployee.name}`}
                    height={280}
                  />
                ) : (
                  <div style={{ fontSize: 13, color: "#9ca3af", padding: 40, textAlign: "center" }}>
                    No production data available for charting.
                  </div>
                )}

                <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280", textAlign: "center" }}>
                  Based on {employeeProduction.agencyCount} {employeeProduction.agencyCount === 1 ? "agency" : "agencies"} with production data
                </div>
              </>
            )}
          </div>

          {/* Contacts Needing Attention */}
          <div style={{ ...panelStyle, padding: 16 }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 600, color: "#111827" }}>
              Contacts Needing Attention
              <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 400, color: "#6b7280" }}>
                (Not contacted in 90+ days or never contacted)
              </span>
            </h3>

            {contactsNeedingAttention.length === 0 ? (
              <div style={{ fontSize: 13, color: "#9ca3af", padding: 20, textAlign: "center" }}>
                All contacts for this employee's agencies have been contacted recently. Great work!
              </div>
            ) : (
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <thead style={{ position: "sticky", top: 0, background: "#f9fafb" }}>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280" }}>Agency</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280" }}>Contact</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280" }}>Title</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280" }}>Email</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280" }}>Phone</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280" }}>Last Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contactsNeedingAttention.map((item) => (
                      <tr 
                        key={item.contact.id} 
                        onClick={() => {
                          if (item.agency) {
                            window.location.href = `/crm/agencies/${item.agency.id}`;
                          }
                        }}
                        style={{ 
                          borderBottom: "1px solid #f3f4f6",
                          cursor: "pointer",
                          transition: "background-color 0.1s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#f9fafb";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <td style={{ padding: "8px 12px", fontWeight: 500 }}>
                          {item.agency?.name || "—"}
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          {item.contact.name}
                        </td>
                        <td style={{ padding: "8px 12px", color: "#6b7280" }}>
                          {item.contact.title || "—"}
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          {item.contact.email ? (
                            <a 
                              href={`mailto:${item.contact.email}`} 
                              style={{ color: "#2563eb", textDecoration: "none" }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {item.contact.email}
                            </a>
                          ) : "—"}
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          {item.contact.phone || "—"}
                        </td>
                        <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                          {item.lastContactDate ? (
                            <span style={{ color: "#dc2626" }}>
                              {item.lastContactDate.toLocaleDateString()} ({item.daysSinceContact} days ago)
                            </span>
                          ) : (
                            <span style={{ color: "#dc2626", fontWeight: 600 }}>
                              Never contacted
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div style={{ ...panelStyle, padding: 16 }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 600, color: "#111827" }}>
              Recent Marketing Calls
            </h3>

            {employeeActivityMetrics.inPerson12Mo === 0 && employeeActivityMetrics.emails12Mo === 0 && employeeActivityMetrics.phone12Mo === 0 && employeeActivityMetrics.inPerson30d === 0 && employeeActivityMetrics.emails30d === 0 && employeeActivityMetrics.phone30d === 0 ? (
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
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280" }}>Contact</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280" }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeLogs.slice(0, 20).map((log) => {
                      const agency = log.agency_id ? agencies.find(a => a.id === log.agency_id) : null;
                      // Use contact_id if available, otherwise try to find contact by agency
                      const contact = log.contact_id 
                        ? contacts.find(c => c.id === log.contact_id)
                        : (log.agency_id ? contacts.find(c => c.agency_id === log.agency_id) : null);
                      // Use the frozen contact name from log if available, otherwise use contact.name
                      const contactName = log.contact || contact?.name || null;
                      
                      return (
                        <tr key={log.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                            {new Date(log.datetime).toLocaleDateString()}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            {log.action}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            {agency ? (
                              <button
                                type="button"
                                onClick={() => navigate(`/crm/agencies/${agency.id}`)}
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
                                {agency.name}
                              </button>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            {contactName && agency ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const contactId = contact?.id || log.contact_id;
                                  if (contactId) {
                                    navigate(`/crm/agencies/${agency.id}?contactId=${contactId}`);
                                  } else {
                                    navigate(`/crm/agencies/${agency.id}`);
                                  }
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
                                {contactName}
                              </button>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td style={{ padding: "8px 12px", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.notes || undefined}>
                            {log.notes || "—"}
                          </td>
                        </tr>
                      );
                    })}
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
                          <td style={{ padding: "8px 12px" }}>
                            <button
                              type="button"
                              onClick={() => navigate(`/crm/agencies/${ag.id}`)}
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
                              {ag.code}
                            </button>
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <button
                              type="button"
                              onClick={() => navigate(`/crm/agencies/${ag.id}`)}
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
                              {ag.name}
                            </button>
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            {office ? (
                              <button
                                type="button"
                                onClick={() => navigate(`/crm/offices/${office.id}`)}
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
                                {officeLabel}
                              </button>
                            ) : (
                              officeLabel
                            )}
                          </td>
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
