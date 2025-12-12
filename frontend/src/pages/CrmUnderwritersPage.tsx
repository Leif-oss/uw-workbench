import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api/client";
import { TabbedProductionGraph } from "../components/TabbedProductionGraph";
import { cardStyle } from "../ui/designSystem";

type Employee = {
  id: number;
  name: string;
  office_id: number | null;
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

  // Group employees by office
  const employeesByOffice = useMemo(() => {
    const grouped = new Map<number, Employee[]>();
    employees.forEach(emp => {
      const officeId = emp.office_id || 0;
      if (!grouped.has(officeId)) {
        grouped.set(officeId, []);
      }
      grouped.get(officeId)!.push(emp);
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
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                  {selectedUnderwriter.name}
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
