import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiGet, apiPost } from "../api/client";
import { TabbedProductionGraph } from "../components/TabbedProductionGraph";
import {
  cardStyle,
  panelStyle,
  inputStyle,
  labelStyle,
  tableContainerStyle,
  tableBaseStyle,
  tableHeaderCellStyle,
  tableCellStyle,
  selectStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from "../ui/designSystem";

// Types reused across CRM
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

 type Log = {
  id: number;
  user: string;
  datetime: string;
  action: string;
  agency_id: number | null;
  office: string | null;
  notes: string | null;
};

 type EmployeeMetrics = {
  id: number;
  name: string;
  inPerson12Mo: number;
  emails12Mo: number;
  phone12Mo: number;
  inPerson30d: number;
  emails30d: number;
  phone30d: number;
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
  twelve_mo_bound: number | null;
  twelve_mo_quoted: number | null;
  twelve_mo_decline: number | null;
  three_year_plus: number | null;
};


 const CrmOfficeDetailPage: React.FC = () => {
  const { officeId } = useParams<{ officeId: string }>();
  const navigate = useNavigate();
  const officeIdNum = officeId ? Number(officeId) : null;

  const [offices, setOffices] = useState<Office[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [productionData, setProductionData] = useState<ProductionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchText, setSearchText] = useState("");
  const [agencySearch, setAgencySearch] = useState("");

  const [newAgencyName, setNewAgencyName] = useState("");
  const [newAgencyCode, setNewAgencyCode] = useState("");
  const [newAgencyWeb, setNewAgencyWeb] = useState("");
  const [newAgencyNotes, setNewAgencyNotes] = useState("");
  const [newAgencyUwId, setNewAgencyUwId] = useState<string>("");

  const loadAll = async () => {
    if (!officeIdNum) return;
    setIsLoading(true);
    setError(null);
    try {
      const [officesResp, employeesResp, agenciesResp, logsResp, productionResp] = await Promise.all([
        apiGet<Office[]>("/offices"),
        apiGet<Employee[]>("/employees"),
        apiGet<Agency[]>("/agencies"),
        apiGet<Log[]>("/logs"),
        apiGet<ProductionRecord[]>("/production"),
      ]);
      setOffices(officesResp || []);
      setEmployees(employeesResp || []);
      setAgencies(agenciesResp || []);
      setLogs(logsResp || []);
      setProductionData(productionResp || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load office details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [officeIdNum]);

  const office = useMemo(() => offices.find((o) => o.id === officeIdNum) || null, [offices, officeIdNum]);

  const officeEmployees = useMemo(
    () => employees.filter((e) => 
      (e.office_ids && e.office_ids.includes(officeIdNum)) || 
      (e.office_id === officeIdNum) // Backward compatibility
    ),
    [employees, officeIdNum]
  );

  const officeAgencies = useMemo(
    () => agencies.filter((a) => a.office_id === officeIdNum),
    [agencies, officeIdNum]
  );

  const filteredAgenciesForOffice = useMemo(() => {
    const term = agencySearch.trim().toLowerCase();
    if (!term) return officeAgencies;
    return officeAgencies.filter((a) => {
      const name = (a.name || "").toLowerCase();
      const code = (a.code || "").toLowerCase();
      return name.includes(term) || code.includes(term);
    });
  }, [agencySearch, officeAgencies]);

  const logsForOffice = useMemo(() => {
    const agencyIds = new Set(officeAgencies.map((a) => a.id));
    return logs.filter((l) => (l.agency_id ? agencyIds.has(l.agency_id) : false));
  }, [logs, officeAgencies]);

  const [sortColumn, setSortColumn] = useState<keyof EmployeeMetrics | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const employeeMetrics: EmployeeMetrics[] = useMemo(() => {
    const now = Date.now();
    const twelveMonthsMs = 12 * 30 * 24 * 60 * 60 * 1000; // Approximate 12 months
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    const byName = new Map<string, EmployeeMetrics>();
    officeEmployees.forEach((emp) => {
      const name = (emp.name || "").trim();
      byName.set(name.toLowerCase(), {
        id: emp.id,
        name,
        inPerson12Mo: 0,
        emails12Mo: 0,
        phone12Mo: 0,
        inPerson30d: 0,
        emails30d: 0,
        phone30d: 0,
      });
    });

    logsForOffice.forEach((log) => {
      const user = (log.user || "").trim().toLowerCase();
      if (!byName.has(user)) return;
      const entry = byName.get(user)!;
      const dt = new Date(log.datetime).getTime();
      if (Number.isNaN(dt)) return;
      const action = (log.action || "").trim();
      const isInPerson = action === "In Person";
      const isEmail = action === "Email" || action === "Email Sent";
      const isPhone = action === "Call / Zoom";

      const timeDiff = now - dt;

      // 12 months metrics
      if (timeDiff <= twelveMonthsMs) {
        if (isInPerson) entry.inPerson12Mo += 1;
        if (isEmail) entry.emails12Mo += 1;
        if (isPhone) entry.phone12Mo += 1;
      }

      // 30 days metrics
      if (timeDiff <= thirtyDaysMs) {
        if (isInPerson) entry.inPerson30d += 1;
        if (isEmail) entry.emails30d += 1;
        if (isPhone) entry.phone30d += 1;
      }
    });

    let result = Array.from(byName.values());

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
  }, [logsForOffice, officeEmployees, sortColumn, sortDirection]);

  const handleSort = (column: keyof EmployeeMetrics) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const filteredAgencies = useMemo(() => {
    if (!searchText.trim()) return [] as Agency[];
    const needle = searchText.trim().toLowerCase();
    return officeAgencies.filter((a) => (a.name || "").toLowerCase().includes(needle));
  }, [officeAgencies, searchText]);

  const recentActivity = useMemo(() => {
    const sorted = [...logsForOffice].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
    return sorted.slice(0, 5);
  }, [logsForOffice]);

  const handleCreateAgency = async () => {
    if (!officeIdNum) return;
    if (!newAgencyName.trim()) return;
    const payload: Partial<Agency> & { office_id: number } = {
      name: newAgencyName.trim(),
      code: newAgencyCode.trim() || undefined,
      web_address: newAgencyWeb.trim() || undefined,
      notes: newAgencyNotes.trim() || undefined,
      office_id: officeIdNum,
    };
    if (newAgencyUwId) {
      const uwIdNum = Number(newAgencyUwId);
      if (!Number.isNaN(uwIdNum)) {
        payload.primary_underwriter_id = uwIdNum;
        const uw = officeEmployees.find((e) => e.id === uwIdNum);
        if (uw) payload.primary_underwriter = uw.name;
      }
    }

    try {
      await apiPost<Agency, typeof payload>("/agencies", payload);
      setNewAgencyName("");
      setNewAgencyCode("");
      setNewAgencyWeb("");
      setNewAgencyNotes("");
      setNewAgencyUwId("");
      loadAll();
    } catch (err: any) {
      setError(err?.message || "Failed to create agency");
    }
  };

  const formatDateTime = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };

  const officeTitle = office ? office.name : officeId ? `Office ${officeId}` : "Office";

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => navigate("/crm/offices")}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#f9fafb",
              cursor: "pointer",
            }}
          >
            Back to Offices
          </button>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0f2742", marginLeft: 8 }}>{officeTitle}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {office && (() => {
            const officeProduction = productionData.filter(p => p.office === office.code);
            const mostRecentMonth = officeProduction.length > 0
              ? officeProduction.map(r => r.month).sort().pop()
              : null;
            if (!mostRecentMonth) return null;
            
            const recentRecords = officeProduction.filter(r => r.month === mostRecentMonth);
            const totalBound = recentRecords.reduce((sum, r) => sum + (r.twelve_mo_bound || 0), 0);
            const totalQuoted = recentRecords.reduce((sum, r) => sum + (r.twelve_mo_quoted || 0), 0);
            const totalDeclined = recentRecords.reduce((sum, r) => sum + (r.twelve_mo_decline || 0), 0);
            if (totalBound === 0 && totalQuoted === 0 && totalDeclined === 0) {
              return null;
            }
            
            const hitRatio = totalQuoted > 0 ? (totalBound / totalQuoted) * 100 : 0;
            
            return (
              <div style={{ display: "flex", gap: 24, alignItems: "center", marginRight: 16 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Bound</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#059669" }}>{totalBound.toLocaleString()}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Quoted</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#3b82f6" }}>{totalQuoted.toLocaleString()}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Hit Ratio</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: hitRatio > 30 ? "#059669" : hitRatio > 20 ? "#f59e0b" : "#dc2626" }}>
                    {hitRatio > 0 ? `${hitRatio.toFixed(1)}%` : "—"}
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Declined</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#dc2626" }}>{totalDeclined.toLocaleString()}</div>
                </div>
              </div>
            );
          })()}
          {officeIdNum && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const { apiDownloadFile } = await import("../api/client");
                  const office = offices.find((o) => o.id === officeIdNum);
                  const filename = office
                    ? `${office.code}_${office.name.replace(/[^a-z0-9-_]+/gi, "_")}_contacts_${new Date().toISOString().split("T")[0]}.xlsx`
                    : `office_${officeIdNum}_contacts.xlsx`;
                  await apiDownloadFile(`/contacts/export/office/${officeIdNum}`, filename);
                } catch (err: any) {
                  alert(`Failed to export contacts: ${err?.message || "Unknown error"}`);
                }
              }}
              style={{
                padding: "8px 16px",
                backgroundColor: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginLeft: "auto",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#1d4ed8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#2563eb";
              }}
            >
              📥 Export Office Contacts
            </button>
          )}
        </div>
      </div>

      {error && <div style={{ color: "red", fontSize: 12 }}>{error}</div>}
      {isLoading && <div style={{ fontSize: 12, color: "#6b7280" }}>Loading office data-</div>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1.8fr",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Employees</div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1.2fr repeat(6, 1fr)",
            gap: 8,
            fontSize: 11,
            color: "#6b7280",
            marginBottom: 6,
          }}>
            <div>Name</div>
            <div 
              style={{ textAlign: "right", cursor: "pointer", userSelect: "none" }}
              onClick={() => handleSort("inPerson12Mo")}
            >
              In Person (12 Mo) {sortColumn === "inPerson12Mo" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
            </div>
            <div 
              style={{ textAlign: "right", cursor: "pointer", userSelect: "none" }}
              onClick={() => handleSort("emails12Mo")}
            >
              Emails (12 Mo) {sortColumn === "emails12Mo" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
            </div>
            <div 
              style={{ textAlign: "right", cursor: "pointer", userSelect: "none" }}
              onClick={() => handleSort("phone12Mo")}
            >
              Phone (12 Mo) {sortColumn === "phone12Mo" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
            </div>
            <div 
              style={{ textAlign: "right", cursor: "pointer", userSelect: "none" }}
              onClick={() => handleSort("inPerson30d")}
            >
              In Person (30d) {sortColumn === "inPerson30d" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
            </div>
            <div 
              style={{ textAlign: "right", cursor: "pointer", userSelect: "none" }}
              onClick={() => handleSort("emails30d")}
            >
              Emails (30d) {sortColumn === "emails30d" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
            </div>
            <div 
              style={{ textAlign: "right", cursor: "pointer", userSelect: "none" }}
              onClick={() => handleSort("phone30d")}
            >
              Phone (30d) {sortColumn === "phone30d" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {employeeMetrics.map((emp) => (
              <div
                key={emp.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr repeat(6, 1fr)",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12,
                }}
              >
                <button
                  type="button"
                  style={{
                    textAlign: "left",
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    color: "#1d4ed8",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (emp.id) params.set("employeeId", String(emp.id));
                    if (emp.name) params.set("employeeName", emp.name);
                    navigate(`/crm/employees?${params.toString()}`);
                  }}
                >
                  {emp.name}
                </button>
                <div style={{ textAlign: "right" }}>{emp.inPerson12Mo}</div>
                <div style={{ textAlign: "right" }}>{emp.emails12Mo}</div>
                <div style={{ textAlign: "right" }}>{emp.phone12Mo}</div>
                <div style={{ textAlign: "right" }}>{emp.inPerson30d}</div>
                <div style={{ textAlign: "right" }}>{emp.emails30d}</div>
                <div style={{ textAlign: "right" }}>{emp.phone30d}</div>
              </div>
            ))}
            {employeeMetrics.length === 0 && (
              <div style={{ fontSize: 12, color: "#6b7280" }}>No employees assigned to this office.</div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Search Agencies</div>
            <input
              placeholder="Search (Start typing to see results)..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "6px 8px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 13,
                lineHeight: "20px",
                backgroundColor: "#f9fafb",
                marginBottom: 10,
              }}
            />
            {searchText.trim().length === 0 ? (
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Enter a name in the search box above to quickly find agents.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredAgencies.map((ag) => (
                  <div
                    key={ag.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr auto",
                      gap: 8,
                      alignItems: "center",
                      padding: "8px 10px",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/crm/agencies/${ag.id}`)}
                      style={{
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        color: "#1d4ed8",
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      {ag.name}
                    </button>
                    <div style={{ fontSize: 12, color: "#374151" }}>
                      Code: {ag.code || "-"} | UW: {ag.primary_underwriter ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const uw = officeEmployees.find(e => e.name === ag.primary_underwriter);
                            const params = new URLSearchParams();
                            if (uw?.id) params.set("employeeId", String(uw.id));
                            if (ag.primary_underwriter) params.set("employeeName", ag.primary_underwriter);
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
                          {ag.primary_underwriter}
                        </button>
                      ) : (
                        "Unassigned"
                      )}
                      {ag.web_address ? (
                        <div>
                          <a
                            href={ag.web_address}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: 11, color: "#2563eb" }}
                          >
                            {ag.web_address}
                          </a>
                        </div>
                      ) : null}
                      {ag.notes ? (
                        <div style={{ fontSize: 11, color: "#6b7280" }}>
                          {ag.notes.length > 80 ? `${ag.notes.slice(0, 80)}-` : ag.notes}
                        </div>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280", textAlign: "right" }}>
                      Status: {ag.active_flag || "Unknown"}
                    </div>
                  </div>
                ))}
                {filteredAgencies.length === 0 && (
                  <div style={{ fontSize: 12, color: "#6b7280" }}>No agencies match that search.</div>
                )}
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <details>
              <summary style={{ fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 6 }}>Add New</summary>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  placeholder="Name*"
                  value={newAgencyName}
                  onChange={(e) => setNewAgencyName(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 13,
                    lineHeight: "20px",
                    backgroundColor: "#f9fafb",
                  }}
                />
                <input
                  placeholder="Web Address"
                  value={newAgencyWeb}
                  onChange={(e) => setNewAgencyWeb(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 13,
                    lineHeight: "20px",
                    backgroundColor: "#f9fafb",
                  }}
                />
                <input
                  placeholder="Code"
                  value={newAgencyCode}
                  onChange={(e) => setNewAgencyCode(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 13,
                    lineHeight: "20px",
                    backgroundColor: "#f9fafb",
                  }}
                />
                <select
                  value={newAgencyUwId}
                  onChange={(e) => setNewAgencyUwId(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 13,
                    lineHeight: "20px",
                    backgroundColor: "#f9fafb",
                  }}
                >
                  <option value="">Primary Underwriter</option>
                  {officeEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
                <textarea
                  placeholder="Notes"
                  value={newAgencyNotes}
                  onChange={(e) => setNewAgencyNotes(e.target.value)}
                  rows={3}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 13,
                    lineHeight: "20px",
                    backgroundColor: "#f9fafb",
                    resize: "vertical",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
                      fontWeight: 600,
                    }}
                    disabled={!newAgencyName.trim()}
                  >
                    Create
                  </button>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Office Production Graph */}
      {office && (
        <TabbedProductionGraph
          productionData={productionData.filter(p => p.office === office.code)}
          title={`Written Premium Trend - ${office.name} (${office.code})`}
          height={280}
        />
      )}


      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Recent Activity</div>
          {recentActivity.length === 0 ? (
            <div style={{ fontSize: 12, color: "#6b7280" }}>No recent activity for this office.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                  <th style={{ padding: "4px 6px" }}>Date</th>
                  <th style={{ padding: "4px 6px" }}>Agency</th>
                  <th style={{ padding: "4px 6px" }}>Type</th>
                  <th style={{ padding: "4px 6px" }}>User</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((log) => {
                  const agency = officeAgencies.find((a) => a.id === log.agency_id);
                  const logEmployee = officeEmployees.find(e => e.name.toLowerCase() === (log.user || "").toLowerCase());
                  return (
                    <tr key={log.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "4px 6px" }}>{formatDateTime(log.datetime)}</td>
                      <td style={{ padding: "4px 6px" }}>
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
                          ""
                        )}
                      </td>
                      <td style={{ padding: "4px 6px" }}>{log.action}</td>
                      <td style={{ padding: "4px 6px" }}>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Agencies for this Office</div>
          <div style={{ marginBottom: 8 }}>
            <input
              type="text"
              placeholder="Search agencies (name or code)…"
              value={agencySearch}
              onChange={(e) => setAgencySearch(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "6px 8px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 13,
                lineHeight: "20px",
                backgroundColor: "#f9fafb",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredAgenciesForOffice.map((ag) => (
              <div
                key={ag.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr auto",
                  gap: 8,
                  alignItems: "center",
                  padding: "8px 10px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => navigate(`/crm/agencies/${ag.id}`)}
                  style={{
                    textAlign: "left",
                    border: "none",
                    background: "transparent",
                    color: "#1d4ed8",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  {ag.name}
                </button>
                <div style={{ fontSize: 12, color: "#374151" }}>
                  Code: {ag.code || "-"} | UW: {ag.primary_underwriter ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const uw = officeEmployees.find(e => e.name === ag.primary_underwriter);
                        const params = new URLSearchParams();
                        if (uw?.id) params.set("employeeId", String(uw.id));
                        if (ag.primary_underwriter) params.set("employeeName", ag.primary_underwriter);
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
                      {ag.primary_underwriter}
                    </button>
                  ) : (
                    "Unassigned"
                  )}
                  {ag.web_address ? (
                    <div>
                      <a
                        href={ag.web_address}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 11, color: "#2563eb" }}
                      >
                        {ag.web_address}
                      </a>
                    </div>
                  ) : null}
                  {ag.notes ? (
                    <div style={{ fontSize: 11, color: "#6b7280" }}>
                      {ag.notes.length > 80 ? `${ag.notes.slice(0, 80)}-` : ag.notes}
                    </div>
                  ) : null}
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", textAlign: "right" }}>
                  Status: {ag.active_flag || "Unknown"}
                </div>
              </div>
            ))}
            {filteredAgenciesForOffice.length === 0 && (
              <div style={{ fontSize: 12, color: "#6b7280" }}>No agencies tied to this office yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrmOfficeDetailPage;

