import React from "react";
import { WorkbenchLayout } from "../components/WorkbenchLayout";

export const AdminPage: React.FC = () => {
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
          background: "#ffffff",
          borderRadius: 12,
          padding: "12px 14px",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
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
