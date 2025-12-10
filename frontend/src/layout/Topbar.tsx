import React from "react";
import { NavLink, useLocation } from "react-router-dom";

const topbarStyles: React.CSSProperties = {
  height: "56px",
  background: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 20px",
  borderBottom: "1px solid #e2e8f0",
  boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
};

const titleStyles: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 700,
  color: "#0f2742",
};

const tabBaseStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: 13,
  cursor: "pointer",
  border: "1px solid transparent",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

function Topbar() {
  const location = useLocation();
  const isCrm = location.pathname.startsWith("/crm");

  return (
    <header style={topbarStyles}>
      <div style={titleStyles}>{isCrm ? "CRM" : "Underwriting Workbench"}</div>
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { to: "/dashboard", label: "Dashboard" },
          { to: "/crm", label: "CRM" },
          { to: "/workbench", label: "Workbench" },
          { to: "/admin", label: "Admin" },
        ].map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => ({
              ...tabBaseStyle,
              borderColor: isActive ? "#2563eb" : "transparent",
              backgroundColor: isActive ? "#eff6ff" : "transparent",
              color: isActive ? "#1d4ed8" : "#374151",
            })}
            end={link.to === "/dashboard"}
          >
            {link.label}
          </NavLink>
        ))}
      </div>
    </header>
  );
}

export default Topbar;
