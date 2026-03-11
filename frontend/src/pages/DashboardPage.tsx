import React, { useEffect, useState, useMemo } from "react";
import { WorkbenchLayout } from "../components/WorkbenchLayout";
import { TabbedProductionGraph } from "../components/TabbedProductionGraph";
import { cardStyle, sidebarHeadingStyle } from "../ui/designSystem";
import { apiGet } from "../api/client";

interface ProductionRecord {
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
  standard_lines_ytd_wp: number | null;
  standard_lines_pytd_wp: number | null;
  surplus_lines_ytd_wp: number | null;
  surplus_lines_pytd_wp: number | null;
  twelve_mo_bound: number | null;
  twelve_mo_quoted: number | null;
  twelve_mo_decline: number | null;
  three_year_plus: number | null;
}

interface MonthlyData {
  month: string;
  currentYear: number;
  priorYear: number;
}

interface ProductionMetrics {
  currentYearTotal: number;
  priorYearTotal: number;
  newBusinessCount: number;
  percentChange: number;
  monthlyData: MonthlyData[];
}

interface Office {
  id: number;
  code: string;
  name: string;
}

interface OfficeMetrics {
  officeCode: string;
  officeName: string;
  currentYearTotal: number;
  priorYearTotal: number;
  percentChange: number;
  agencyCount: number;
  newBusinessCount: number;
  totalBound: number;
  totalQuoted: number;
  totalDeclined: number;
  avgLossRatio: number;
}

