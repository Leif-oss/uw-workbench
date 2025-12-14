import React, { useMemo, useState } from "react";
import { cardStyle } from "../ui/designSystem";

interface ProductionRecord {
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
}

interface TabbedProductionGraphProps {
  productionData: ProductionRecord[];
  title?: string;
  height?: number;
  showMetrics?: boolean;
  metricsData?: {
    bound: number;
    quoted: number;
    declined: number;
    lossRatio: number;
  };
}

type TabType = "all" | "standard" | "surplus";

export const TabbedProductionGraph: React.FC<TabbedProductionGraphProps> = ({
  productionData,
  title = "Written Premium Trend",
  height = 320,
  showMetrics = false,
  metricsData,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("all");

  // Process data for the active tab
  const graphData = useMemo(() => {
    // Group by month and aggregate based on active tab
    const monthlyTotals = new Map<string, { currentYear: number; priorYear: number }>();

    productionData.forEach((record) => {
      if (!monthlyTotals.has(record.month)) {
        monthlyTotals.set(record.month, { currentYear: 0, priorYear: 0 });
      }
      const totals = monthlyTotals.get(record.month)!;

      switch (activeTab) {
        case "all":
          totals.currentYear += record.all_ytd_wp || 0;
          totals.priorYear += record.pytd_wp || 0;
          break;
        case "standard":
          totals.currentYear += record.standard_lines_ytd_wp || 0;
          totals.priorYear += record.standard_lines_pytd_wp || 0;
          break;
        case "surplus":
          totals.currentYear += record.surplus_lines_ytd_wp || 0;
          totals.priorYear += record.surplus_lines_pytd_wp || 0;
          break;
      }
    });

    // Convert to sorted array
    const monthlyData = Array.from(monthlyTotals.entries())
      .map(([month, totals]) => ({
        month,
        currentYear: totals.currentYear,
        priorYear: totals.priorYear,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // YTD values are cumulative per month, so we should use the MOST RECENT month's YTD value
    // NOT the sum of all months (which would be incorrect)
    const mostRecentMonth = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1] : null;
    const currentYearTotal = mostRecentMonth ? mostRecentMonth.currentYear : 0;
    const priorYearTotal = mostRecentMonth ? mostRecentMonth.priorYear : 0;
    const percentChange = priorYearTotal > 0 
      ? ((currentYearTotal - priorYearTotal) / priorYearTotal) * 100 
      : 0;

    return {
      monthlyData,
      currentYearTotal,
      priorYearTotal,
      percentChange,
    };
  }, [productionData, activeTab]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatMonth = (monthStr: string) => {
    try {
      const [year, month] = monthStr.split("-");
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    } catch {
      return monthStr;
    }
  };

  const tabLabels = {
    all: "All Lines",
    standard: "Standard Lines",
    surplus: "Surplus Lines",
  };

  return (
    <div style={{ ...cardStyle, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingRight: 20 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#111827", flex: 1 }}>
          {title}
        </h3>
        
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "#f3f4f6", padding: 4, borderRadius: 8 }}>
          {(["all", "standard", "surplus"] as TabType[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background: activeTab === tab ? "#ffffff" : "transparent",
                color: activeTab === tab ? "#1d4ed8" : "#6b7280",
                boxShadow: activeTab === tab ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.2s",
              }}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>
      </div>

      {graphData.monthlyData.length === 0 ? (
        <div style={{ fontSize: 12, color: "#9ca3af", padding: 40, textAlign: "center", background: "#f9fafb", borderRadius: 8 }}>
          No production data available for {tabLabels[activeTab]}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Metrics row - Current YTD in middle, Bound/Quoted/etc on right */}
          <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 4, paddingRight: 20, position: "relative" }}>
            {/* Summary Stats - Center, above legend - positioned absolutely to align with legend */}
            <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", gap: 20, alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Current YTD</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1d4ed8" }}>
                  {formatCurrency(graphData.currentYearTotal)}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Prior YTD</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#6b7280" }}>
                  {formatCurrency(graphData.priorYearTotal)}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Change</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: graphData.percentChange >= 0 ? "#059669" : "#dc2626" }}>
                  {graphData.percentChange >= 0 ? "+" : ""}{graphData.percentChange.toFixed(1)}%
                </div>
              </div>
            </div>
            
            {/* Underwriting Metrics - Right aligned */}
            {showMetrics && metricsData && (
              <div style={{ display: "flex", gap: 20, alignItems: "center", marginLeft: "auto" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Bound</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#059669" }}>
                    {metricsData.bound > 0 ? metricsData.bound.toLocaleString() : "—"}
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Quoted</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#3b82f6" }}>
                    {metricsData.quoted > 0 ? metricsData.quoted.toLocaleString() : "—"}
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Hit Ratio</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: metricsData.quoted > 0 && (metricsData.bound / metricsData.quoted) * 100 > 30 ? "#059669" : metricsData.quoted > 0 && (metricsData.bound / metricsData.quoted) * 100 > 20 ? "#f59e0b" : metricsData.quoted > 0 ? "#dc2626" : "#6b7280" }}>
                    {metricsData.quoted > 0 ? `${((metricsData.bound / metricsData.quoted) * 100).toFixed(1)}%` : "—"}
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Declined</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#dc2626" }}>
                    {metricsData.declined > 0 ? metricsData.declined.toLocaleString() : "—"}
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>3YR LR</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: metricsData.lossRatio > 60 ? "#dc2626" : metricsData.lossRatio > 50 ? "#f59e0b" : metricsData.lossRatio > 0 ? "#059669" : "#6b7280" }}>
                    {metricsData.lossRatio > 0 ? `${metricsData.lossRatio.toFixed(1)}%` : "—"}
                  </div>
                </div>
              </div>
            )}
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

          {/* Line Graph Container */}
          <div style={{ position: "relative", height, padding: "20px 40px 40px 90px" }}>
            <svg 
              width="100%" 
              height="100%" 
              style={{ overflow: "visible" }}
              viewBox="0 0 800 280"
              preserveAspectRatio="none"
            >
              {(() => {
                const maxValue = Math.max(
                  ...graphData.monthlyData.flatMap(d => [d.currentYear, d.priorYear]),
                  1
                );
                
                // Calculate nice intervals for Y-axis (aim for 6-8 grid lines)
                const getNiceInterval = (max: number, targetLines: number = 7) => {
                  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
                  const normalized = max / magnitude;
                  
                  // Try to get close to targetLines
                  let interval = magnitude;
                  if (normalized > 8) {
                    interval = magnitude * 10;
                  } else if (normalized > 4) {
                    interval = magnitude * 5;
                  } else if (normalized > 2) {
                    interval = magnitude * 2;
                  } else {
                    interval = magnitude;
                  }
                  
                  // If we have too few lines, use smaller intervals
                  const numLines = Math.ceil(maxValue / interval) + 1;
                  if (numLines < targetLines - 1) {
                    // Try smaller intervals
                    if (interval === magnitude * 10) {
                      interval = magnitude * 5;
                    } else if (interval === magnitude * 5) {
                      interval = magnitude * 2;
                    } else if (interval === magnitude * 2) {
                      interval = magnitude;
                    } else {
                      interval = magnitude / 2;
                    }
                  }
                  
                  return interval;
                };
                
                const interval = getNiceInterval(maxValue, 7);
                const numIntervals = Math.ceil(maxValue / interval);
                const gridLines = Array.from({ length: numIntervals + 1 }, (_, i) => i * interval);
                
                const stepX = graphData.monthlyData.length > 1 
                  ? 800 / (graphData.monthlyData.length - 1) 
                  : 400;

                // Prior Year line
                const priorYearPath = graphData.monthlyData
                  .map((data, i) => {
                    const x = i * stepX;
                    const y = 280 - (maxValue > 0 ? (data.priorYear / maxValue) * 280 : 0);
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  })
                  .join(' ');

                // Current Year line
                const currentYearPath = graphData.monthlyData
                  .map((data, i) => {
                    const x = i * stepX;
                    const y = 280 - (maxValue > 0 ? (data.currentYear / maxValue) * 280 : 0);
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  })
                  .join(' ');

                return (
                  <>
                    {/* Grid lines with dollar amounts */}
                    {gridLines.map((value) => {
                      const yPos = 280 - (maxValue > 0 ? (value / maxValue) * 280 : 0);
                      // Format currency with shorter format for large numbers
                      const formatShortCurrency = (val: number) => {
                        if (val >= 1000000) {
                          return `$${(val / 1000000).toFixed(1)}M`;
                        } else if (val >= 1000) {
                          return `$${(val / 1000).toFixed(0)}K`;
                        }
                        return formatCurrency(val);
                      };
                      return (
                        <g key={value}>
                          <line
                            x1="0"
                            y1={yPos}
                            x2="800"
                            y2={yPos}
                            stroke="#e5e7eb"
                            strokeWidth="1"
                            vectorEffect="non-scaling-stroke"
                          />
                          <text
                            x="-15"
                            y={yPos + 4}
                            fontSize="11"
                            fill="#6b7280"
                            textAnchor="end"
                            vectorEffect="non-scaling-stroke"
                            fontWeight="500"
                          >
                            {formatShortCurrency(value)}
                          </text>
                        </g>
                      );
                    })}
                    
                    {/* Prior Year Line */}
                    <path
                      d={priorYearPath}
                      fill="none"
                      stroke="#9ca3af"
                      strokeWidth="2.5"
                      vectorEffect="non-scaling-stroke"
                    />

                    {/* Current Year Line */}
                    <path
                      d={currentYearPath}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2.5"
                      vectorEffect="non-scaling-stroke"
                    />

                    {/* Data points for Prior Year */}
                    {graphData.monthlyData.map((data, i) => {
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
                        >
                          <title>{`${formatMonth(data.month)}: ${formatCurrency(data.priorYear)}`}</title>
                        </circle>
                      );
                    })}

                    {/* Data points for Current Year */}
                    {graphData.monthlyData.map((data, i) => {
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
                        >
                          <title>{`${formatMonth(data.month)}: ${formatCurrency(data.currentYear)}`}</title>
                        </circle>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>

          {/* Month labels */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6b7280", marginTop: -20 }}>
            {graphData.monthlyData.map((data, i) => (
              <span key={i}>{formatMonth(data.month)}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

