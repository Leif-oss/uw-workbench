import React from "react";
import { WorkbenchLayout } from "../components/WorkbenchLayout";
import { cardStyle, sidebarHeadingStyle } from "../ui/designSystem";

export const AdminPage: React.FC = () => {
  const sidebar = (
    <>
      <h2 style={sidebarHeadingStyle}>
        Admin Tools
      </h2>
      <div style={{ fontSize: 11, color: "#6b7280" }}>
        Configuration, user roles, and mappings will live here.
      </div>
    </>
  );

  return (
    <WorkbenchLayout
      title="Underwriting Workbench – Admin"
      subtitle="Configuration and admin tools (coming soon)"
      rightNote="Admin · stub version"
      sidebar={sidebar}
    >
      <div
        style={{
          ...cardStyle,
          fontSize: 13,
          color: "#374151",
        }}
      >
        Admin content (user setup, office mappings, etc.) will be added here.
      </div>
    </WorkbenchLayout>
  );
};

export default AdminPage;
