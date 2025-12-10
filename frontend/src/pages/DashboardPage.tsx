import React from "react";
import { WorkbenchLayout } from "../components/WorkbenchLayout";
import { cardStyle, sidebarHeadingStyle } from "../ui/designSystem";

export const DashboardPage: React.FC = () => {
  const sidebar = (
    <>
      <h2 style={sidebarHeadingStyle}>
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
          ...cardStyle,
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
