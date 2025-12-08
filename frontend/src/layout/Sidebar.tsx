import { NavLink } from "react-router-dom";

const sidebarStyles: React.CSSProperties = {
  width: "230px",
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

const navLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/offices", label: "Offices" },
  { to: "/agencies", label: "Agencies" },
  { to: "/workbench", label: "Workbench" },
  { to: "/admin", label: "Admin" },
];

function Sidebar() {
  return (
    <aside style={sidebarStyles}>
      <div style={brandStyles}>UW Workbench</div>
      <nav>
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => ({
              ...linkStyles,
              ...(isActive ? activeLinkStyles : {}),
            })}
            end={link.to === "/dashboard"}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
