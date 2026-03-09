import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WorkbenchLayout } from "../components/WorkbenchLayout";
import { apiGet } from "../api/client";
import {
  cardStyle,
  panelStyle,
  tableContainerStyle,
  tableBaseStyle,
  tableHeaderCellStyle,
  tableCellStyle,
  tableHeaderStickyStyle,
  kpiLabelStyle,
  kpiValueStyle,
  sectionHeadingStyle,
  secondaryButtonStyle,
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

type UnderwriterStats = {
  user: string;
  inPerson12Mo: number;
  emails12Mo: number;
  phone12Mo: number;
  inPerson30d: number;
  emails30d: number;
  phone30d: number;
};

const CrmHomePage: React.FC = () => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExportingContacts, setIsExportingContacts] = useState(false);
  const [sortColumn, setSortColumn] = useState<keyof UnderwriterStats | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [officesResp, employeesResp, logsResp] = await Promise.all([
          apiGet<Office[]>("/offices"),
          apiGet<Employee[]>("/employees"),
          apiGet<Log[]>("/logs"),
        ]);
        setOffices(officesResp || []);
        setEmployees(employeesResp || []);
        setLogs(logsResp || []);
      } catch (err: any) {
        setError(err?.message || "Failed to load CRM data");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [selectedOfficeId]);

  const underwriterStats = useMemo(() => {
    const now = Date.now();
    const twelveMonthsMs = 12 * 30 * 24 * 60 * 60 * 1000; // Approximate 12 months
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    const statsMap = new Map<string, UnderwriterStats>();

    logs.forEach((log) => {
      const user = (log.user || "").trim();
      if (!user) return;
      const userKey = user.toLowerCase();
      const logDate = new Date(log.datetime).getTime();
      if (Number.isNaN(logDate)) return;
      const action = (log.action || "").trim();

      const current = statsMap.get(userKey) || {
        user,
        inPerson12Mo: 0,
        emails12Mo: 0,
        phone12Mo: 0,
        inPerson30d: 0,
        emails30d: 0,
        phone30d: 0,
      };

      const timeDiff = now - logDate;
      const isInPerson = action === "In Person";
      const isEmail = action === "Email" || action === "Email Sent";
      const isPhone = action === "Call / Zoom";

      // 12 months metrics
      if (timeDiff <= twelveMonthsMs) {
        if (isInPerson) current.inPerson12Mo += 1;
        if (isEmail) current.emails12Mo += 1;
        if (isPhone) current.phone12Mo += 1;
      }

      // 30 days metrics
      if (timeDiff <= thirtyDaysMs) {
        if (isInPerson) current.inPerson30d += 1;
        if (isEmail) current.emails30d += 1;
        if (isPhone) current.phone30d += 1;
      }

      statsMap.set(userKey, current);
    });

    let result = Array.from(statsMap.values());

    if (selectedOfficeId) {
      const allowedUsers = new Set(
        employees
          .filter((emp) => 
            (emp.office_ids && emp.office_ids.includes(selectedOfficeId)) || 
            (emp.office_id === selectedOfficeId) // Backward compatibility
          )
          .map((emp) => (emp.name || "").trim().toLowerCase())
      );
      result = result.filter((s) => allowedUsers.has((s.user || "").trim().toLowerCase()));
    }

    // Apply sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }
        return 0;
      });
    }

    return result;
  }, [logs, employees, selectedOfficeId, sortColumn, sortDirection]);

  const handleSort = (column: keyof UnderwriterStats) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const sidebar = (
    <>
      <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13, color: "#111827" }}>Offices</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {offices.map((office) => {
          const isActive = office.id === selectedOfficeId;
          return (
            <div
              key={office.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 6,
                padding: "6px 8px",
                borderRadius: 6,
                backgroundColor: isActive ? "#eff6ff" : "transparent",
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedOfficeId(office.id)}
                style={{
                  textAlign: "left",
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  color: isActive ? "#1d4ed8" : "#374151",
                  cursor: "pointer",
                  fontSize: 13,
                  flex: 1,
                }}
              >
                {office.code} – {office.name}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/crm/offices/${office.id}`)}
                style={{
                  ...secondaryButtonStyle,
                  fontSize: 11,
                  padding: "4px 8px",
                  borderRadius: 6,
                  whiteSpace: "nowrap",
                }}
              >
                View
              </button>
            </div>
          );
        })}
        {offices.length === 0 && <div style={{ fontSize: 12, color: "#6b7280" }}>No offices found.</div>}
      </div>
    </>
  );

  return (
    <WorkbenchLayout
      title="Office List and Underwriter Marketing Calls"
      subtitle="Track marketing activity across offices and underwriters"
      sidebar={sidebar}
    >

        {error && <div style={{ color: "red", fontSize: 12 }}>{error}</div>}
        {isLoading && <div style={{ fontSize: 12, color: "#6b7280" }}>Loading CRM data…</div>}

        <div
          style={{
            ...panelStyle,
            flex: 1,
            minHeight: 280,
          }}
        >
          <div style={sectionHeadingStyle}>Underwriter Marketing Activity</div>
          <div style={tableContainerStyle}>
            <table style={tableBaseStyle}>
              <thead>
                <tr>
                  <th style={tableHeaderStickyStyle}>Underwriter</th>
                  <th 
                    style={{ ...tableHeaderStickyStyle, cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("inPerson12Mo")}
                  >
                    In Person (12 Mo) {sortColumn === "inPerson12Mo" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                  </th>
                  <th 
                    style={{ ...tableHeaderStickyStyle, cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("emails12Mo")}
                  >
                    Emails (12 Mo) {sortColumn === "emails12Mo" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                  </th>
                  <th 
                    style={{ ...tableHeaderStickyStyle, cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("phone12Mo")}
                  >
                    Phone (12 Mo) {sortColumn === "phone12Mo" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                  </th>
                  <th 
                    style={{ ...tableHeaderStickyStyle, cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("inPerson30d")}
                  >
                    In Person (30d) {sortColumn === "inPerson30d" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                  </th>
                  <th 
                    style={{ ...tableHeaderStickyStyle, cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("emails30d")}
                  >
                    Emails (30d) {sortColumn === "emails30d" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                  </th>
                  <th 
                    style={{ ...tableHeaderStickyStyle, cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("phone30d")}
                  >
                    Phone (30d) {sortColumn === "phone30d" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                  </th>
                </tr>
              </thead>
            <tbody>
              {underwriterStats.map((uw) => {
                const employee = employees.find(e => e.name.toLowerCase() === (uw.user || "").toLowerCase());
                return (
                  <tr key={uw.user}>
                    <td style={tableCellStyle}>
                      {employee ? (
                        <button
                          type="button"
                          onClick={() => {
                            const params = new URLSearchParams();
                            if (employee.id) params.set("employeeId", String(employee.id));
                            if (employee.name) params.set("employeeName", employee.name);
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
                          {uw.user}
                        </button>
                      ) : (
                        uw.user
                      )}
                    </td>
                    <td style={tableCellStyle}>{uw.inPerson12Mo}</td>
                    <td style={tableCellStyle}>{uw.emails12Mo}</td>
                    <td style={tableCellStyle}>{uw.phone12Mo}</td>
                    <td style={tableCellStyle}>{uw.inPerson30d}</td>
                    <td style={tableCellStyle}>{uw.emails30d}</td>
                    <td style={tableCellStyle}>{uw.phone30d}</td>
                  </tr>
                );
              })}
              {underwriterStats.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ ...tableCellStyle, textAlign: "center", fontSize: 12, color: "#6b7280" }}>
                    {selectedOfficeId ? "No marketing logs found for the selected office yet." : "No marketing logs found yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* Export My Contacts Button - Bottom Right */}
        <button
          type="button"
          onClick={async () => {
            if (isExportingContacts) return;
            setIsExportingContacts(true);
            try {
              const { apiDownloadFile } = await import("../api/client");
              const filename = `my_contacts_${new Date().toISOString().split("T")[0]}.xlsx`;
              await apiDownloadFile("/contacts/export/my-contacts", filename);
            } catch (err: any) {
              alert(`Failed to export contacts: ${err?.message || "Unknown error"}`);
            } finally {
              setIsExportingContacts(false);
            }
          }}
          disabled={isExportingContacts}
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            padding: "12px 24px",
            backgroundColor: isExportingContacts ? "#9ca3af" : "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: isExportingContacts ? "not-allowed" : "pointer",
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            zIndex: 1000,
          }}
          onMouseEnter={(e) => {
            if (!isExportingContacts) {
              e.currentTarget.style.backgroundColor = "#1d4ed8";
            }
          }}
          onMouseLeave={(e) => {
            if (!isExportingContacts) {
              e.currentTarget.style.backgroundColor = "#2563eb";
            }
          }}
        >
          {isExportingContacts ? "⏳ Exporting..." : "📥 Download My Contacts"}
        </button>
    </WorkbenchLayout>
  );
};

export default CrmHomePage;