export const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [productionData, setProductionData] = useState<ProductionRecord[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [metrics, setMetrics] = useState<ProductionMetrics>({
    currentYearTotal: 0,
    priorYearTotal: 0,
    newBusinessCount: 0,
    percentChange: 0,
    monthlyData: [],
  });

  useEffect(() => {
    const fetchProductionData = async () => {
      try {
        const [data, officesData] = await Promise.all([
          apiGet<ProductionRecord[]>("/production"),
          apiGet<Office[]>("/offices"),
        ]);
        setProductionData(data);
        setOffices(officesData || []);
        
        // Group by month and calculate totals for each month
        const monthlyTotals = new Map<string, { currentYear: number; priorYear: number }>();
        
        data.forEach((record) => {
          if (!monthlyTotals.has(record.month)) {
            monthlyTotals.set(record.month, { currentYear: 0, priorYear: 0 });
          }
          const totals = monthlyTotals.get(record.month)!;
          totals.currentYear += record.all_ytd_nb || 0;
          totals.priorYear += record.pytd_nb || 0;
        });

        // Convert to sorted array
        const monthlyData: MonthlyData[] = Array.from(monthlyTotals.entries())
          .map(([month, totals]) => ({
            month,
            currentYear: totals.currentYear,
            priorYear: totals.priorYear,
          }))
          .sort((a, b) => a.month.localeCompare(b.month));

        // Get the most recent month data for summary metrics
        const latestByAgency = new Map<string, ProductionRecord>();
        data.forEach((record) => {
          const existing = latestByAgency.get(record.agency_code);
          if (!existing || record.month > existing.month) {
            latestByAgency.set(record.agency_code, record);
          }
        });

        // Calculate totals
        let currentYearTotal = 0;
        let priorYearTotal = 0;
        let newBusinessCount = 0;

        latestByAgency.forEach((record) => {
          currentYearTotal += record.all_ytd_nb || 0;
          priorYearTotal += record.pytd_nb || 0;
          if (record.all_ytd_nb && record.all_ytd_nb > 0) {
            newBusinessCount++;
          }
        });

        const percentChange = priorYearTotal > 0 
          ? ((currentYearTotal - priorYearTotal) / priorYearTotal) * 100 
          : 0;

        setMetrics({
          currentYearTotal,
          priorYearTotal,
          newBusinessCount,
          percentChange,
          monthlyData,
        });
      } catch (err) {
        console.error("Failed to fetch production data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProductionData();
  }, []);

  // Calculate office-level metrics
  const officeMetrics = useMemo(() => {
    if (!productionData.length || !offices.length) return [];

    const officeMap = new Map<string, OfficeMetrics>();
    
    // Initialize office metrics
    offices.forEach(office => {
      officeMap.set(office.code, {
        officeCode: office.code,
        officeName: office.name,
        currentYearTotal: 0,
        priorYearTotal: 0,
        percentChange: 0,
        agencyCount: 0,
        newBusinessCount: 0,
        totalBound: 0,
        totalQuoted: 0,
        totalDeclined: 0,
        avgLossRatio: 0,
      });
    });

    // Get most recent month
    const mostRecentMonth = productionData.length > 0
      ? productionData.map(r => r.month).sort().pop()
      : null;

    // Get latest record per agency
    const latestByAgency = new Map<string, ProductionRecord>();
    productionData.forEach((record) => {
      const key = `${record.office}_${record.agency_code}`;
      const existing = latestByAgency.get(key);
      if (!existing || record.month > existing.month) {
        latestByAgency.set(key, record);
      }
    });

    // Aggregate by office
    latestByAgency.forEach((record) => {
      const office = officeMap.get(record.office);
      if (office) {
        office.currentYearTotal += record.all_ytd_nb || 0;
        office.priorYearTotal += record.pytd_nb || 0;
        office.agencyCount++;
        if (record.all_ytd_nb && record.all_ytd_nb > 0) {
          office.newBusinessCount++;
        }
      }
    });

    // Get most recent month metrics
    if (mostRecentMonth) {
      const recentRecords = productionData.filter(r => r.month === mostRecentMonth);
      recentRecords.forEach((record) => {
        const office = officeMap.get(record.office);
        if (office) {
          office.totalBound += record.twelve_mo_bound || 0;
          office.totalQuoted += record.twelve_mo_quoted || 0;
          office.totalDeclined += record.twelve_mo_decline || 0;
        }
      });

      // Calculate average loss ratio per office
      officeMap.forEach((office) => {
        const officeRecentRecords = recentRecords.filter(r => r.office === office.officeCode);
        const recordsWithLossRatio = officeRecentRecords.filter(r => r.three_year_plus != null && r.three_year_plus > 0);
        if (recordsWithLossRatio.length > 0) {
          office.avgLossRatio = recordsWithLossRatio.reduce((sum, r) => sum + (r.three_year_plus || 0), 0) / recordsWithLossRatio.length;
        }
      });
    }

    // Calculate percent change
    officeMap.forEach((office) => {
      office.percentChange = office.priorYearTotal > 0
        ? ((office.currentYearTotal - office.priorYearTotal) / office.priorYearTotal) * 100
        : 0;
    });

    return Array.from(officeMap.values()).sort((a, b) => a.officeCode.localeCompare(b.officeCode));
  }, [productionData, offices]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const sidebar = (
    <>
      <h2 style={sidebarHeadingStyle}>
        Company Overview
      </h2>
      <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.5 }}>
        Company-wide production metrics showing year-to-date new business compared to prior year.
      </div>
    </>
  );

  return (
    <WorkbenchLayout
      title="Underwriting Workbench – Dashboard"
      subtitle="Company-wide production and new business metrics"
      rightNote=""
      sidebar={sidebar}
    >
      {loading ? (
        <div style={{ ...cardStyle, fontSize: 13, color: "#6b7280" }}>
          Loading production data...
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Tabbed Production Graph */}
          <TabbedProductionGraph
            productionData={productionData}
            title="Written Premium Trend - Company Wide"
            height={320}
          />

          {/* Total Company Metrics */}
          <div style={{ ...cardStyle, padding: 20 }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600, color: "#111827" }}>
              Company Totals (All Offices)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Current YTD New Business
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#1e40af" }}>
                  {formatCurrency(metrics.currentYearTotal)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Prior YTD New Business
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#6b7280" }}>
                  {formatCurrency(metrics.priorYearTotal)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Dollar Change
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: metrics.currentYearTotal >= metrics.priorYearTotal ? "#059669" : "#dc2626" }}>
                  {metrics.currentYearTotal >= metrics.priorYearTotal ? "+" : ""}
                  {formatCurrency(metrics.currentYearTotal - metrics.priorYearTotal)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  % Change
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: metrics.percentChange >= 0 ? "#059669" : "#dc2626" }}>
                  {metrics.percentChange >= 0 ? "+" : ""}
                  {metrics.percentChange.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Office Status Breakdown */}
          {officeMetrics.length > 0 && (
            <div style={{ ...cardStyle, padding: 20 }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600, color: "#111827" }}>
                Office Status & Metrics
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
                {officeMetrics.map((office) => (
                  <div
                    key={office.officeCode}
                    style={{
                      padding: 16,
                      background: "#f9fafb",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                          {office.officeName}
                        </div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>
                          {office.officeCode}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: office.percentChange >= 0 ? "#059669" : "#dc2626",
                        padding: "4px 8px",
                        background: office.percentChange >= 0 ? "#d1fae5" : "#fee2e2",
                        borderRadius: 4,
                      }}>
                        {office.percentChange >= 0 ? "+" : ""}
                        {office.percentChange.toFixed(1)}%
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
                      <div>
                        <div style={{ color: "#6b7280", marginBottom: 2 }}>YTD New Business</div>
                        <div style={{ fontWeight: 600, color: "#111827" }}>
                          {formatCurrency(office.currentYearTotal)}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: "#6b7280", marginBottom: 2 }}>Agencies</div>
                        <div style={{ fontWeight: 600, color: "#111827" }}>
                          {office.agencyCount}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: "#6b7280", marginBottom: 2 }}>With New Business</div>
                        <div style={{ fontWeight: 600, color: "#111827" }}>
                          {office.newBusinessCount}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: "#6b7280", marginBottom: 2 }}>12 Mo Bound</div>
                        <div style={{ fontWeight: 600, color: "#059669" }}>
                          {office.totalBound.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: "#6b7280", marginBottom: 2 }}>12 Mo Quoted</div>
                        <div style={{ fontWeight: 600, color: "#3b82f6" }}>
                          {office.totalQuoted.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: "#6b7280", marginBottom: 2 }}>12 Mo Declined</div>
                        <div style={{ fontWeight: 600, color: "#dc2626" }}>
                          {office.totalDeclined.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Underwriting Metrics */}
          {(() => {
            // Get most recent month's data for these metrics
            const mostRecentMonth = productionData.length > 0
              ? productionData.map(r => r.month).sort().pop()
              : null;
            if (!mostRecentMonth) return null;
            
            const recentRecords = productionData.filter(r => r.month === mostRecentMonth);
            const totalBound = recentRecords.reduce((sum, r) => sum + (r.twelve_mo_bound || 0), 0);
            const totalQuoted = recentRecords.reduce((sum, r) => sum + (r.twelve_mo_quoted || 0), 0);
            const totalDeclined = recentRecords.reduce((sum, r) => sum + (r.twelve_mo_decline || 0), 0);
            const recordsWithLossRatio = recentRecords.filter(r => r.three_year_plus != null && r.three_year_plus > 0);
            const avgLossRatio = recordsWithLossRatio.length > 0
              ? recordsWithLossRatio.reduce((sum, r) => sum + (r.three_year_plus || 0), 0) / recordsWithLossRatio.length
              : 0;
            
            if (totalBound === 0 && totalQuoted === 0 && totalDeclined === 0 && avgLossRatio === 0) {
              return null; // Don't show if no data
            }
            
            return (
              <div style={{ ...cardStyle, padding: 20 }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 600, color: "#111827" }}>
                  Underwriting Metrics (12 Month - Most Recent Month)
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Bound
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#059669" }}>
                      {totalBound.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Quoted
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#3b82f6" }}>
                      {totalQuoted.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Declined
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#dc2626" }}>
                      {totalDeclined.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      3 Year Loss Ratio
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: avgLossRatio > 60 ? "#dc2626" : avgLossRatio > 50 ? "#f59e0b" : "#059669" }}>
                      {avgLossRatio > 0 ? `${avgLossRatio.toFixed(1)}%` : "—"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </WorkbenchLayout>
  );
};

export default DashboardPage;
