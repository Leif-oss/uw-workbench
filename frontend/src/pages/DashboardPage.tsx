import React from "react";
import { WorkbenchLayout } from "../components/WorkbenchLayout";

export const DashboardPage: React.FC = () => {
  const sidebar = (
    <>
      <h2
        style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 600,
          color: "#111827",
          marginBottom: 8,
        }}
      >
        Dashboard Filters
      </h2>
      <div style={{ fontSize: 11, color: "#6b7280" }}>
        High-level metrics and widgets will live here.
      </div>
    </>
  );

  return (
    <WorkbenchLayout
      title="Underwriting Workbench – Dashboard"
      subtitle="High-level view of offices, agencies, and activity (coming soon)"
      rightNote="Dashboard · stub version"
      sidebar={sidebar}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 12,
          padding: "12px 14px",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
          fontSize: 13,
          color: "#374151",
        }}
      >
        Dashboard content will go here (production, calls, tasks, etc.).
      </div>
    </WorkbenchLayout>
  );
};

export default DashboardPage;
