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
}

type TabType = "all" | "standard" | "surplus";

export const TabbedProductionGraph: React.FC<TabbedProductionGraphProps> = ({
  productionData,
  title = "Written Premium Trend",
  height = 320,
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

    // Calculate totals
    const currentYearTotal = monthlyData.reduce((sum, d) => sum + d.currentYear, 0);
    const priorYearTotal = monthlyData.reduce((sum, d) => sum + d.priorYear, 0);
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#111827" }}>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Summary Stats */}
          <div style={{ display: "flex", gap: 16, justifyContent: "center", fontSize: 12 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#6b7280", marginBottom: 2 }}>Current YTD</div>
              <div style={{ fontWeight: 600, color: "#1d4ed8" }}>
                {formatCurrency(graphData.currentYearTotal)}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#6b7280", marginBottom: 2 }}>Prior YTD</div>
              <div style={{ fontWeight: 600, color: "#6b7280" }}>
                {formatCurrency(graphData.priorYearTotal)}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#6b7280", marginBottom: 2 }}>Change</div>
              <div style={{ 
                fontWeight: 600, 
                color: graphData.percentChange >= 0 ? "#059669" : "#dc2626" 
              }}>
                {graphData.percentChange >= 0 ? "+" : ""}{graphData.percentChange.toFixed(1)}%
              </div>
            </div>
          </div>

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
          <div style={{ position: "relative", height, padding: "20px 40px 40px 60px" }}>
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
                  <text
                    x="-10"
                    y={280 - (percent * 2.8) + 4}
                    fontSize="10"
                    fill="#9ca3af"
                    textAnchor="end"
                    vectorEffect="non-scaling-stroke"
                  >
                    {percent}%
                  </text>
                </g>
              ))}

              {(() => {
                const maxValue = Math.max(
                  ...graphData.monthlyData.flatMap(d => [d.currentYear, d.priorYear]),
                  1
                );
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

