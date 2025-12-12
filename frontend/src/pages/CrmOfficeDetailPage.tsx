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
  office_id: number | null;
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
  inPerson30: number;
  comm30: number;
  inPersonYtd: number;
  commYtd: number;
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
    () => employees.filter((e) => e.office_id === officeIdNum),
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

  const employeeMetrics: EmployeeMetrics[] = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const ytdStart = new Date(now.getFullYear(), 0, 1);

    const byName = new Map<string, EmployeeMetrics>();
    officeEmployees.forEach((emp) => {
      const name = (emp.name || "").trim();
      byName.set(name.toLowerCase(), {
        id: emp.id,
        name,
        inPerson30: 0,
        comm30: 0,
        inPersonYtd: 0,
        commYtd: 0,
      });
    });

    logsForOffice.forEach((log) => {
      const user = (log.user || "").trim().toLowerCase();
      if (!byName.has(user)) return;
      const entry = byName.get(user)!;
      const dt = new Date(log.datetime);
      if (Number.isNaN(dt.getTime())) return;
      const action = (log.action || "").toLowerCase();
      const isInPerson = action.includes("in person");
      const isComm = action.includes("phone") || action.includes("call") || action.includes("email") || action.includes("zoom");

      if (dt >= ytdStart) {
        if (isInPerson) entry.inPersonYtd += 1;
        if (isComm) entry.commYtd += 1;
      }
      if (dt >= thirtyDaysAgo) {
        if (isInPerson) entry.inPerson30 += 1;
        if (isComm) entry.comm30 += 1;
      }
    });

    return Array.from(byName.values());
  }, [logsForOffice, officeEmployees]);

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
      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
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
        <div style={{ fontSize: 18, fontWeight: 700, color: "#0f2742", flex: 1, marginLeft: 8 }}>{officeTitle}</div>
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
            gridTemplateColumns: "1.2fr repeat(4, 1fr)",
            gap: 8,
            fontSize: 11,
            color: "#6b7280",
            marginBottom: 6,
          }}>
            <div>Name</div>
            <div style={{ textAlign: "right" }}>In person 30d</div>
            <div style={{ textAlign: "right" }}>Emails + Calls 30d</div>
            <div style={{ textAlign: "right" }}>In person YTD</div>
            <div style={{ textAlign: "right" }}>Emails + Calls YTD</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {employeeMetrics.map((emp) => (
              <div
                key={emp.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr repeat(4, 1fr)",
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
                <div style={{ textAlign: "right" }}>{emp.inPerson30}</div>
                <div style={{ textAlign: "right" }}>{emp.comm30}</div>
                <div style={{ textAlign: "right" }}>{emp.inPersonYtd}</div>
                <div style={{ textAlign: "right" }}>{emp.commYtd}</div>
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

