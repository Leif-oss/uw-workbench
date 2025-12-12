import React, { useEffect, useState } from "react";
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
  const [productionData, setProductionData] = useState<ProductionRecord[]>([]);
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
        setProductionData(data);
        
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

          {/* Tabbed Production Graph */}
          <TabbedProductionGraph
            productionData={productionData}
            title="Written Premium Trend - Company Wide"
            height={320}
          />

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
