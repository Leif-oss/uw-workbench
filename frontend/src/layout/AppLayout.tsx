import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const layoutStyles: React.CSSProperties = {
  display: "flex",
  minHeight: "100vh",
  background: "#f5f7fb",
  color: "#1c2b3a",
  fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
};

const contentStyles: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
};

const mainStyles: React.CSSProperties = {
  padding: "20px 24px",
  flex: 1,
};

function AppLayout() {
  return (
    <div style={layoutStyles}>
      <Sidebar />
      <div style={contentStyles}>
        <Topbar />
        <main style={mainStyles}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
