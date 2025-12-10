import type React from "react";

export const appBackground = "#f3f4f6";

export const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 12,
  padding: "12px 14px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};

export const panelStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 12,
  padding: "10px 12px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  display: "flex",
  flexDirection: "column",
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 9px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 13,
  backgroundColor: "#f9fafb",
  boxSizing: "border-box",
};

export const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: 4,
};

export const primaryButtonStyle: React.CSSProperties = {
  borderRadius: 999,
  border: "1px solid #1d4ed8",
  padding: "6px 12px",
  fontSize: 12,
  background: "#2563eb",
  color: "#f9fafb",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

export const secondaryButtonStyle: React.CSSProperties = {
  borderRadius: 999,
  border: "1px solid #d1d5db",
  padding: "6px 12px",
  fontSize: 12,
  background: "#f9fafb",
  color: "#111827",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

export const tableContainerStyle: React.CSSProperties = {
  flex: 1,
  overflow: "auto",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
};

export const tableBaseStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12,
};

export const tableHeaderCellStyle: React.CSSProperties = {
  padding: "6px 8px",
  textAlign: "left",
  borderBottom: "1px solid #f1f5f9",
  whiteSpace: "nowrap",
  fontWeight: 500,
  color: "#6b7280",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

export const tableCellStyle: React.CSSProperties = {
  padding: "6px 8px",
  textAlign: "left",
  borderBottom: "1px solid #f1f5f9",
  whiteSpace: "nowrap",
};

export const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

export const tableHeaderStickyStyle: React.CSSProperties = {
  ...tableHeaderCellStyle,
  background: "#f9fafb",
  position: "sticky",
  top: 0,
  zIndex: 1,
};

export const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#111827",
  marginBottom: 4,
};

export const sectionSubheadingStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#9ca3af",
  marginBottom: 8,
};

export const sidebarHeadingStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  color: "#111827",
  marginBottom: 8,
};

export const kpiLabelStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  color: "#6b7280",
  letterSpacing: "0.05em",
  marginBottom: 6,
};

export const kpiValueStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: "#111827",
};

export const kpiSubtextStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#6b7280",
  marginTop: 2,
};
