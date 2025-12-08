import React, { ReactNode } from "react";

interface WorkbenchLayoutProps {
  title: string;
  subtitle?: string;
  rightNote?: string;
  sidebar: ReactNode;
  children: ReactNode;
}

export const WorkbenchLayout: React.FC<WorkbenchLayoutProps> = ({
  title,
  subtitle,
  rightNote,
  sidebar,
  children,
}) => {
  return (
    <div className="uw-app-root" style={{ minHeight: "100vh", background: "#f3f4f6" }}>
      {/* Top bar - keep simple for now (you can unify with the rest of the app later) */}
      <header
        style={{
          height: 56,
          background: "linear-gradient(90deg, #111827, #1f2933)",
          color: "#f9fafb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          boxShadow: "0 1px 4px rgba(0, 0, 0, 0.25)",
        }}
      >
        <div>
          <div style={{ fontWeight: 600, letterSpacing: "0.02em", fontSize: 16 }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 12, color: "#d1d5db" }}>{subtitle}</div>
          )}
        </div>
        {rightNote && (
          <div style={{ fontSize: 12, color: "#9ca3af" }}>{rightNote}</div>
        )}
      </header>

      <main
        style={{
          display: "flex",
          padding: 16,
          gap: 16,
          minHeight: "calc(100vh - 56px)",
        }}
      >
        <aside
          style={{
            width: 260,
            background: "#ffffff",
            borderRadius: 12,
            padding: 14,
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {sidebar}
        </aside>

        <section style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
          {children}
        </section>
      </main>
    </div>
  );
};
