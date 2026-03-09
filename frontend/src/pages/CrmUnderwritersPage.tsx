import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api/client";
import { TabbedProductionGraph } from "../components/TabbedProductionGraph";
import { cardStyle } from "../ui/designSystem";

type Employee = {
  id: number;
  name: string;
  office_id?: number | null; // Deprecated: kept for backward compatibility
  office_ids?: number[]; // List of office IDs (many-to-many relationship)
};

type Office = {
  id: number;
  code: string;
  name: string;
};

type Agency = {
  id: number;
  name: string;
  code?: string;
  primary_underwriter_id?: number | null;
};

type ProductionRecord = {
  id: number;
  office: string;
  agency_code: string;
  agency_name: string;
  month: string;
  all_ytd_wp: number | null;
  all_ytd_nb: number | null;
  pytd_wp: number | null;
  pytd_nb: number | null;
  standard_lines_ytd_wp: number | null;
  standard_lines_pytd_wp: number | null;
  surplus_lines_ytd_wp: number | null;
  surplus_lines_pytd_wp: number | null;
  twelve_mo_bound?: number | null;
  twelve_mo_quoted?: number | null;
  twelve_mo_decline?: number | null;
  three_year_plus?: number | null;
};

const CrmUnderwritersPage: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [productionData, setProductionData] = useState<ProductionRecord[]>([]);
  const [selectedUnderwriterId, setSelectedUnderwriterId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [employeesResp, officesResp, agenciesResp, productionResp] = await Promise.all([
          apiGet<Employee[]>("/employees"),
          apiGet<Office[]>("/offices"),
          apiGet<Agency[]>("/agencies"),
          apiGet<ProductionRecord[]>("/production"),
        ]);
        setEmployees(employeesResp || []);
        setOffices(officesResp || []);
        setAgencies(agenciesResp || []);
        setProductionData(productionResp || []);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const selectedUnderwriter = useMemo(() => {
    if (!selectedUnderwriterId) return null;
    return employees.find(e => e.id === selectedUnderwriterId) || null;
  }, [employees, selectedUnderwriterId]);

  // Get agencies for selected underwriter
  const underwriterAgencies = useMemo(() => {
    if (!selectedUnderwriterId) return [];
    return agencies.filter(a => a.primary_underwriter_id === selectedUnderwriterId);
  }, [agencies, selectedUnderwriterId]);

  // Get production data for selected underwriter's agencies
  const underwriterProductionData = useMemo(() => {
    if (!selectedUnderwriterId || underwriterAgencies.length === 0) return [];
    const agencyCodes = new Set(underwriterAgencies.map(a => a.code?.toUpperCase()).filter(Boolean));
    return productionData.filter(p => agencyCodes.has(p.agency_code.toUpperCase()));
  }, [productionData, underwriterAgencies, selectedUnderwriterId]);

  // Group employees by office (handling many-to-many relationship)
  const employeesByOffice = useMemo(() => {
    const grouped = new Map<number, Employee[]>();
    employees.forEach(emp => {
      // Get all office IDs for this employee (many-to-many relationship)
      const employeeOfficeIds = emp.office_ids || (emp.office_id ? [emp.office_id] : [0]);
      
      // Add employee to each office they're assigned to
      employeeOfficeIds.forEach((officeId) => {
        const key = officeId || 0;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        // Avoid duplicates - check if employee is already in this office group
        const officeGroup = grouped.get(key)!;
        if (!officeGroup.find(e => e.id === emp.id)) {
          officeGroup.push(emp);
        }
      });
    });
    return grouped;
  }, [employees]);

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Underwriters</h2>
      
      {isLoading ? (
        <div style={{ fontSize: 13, color: "#6b7280" }}>Loading underwriter data...</div>
      ) : (
        <>
          {/* Underwriter Selection */}
          <div style={{ ...cardStyle, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Select Underwriter</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {Array.from(employeesByOffice.entries()).map(([officeId, officeEmployees]) => {
                const office = offices.find(o => o.id === officeId);
                return (
                  <div key={officeId} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 8, textTransform: "uppercase" }}>
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
                            fontWeight: "inherit",
                            textTransform: "inherit",
                          }}
                        >
                          {`${office.code} - ${office.name}`}
                        </button>
                      ) : (
                        "Unassigned"
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {officeEmployees.map(emp => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => setSelectedUnderwriterId(emp.id)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 6,
                            border: selectedUnderwriterId === emp.id ? "2px solid #2563eb" : "1px solid #d1d5db",
                            background: selectedUnderwriterId === emp.id ? "#eff6ff" : "#f9fafb",
                            color: selectedUnderwriterId === emp.id ? "#1d4ed8" : "#111827",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: selectedUnderwriterId === emp.id ? 600 : 500,
                            textAlign: "left",
                          }}
                        >
                          {emp.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Underwriter Details */}
          {selectedUnderwriter && (
            <>
              <div style={{ ...cardStyle, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#0f2742" }}>
                    {selectedUnderwriter.name}
                  </div>
                  {(() => {
                    // Always show metrics section when underwriter is selected
                    let totalBound = 0;
                    let totalQuoted = 0;
                    let totalDeclined = 0;
                    let avgLossRatio = 0;
                    let hitRatio = 0;
                    
                    if (underwriterProductionData.length > 0) {
                      const mostRecentMonth = underwriterProductionData.map(r => r.month).sort().pop();
                      if (mostRecentMonth) {
                        const recentRecords = underwriterProductionData.filter(r => r.month === mostRecentMonth);
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
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
                  {underwriterAgencies.length} {underwriterAgencies.length === 1 ? "Agency" : "Agencies"}
                </div>
                {underwriterAgencies.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {underwriterAgencies.map(agency => (
                      <button
                        key={agency.id}
                        type="button"
                        onClick={() => navigate(`/crm/agencies/${agency.id}`)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: "1px solid #d1d5db",
                          background: "#f9fafb",
                          color: "#2563eb",
                          cursor: "pointer",
                          fontSize: 12,
                          textAlign: "left",
                          textDecoration: "underline",
                        }}
                      >
                        {agency.name}{agency.code ? ` (${agency.code})` : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Underwriter Production Graph */}
              {underwriterProductionData.length > 0 && (
                <TabbedProductionGraph
                  productionData={underwriterProductionData}
                  title={`Written Premium Trend - ${selectedUnderwriter.name}`}
                  height={280}
                />
              )}
            </>
          )}

          {!selectedUnderwriterId && (
            <div style={{ ...cardStyle, padding: 20, textAlign: "center", color: "#6b7280" }}>
              Select an underwriter to view their production data
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CrmUnderwritersPage;
