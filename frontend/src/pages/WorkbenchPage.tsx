import React from "react";
import { WorkbenchLayout } from "../components/WorkbenchLayout";
import { WorkflowTool } from "../components/WorkflowTool";
import { sidebarHeadingStyle } from "../ui/designSystem";

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
      subtitle="Central hub for tasks, renewals, and follow-ups"
      rightNote="Workbench"
      sidebar={sidebar}
    >
      <WorkflowTool />
    </WorkbenchLayout>
  );
};

export default WorkbenchPage;
