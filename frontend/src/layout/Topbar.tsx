import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { getAuthHeaders } from "../api/client";

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
  const navigate = useNavigate();
  const isCrm = location.pathname.startsWith("/crm");
  const username = localStorage.getItem("username") || "User";
  const employeeId = localStorage.getItem("employee_id");
  const isAdmin = localStorage.getItem("is_admin") === "true";
  const showAdminLink = isAdmin;
  
  // Create link to employee page if employee_id is available
  const employeeLink = employeeId 
    ? `/crm/employees?employeeId=${employeeId}&employeeName=${encodeURIComponent(username)}`
    : null;

  const handleLogout = async () => {
    try {
      // Try to call logout endpoint, but don't wait for it
      fetch(`${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}/auth/logout`, {
        method: "POST",
        headers: getAuthHeaders(),
      }).catch(() => {
        // Ignore errors
      });
    } catch (err) {
      // Ignore logout errors
    }
    localStorage.removeItem("auth_token");
    localStorage.removeItem("username");
    localStorage.removeItem("employee_id");
    localStorage.removeItem("is_admin");
    navigate("/login");
  };

  return (
    <header style={topbarStyles}>
      <div style={titleStyles}>{isCrm ? "Agency Management" : "Underwriting Workbench"}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {[
          { to: "/dashboard", label: "Dashboard" },
          { to: "/crm", label: "Agency Management" },
          { to: "/workbench", label: "Workbench" },
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
        
        {/* Admin button - show for admins or during setup */}
        {showAdminLink && (
          <NavLink
            to="/admin"
            style={({ isActive }) => ({
              ...tabBaseStyle,
              marginLeft: 16,
              borderColor: "#dc2626",
              backgroundColor: isActive ? "#dc2626" : "transparent",
              color: isActive ? "#fff" : "#dc2626",
              fontWeight: 600,
            })}
          >
            Admin
          </NavLink>
        )}
        
        {/* User info and logout */}
        <div style={{ marginLeft: 16, display: "flex", alignItems: "center", gap: 8 }}>
          {employeeLink ? (
            <NavLink
              to={employeeLink}
              style={{
                ...tabBaseStyle,
                fontSize: 13,
                borderColor: "#d1d5db",
                backgroundColor: "#ffffff",
                color: "#374151",
                fontWeight: 500,
                padding: "6px 14px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f3f4f6";
                e.currentTarget.style.borderColor = "#9ca3af";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#ffffff";
                e.currentTarget.style.borderColor = "#d1d5db";
              }}
            >
              {username}
            </NavLink>
          ) : (
            <button
              disabled
              style={{
                ...tabBaseStyle,
                fontSize: 13,
                borderColor: "#d1d5db",
                backgroundColor: "#ffffff",
                color: "#6b7280",
                fontWeight: 500,
                padding: "6px 14px",
                cursor: "default",
              }}
            >
              {username}
            </button>
          )}
          <button
            onClick={handleLogout}
            style={{
              ...tabBaseStyle,
              borderColor: "#e5e7eb",
              backgroundColor: "transparent",
              color: "#6b7280",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
