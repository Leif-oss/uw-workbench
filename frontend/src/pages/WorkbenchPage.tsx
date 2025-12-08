import React from "react";
import { WorkbenchLayout } from "../components/WorkbenchLayout";

export const WorkbenchPage: React.FC = () => {
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
        Workbench Filters
      </h2>
      <div style={{ fontSize: 11, color: "#6b7280" }}>
        Centralized worklist and tasks will live here.
      </div>
    </>
  );

  return (
    <WorkbenchLayout
      title="Underwriting Workbench – Workbench"
      subtitle="Central hub for tasks, renewals, and follow-ups (coming soon)"
      rightNote="Workbench · stub version"
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
        Workbench content (tasks, queues, workflows) will be built here.
      </div>
    </WorkbenchLayout>
  );
};

export default WorkbenchPage;
