import React from "react";
import { NavLink, useLocation } from "react-router-dom";

const sidebarStyles: React.CSSProperties = {
  width: "175px",
  background: "#0f2742",
  color: "#e5ecf5",
  display: "flex",
  flexDirection: "column",
  padding: "18px 16px",
  gap: "12px",
};

const brandStyles: React.CSSProperties = {
  fontSize: "1.1rem",
  fontWeight: 700,
  marginBottom: "8px",
};

const linkStyles: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "8px",
  color: "#e5ecf5",
  textDecoration: "none",
  fontWeight: 600,
  display: "block",
};

const activeLinkStyles: React.CSSProperties = {
  background: "#1d3b5a",
};

type NavItem = {
  id: string;
  label: string;
  path: string;
};

const crmItems: NavItem[] = [
  { id: "crm-offices", label: "Offices", path: "/crm/offices" },
  { id: "crm-agencies", label: "Agencies", path: "/crm/agencies" },
  { id: "crm-employees", label: "Employees", path: "/crm/employees" },
  { id: "crm-marketing-tools", label: "Marketing Tools", path: "/crm/marketing-tools" },
];

// Base workbench items (available to all users)
const baseWorkbenchItems: NavItem[] = [
  { id: "workbench-reinsurance", label: "Reinsurance Calc", path: "/workbench/reinsurance-calculator" },
  { id: "workbench-ai", label: "AI Assistant", path: "/workbench/ai-assistant" },
];

// Admin-only workbench items
const adminWorkbenchItems: NavItem[] = [
  { id: "workbench-scrubber", label: "Document Scrubber", path: "/workbench/document-scrubber" },
  { id: "workbench-draft-intake", label: "Draft Intake", path: "/workbench/draft-intake" },
];

function Sidebar() {
  const location = useLocation();
  const isCrm = location.pathname.startsWith("/crm");
  const isWorkbench = location.pathname.startsWith("/workbench");
  const isAdmin = location.pathname.startsWith("/admin");
  const isUserAdmin = localStorage.getItem("is_admin") === "true";
  
  let itemsToRender: NavItem[] = [];
  let sectionTitle = "UW Workbench";
  
  if (isCrm) {
    itemsToRender = crmItems;
    sectionTitle = "Agency Management";
  } else if (isWorkbench) {
    // Combine base items with admin items if user is admin
    itemsToRender = [...baseWorkbenchItems];
    if (isUserAdmin) {
      itemsToRender = [...baseWorkbenchItems, ...adminWorkbenchItems];
    }
    sectionTitle = "Workbench";
  } else if (isAdmin) {
    itemsToRender = [];
    sectionTitle = "Admin";
  } else {
    // Dashboard or other pages - show nothing or minimal info
    itemsToRender = [];
    sectionTitle = "Dashboard";
  }

  return (
    <aside style={sidebarStyles}>
      <div style={brandStyles}>{sectionTitle}</div>
      <nav>
        {itemsToRender.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            style={({ isActive }) => ({
              ...linkStyles,
              ...(isActive ? activeLinkStyles : {}),
            })}
            end
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
