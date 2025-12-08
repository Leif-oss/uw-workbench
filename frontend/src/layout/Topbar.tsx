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

function Topbar() {
  return (
    <header style={topbarStyles}>
      <div style={titleStyles}>Underwriting Workbench</div>
      <div style={{ fontSize: "0.9rem", color: "#4a5568" }}>React + Vite + TS</div>
    </header>
  );
}

export default Topbar;
