import React from "react";
import { WorkbenchLayout } from "../components/WorkbenchLayout";
import { cardStyle, sidebarHeadingStyle } from "../ui/designSystem";

export const WorkbenchPage: React.FC = () => {
  const sidebar = (
    <>
      <h2 style={sidebarHeadingStyle}>
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
          ...cardStyle,
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
