import React, { useEffect, useState } from "react";
import { WorkbenchLayout } from "../components/WorkbenchLayout";
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

export const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
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
        const data = await apiGet<ProductionRecord[]>("/production");
        
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
          {/* Main Metrics Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {/* Current Year Card */}
            <div
              style={{
                ...cardStyle,
                background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
                color: "#fff",
                padding: "20px",
              }}
            >
              <div style={{ fontSize: 11, opacity: 0.9, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Current Year YTD
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
                {formatCurrency(metrics.currentYearTotal)}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                New Business Premium
              </div>
            </div>

            {/* Prior Year Card */}
            <div
              style={{
                ...cardStyle,
                background: "linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)",
                color: "#fff",
                padding: "20px",
              }}
            >
              <div style={{ fontSize: 11, opacity: 0.9, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Prior Year YTD
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
                {formatCurrency(metrics.priorYearTotal)}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                New Business Premium
              </div>
            </div>

            {/* Year-over-Year Change */}
            <div
              style={{
                ...cardStyle,
                background: metrics.percentChange >= 0 
                  ? "linear-gradient(135deg, #059669 0%, #10b981 100%)" 
                  : "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
                color: "#fff",
                padding: "20px",
              }}
            >
              <div style={{ fontSize: 11, opacity: 0.9, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Year-over-Year Change
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
                {metrics.percentChange >= 0 ? "+" : ""}{metrics.percentChange.toFixed(1)}%
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                {metrics.percentChange >= 0 ? "Growth" : "Decline"} vs Prior Year
              </div>
            </div>
          </div>

          {/* Monthly Line Graph */}
          <div style={{ ...cardStyle, padding: 20 }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600, color: "#111827" }}>
              Monthly New Business Premium - Current Year vs Prior Year
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Legend */}
              <div style={{ display: "flex", gap: 24, justifyContent: "center", fontSize: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 24, height: 3, background: "#3b82f6", borderRadius: 2 }}></div>
                  <span style={{ color: "#374151", fontWeight: 600 }}>Current Year</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 24, height: 3, background: "#9ca3af", borderRadius: 2 }}></div>
                  <span style={{ color: "#374151", fontWeight: 600 }}>Prior Year</span>
                </div>
              </div>

              {/* Line Graph Container */}
              {metrics.monthlyData.length > 0 ? (
                <div style={{ position: "relative", height: 320, padding: "20px 40px 40px 60px" }}>
                  <svg 
                    width="100%" 
                    height="100%" 
                    style={{ overflow: "visible" }}
                    viewBox="0 0 800 280"
                    preserveAspectRatio="none"
                  >
                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map((percent) => (
                      <g key={percent}>
                        <line
                          x1="0"
                          y1={280 - (percent * 2.8)}
                          x2="800"
                          y2={280 - (percent * 2.8)}
                          stroke="#e5e7eb"
                          strokeWidth="1"
                          vectorEffect="non-scaling-stroke"
                        />
                      </g>
                    ))}

                    {(() => {
                      const maxValue = Math.max(
                        ...metrics.monthlyData.flatMap(d => [d.currentYear, d.priorYear])
                      );
                      const stepX = 800 / (metrics.monthlyData.length - 1 || 1);

                      // Create path for Prior Year line
                      const priorYearPath = metrics.monthlyData
                        .map((data, i) => {
                          const x = i * stepX;
                          const y = 280 - (maxValue > 0 ? (data.priorYear / maxValue) * 280 : 0);
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        })
                        .join(' ');

                      // Create path for Current Year line
                      const currentYearPath = metrics.monthlyData
                        .map((data, i) => {
                          const x = i * stepX;
                          const y = 280 - (maxValue > 0 ? (data.currentYear / maxValue) * 280 : 0);
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
                          {metrics.monthlyData.map((data, i) => {
                            const x = i * stepX;
                            const y = 280 - (maxValue > 0 ? (data.priorYear / maxValue) * 280 : 0);
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
                                <title>{`${data.month}: ${formatCurrency(data.priorYear)}`}</title>
                              </circle>
                            );
                          })}

                          {/* Data points for Current Year */}
                          {metrics.monthlyData.map((data, i) => {
                            const x = i * stepX;
                            const y = 280 - (maxValue > 0 ? (data.currentYear / maxValue) * 280 : 0);
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
                                <title>{`${data.month}: ${formatCurrency(data.currentYear)}`}</title>
                              </circle>
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>

                  {/* Y-axis labels */}
                  <div style={{ position: "absolute", left: 0, top: 20, bottom: 40, display: "flex", flexDirection: "column", justifyContent: "space-between", fontSize: 11, color: "#6b7280" }}>
                    {(() => {
                      const maxValue = Math.max(
                        ...metrics.monthlyData.flatMap(d => [d.currentYear, d.priorYear])
                      );
                      return [100, 75, 50, 25, 0].map((percent) => (
                        <div key={percent} style={{ textAlign: "right", width: 50 }}>
                          {formatCurrency((maxValue * percent) / 100)}
                        </div>
                      ));
                    })()}
                  </div>

                  {/* X-axis labels */}
                  <div style={{ position: "absolute", left: 60, right: 40, bottom: 10, display: "flex", justifyContent: "space-between" }}>
                    {metrics.monthlyData.map((data) => {
                      const monthLabel = new Date(data.month + "-01").toLocaleDateString("en-US", { 
                        month: "short", 
                        year: "2-digit" 
                      });
                      return (
                        <div key={data.month} style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>
                          {monthLabel}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Additional Metrics */}
          <div style={{ ...cardStyle, padding: 20 }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 600, color: "#111827" }}>
              New Business Activity
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Agencies with New Business
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#1e40af" }}>
                  {metrics.newBusinessCount}
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
            </div>
          </div>
        </div>
      )}
    </WorkbenchLayout>
  );
};

export default DashboardPage;
