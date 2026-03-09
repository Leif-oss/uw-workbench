import React from "react";
import { useNavigate } from "react-router-dom";
import { WorkbenchLayout } from "../components/WorkbenchLayout";

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 12,
  padding: 24,
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const cardHoverStyle: React.CSSProperties = {
  transform: "translateY(-2px)",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  borderColor: "#2563eb",
};

const MarketingToolsPage: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = React.useState<string | null>(null);

  const tools = [
    {
      id: "email-templates",
      title: "Email Templates",
      description: "Create, manage, and use email templates for agency communications. Preview and customize templates with variable replacement.",
      icon: "📧",
      path: "/crm/email-tools",
      color: "#2563eb",
      available: true,
    },
    {
      id: "email-builder",
      title: "Email Builder",
      description: "Build custom emails with customizable options. Select intro, products, and ask to generate professional emails quickly.",
      icon: "✉️",
      path: "/crm/email-builder",
      color: "#059669",
      available: true,
    },
    {
      id: "agency-research",
      title: "Agency Research",
      description: "Research insurance agencies and find key contacts using AI. Generate comprehensive prompts for ChatGPT to discover contacts, employees, and agency details.",
      icon: "🏢",
      path: "/crm/agency-research",
      color: "#10b981",
      available: true,
    },
    {
      id: "agent-search",
      title: "Agent Search",
      description: "Find all commercial lines independent agents in a specific zip code or county. Generate an exhaustive spreadsheet-style list organized by confidence, size, and business focus.",
      icon: "🔍",
      path: "/crm/agent-search",
      color: "#7c3aed",
      available: true,
    },
    {
      id: "agent-search-prompts",
      title: "Agent Search Prompts",
      description: "Create and manage AI prompts for searching and finding agents. Optimize your agent discovery with custom search strategies.",
      icon: "📋",
      path: "/crm/agent-search-prompts",
      color: "#f59e0b",
      available: false, // Coming soon
    },
  ];

  return (
    <WorkbenchLayout
      title="Marketing Tools"
      subtitle="Tools and resources for agency marketing and communication"
      rightNote="Agency Management · Marketing Tools"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
          Select a tool to get started:
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 20,
          }}
        >
          {tools.map((tool) => (
            <div
              key={tool.id}
              onClick={() => {
                if (tool.available) {
                  navigate(tool.path);
                }
              }}
              onMouseEnter={() => setHoveredCard(tool.id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                ...cardStyle,
                ...(hoveredCard === tool.id ? cardHoverStyle : {}),
                ...(tool.available ? {} : { opacity: 0.6, cursor: "not-allowed" }),
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 32,
                    width: 48,
                    height: 48,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: `${tool.color}15`,
                    borderRadius: 12,
                    flexShrink: 0,
                  }}
                >
                  {tool.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#111827",
                      marginBottom: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {tool.title}
                    {!tool.available && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#6b7280",
                          background: "#f3f4f6",
                          padding: "2px 8px",
                          borderRadius: 12,
                        }}
                      >
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#6b7280",
                      lineHeight: 1.5,
                    }}
                  >
                    {tool.description}
                  </div>
                </div>
              </div>
              {tool.available && (
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: "1px solid #e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: tool.color,
                    }}
                  >
                    Open Tool →
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: "#f9fafb",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
            💡 More tools coming soon
          </div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            We're continuously adding new marketing tools to help you manage agency relationships
            and communications more effectively.
          </div>
        </div>
      </div>
    </WorkbenchLayout>
  );
};

export default MarketingToolsPage;
