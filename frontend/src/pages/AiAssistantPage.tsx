import React, { useState, useRef, useEffect } from "react";
import { useAiAssistant, AiMessage } from "../hooks/useAiAssistant";

export function AiAssistantPage() {
  const { messages, input, setInput, sendMessage, reset, isLoading, error } =
    useAiAssistant();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Property Details Form
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [propertyDetails, setPropertyDetails] = useState({
    address: "",
    buildingLimit: "",
    constructionType: "",
    constructionYear: "",
    squareFeet: "",
    occupancy: "",
    protectionClass: "",
    sprinkler: "",
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = () => {
    const context: any = { page: "ai-assistant-standalone" };
    
    // Include property details if form is visible
    if (showPropertyForm) {
      context.propertyDetails = propertyDetails;
    }
    
    sendMessage({ context });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    if (confirm("Clear this conversation?")) {
      reset();
      setShowPropertyForm(false);
      setPropertyDetails({
        address: "",
        buildingLimit: "",
        constructionType: "",
        constructionYear: "",
        squareFeet: "",
        occupancy: "",
        protectionClass: "",
        sprinkler: "",
      });
    }
  };

  const handleSuggestionClick = (prompt: string, showForm: boolean = false) => {
    setInput(prompt);
    setShowPropertyForm(showForm);
    textareaRef.current?.focus();
  };

  const handlePropertyAnalysis = () => {
    const propertyContext = Object.entries(propertyDetails)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");

    const prompt = `Please provide a comprehensive property underwriting analysis for the following property:

${propertyContext}

Please include:
1. Risk Assessment (construction, occupancy, protection)
2. Key Underwriting Considerations
3. Recommended Coverage and Limits
4. Potential Concerns or Red Flags
5. Pricing Guidance`;

    setInput(prompt);
    handleSend();
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#f9fafb",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
          color: "#fff",
          padding: "20px 24px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 32 }}>🤖</span>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
              AI Assistant
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, opacity: 0.9 }}>
              Ask me anything about underwriting, properties, agencies, or
              insurance workflows
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleReset}
            style={{
              marginTop: 12,
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff",
              borderRadius: 6,
              padding: "6px 12px",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            🗑️ Clear Conversation
          </button>
        )}
      </div>

      {/* Main Chat Area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          maxWidth: "1200px",
          width: "100%",
          margin: "0 auto",
          padding: "24px",
          overflow: "hidden",
        }}
      >
        {/* Messages Container */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            background: "#ffffff",
            borderRadius: 12,
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            marginBottom: 16,
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: "#6b7280",
                paddingTop: 60,
              }}
            >
              <div style={{ fontSize: 64, marginBottom: 16 }}>💬</div>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: "#111827",
                  marginBottom: 8,
                }}
              >
                Welcome to your AI Assistant!
              </h2>
              <p style={{ fontSize: 14, marginBottom: 24 }}>
                I can help you with:
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: 16,
                  maxWidth: 800,
                  margin: "0 auto",
                  textAlign: "left",
                }}
              >
                <SuggestionCard
                  icon="🏗️"
                  title="Property Analysis Report"
                  example="Get a comprehensive underwriting analysis"
                  onClick={() => {
                    setShowPropertyForm(true);
                    textareaRef.current?.focus();
                  }}
                />
                <SuggestionCard
                  icon="🏢"
                  title="Agency Risk Profile"
                  example="Evaluate agency performance and risk"
                  onClick={() =>
                    handleSuggestionClick(
                      "Please provide a comprehensive agency risk profile analysis. Include: 1) Agency stability and reputation factors, 2) Historical loss ratios and claims patterns, 3) Geographic concentration risks, 4) Line of business mix evaluation, 5) Recommended underwriting guidelines and limits."
                    )
                  }
                />
                <SuggestionCard
                  icon="⚠️"
                  title="Risk Assessment"
                  example="Identify and evaluate key risk factors"
                  onClick={() =>
                    handleSuggestionClick(
                      "I need help conducting a thorough risk assessment. Please guide me through: 1) Identifying primary and secondary risk factors, 2) Evaluating hazard severity and probability, 3) Mitigation strategies and controls, 4) Risk appetite and tolerance levels, 5) Decision-making framework for acceptance or declination."
                    )
                  }
                />
                <SuggestionCard
                  icon="📋"
                  title="Coverage Recommendations"
                  example="Determine appropriate coverage and limits"
                  onClick={() =>
                    handleSuggestionClick(
                      "Help me determine appropriate coverage recommendations. Please provide guidance on: 1) Matching coverage to specific risk exposures, 2) Calculating appropriate limits based on property values and loss potential, 3) Coinsurance considerations and recommendations, 4) Deductible options and impact on pricing, 5) Additional coverage options (ordinance/law, business income, etc.)"
                    )
                  }
                />
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <MessageBubble key={idx} message={msg} />
          ))}

          {isLoading && (
            <div
              style={{
                display: "flex",
                gap: 8,
                padding: "16px 0",
                color: "#6b7280",
              }}
            >
              <span style={{ animation: "pulse 1.5s ease-in-out infinite" }}>
                ●
              </span>
              <span
                style={{
                  animation: "pulse 1.5s ease-in-out 0.2s infinite",
                }}
              >
                ●
              </span>
              <span
                style={{
                  animation: "pulse 1.5s ease-in-out 0.4s infinite",
                }}
              >
                ●
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error Display */}
        {error && (
          <div
            style={{
              background: "#fef2f2",
              color: "#991b1b",
              padding: "12px 16px",
              fontSize: 13,
              borderRadius: 8,
              marginBottom: 16,
              border: "1px solid #fecaca",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Property Details Form */}
        {showPropertyForm && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              padding: "20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              marginBottom: 16,
              border: "2px solid #3b82f6",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#111827",
                }}
              >
                🏗️ Property Details
              </h3>
              <button
                onClick={() => setShowPropertyForm(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#6b7280",
                  fontSize: 20,
                  cursor: "pointer",
                  padding: "0 4px",
                }}
                title="Close form"
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 4,
                  }}
                >
                  Address
                </label>
                <input
                  type="text"
                  value={propertyDetails.address}
                  onChange={(e) =>
                    setPropertyDetails({
                      ...propertyDetails,
                      address: e.target.value,
                    })
                  }
                  placeholder="123 Main St, City, CA"
                  style={{
                    width: "100%",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    padding: "8px 10px",
                    fontSize: 13,
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 4,
                  }}
                >
                  Building Limit ($)
                </label>
                <input
                  type="text"
                  value={propertyDetails.buildingLimit}
                  onChange={(e) =>
                    setPropertyDetails({
                      ...propertyDetails,
                      buildingLimit: e.target.value,
                    })
                  }
                  placeholder="1,000,000"
                  style={{
                    width: "100%",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    padding: "8px 10px",
                    fontSize: 13,
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 4,
                  }}
                >
                  Construction Type
                </label>
                <input
                  type="text"
                  value={propertyDetails.constructionType}
                  onChange={(e) =>
                    setPropertyDetails({
                      ...propertyDetails,
                      constructionType: e.target.value,
                    })
                  }
                  placeholder="Frame, Masonry, Steel"
                  style={{
                    width: "100%",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    padding: "8px 10px",
                    fontSize: 13,
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 4,
                  }}
                >
                  Year Built
                </label>
                <input
                  type="text"
                  value={propertyDetails.constructionYear}
                  onChange={(e) =>
                    setPropertyDetails({
                      ...propertyDetails,
                      constructionYear: e.target.value,
                    })
                  }
                  placeholder="2010"
                  style={{
                    width: "100%",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    padding: "8px 10px",
                    fontSize: 13,
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 4,
                  }}
                >
                  Square Feet
                </label>
                <input
                  type="text"
                  value={propertyDetails.squareFeet}
                  onChange={(e) =>
                    setPropertyDetails({
                      ...propertyDetails,
                      squareFeet: e.target.value,
                    })
                  }
                  placeholder="50,000"
                  style={{
                    width: "100%",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    padding: "8px 10px",
                    fontSize: 13,
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 4,
                  }}
                >
                  Occupancy
                </label>
                <input
                  type="text"
                  value={propertyDetails.occupancy}
                  onChange={(e) =>
                    setPropertyDetails({
                      ...propertyDetails,
                      occupancy: e.target.value,
                    })
                  }
                  placeholder="Office, Retail, etc."
                  style={{
                    width: "100%",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    padding: "8px 10px",
                    fontSize: 13,
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 4,
                  }}
                >
                  Protection Class
                </label>
                <input
                  type="text"
                  value={propertyDetails.protectionClass}
                  onChange={(e) =>
                    setPropertyDetails({
                      ...propertyDetails,
                      protectionClass: e.target.value,
                    })
                  }
                  placeholder="1-10"
                  style={{
                    width: "100%",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    padding: "8px 10px",
                    fontSize: 13,
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 4,
                  }}
                >
                  Sprinkler Coverage
                </label>
                <input
                  type="text"
                  value={propertyDetails.sprinkler}
                  onChange={(e) =>
                    setPropertyDetails({
                      ...propertyDetails,
                      sprinkler: e.target.value,
                    })
                  }
                  placeholder="100%, Partial, None"
                  style={{
                    width: "100%",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    padding: "8px 10px",
                    fontSize: 13,
                  }}
                />
              </div>
            </div>

            <button
              onClick={handlePropertyAnalysis}
              disabled={isLoading}
              style={{
                marginTop: 16,
                background: "#10b981",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: isLoading ? "not-allowed" : "pointer",
                width: "100%",
              }}
            >
              🔍 Generate Property Analysis Report
            </button>
          </div>
        )}

        {/* Input Area */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 12,
            padding: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything... (Press Enter to send, Shift+Enter for new line)"
              disabled={isLoading}
              style={{
                flex: 1,
                border: "2px solid #e5e7eb",
                borderRadius: 8,
                padding: "12px 16px",
                fontSize: 14,
                fontFamily: "inherit",
                resize: "none",
                minHeight: 56,
                maxHeight: 200,
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
              onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              style={{
                background:
                  input.trim() && !isLoading ? "#2563eb" : "#d1d5db",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 600,
                cursor:
                  input.trim() && !isLoading ? "pointer" : "not-allowed",
                minHeight: 56,
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => {
                if (input.trim() && !isLoading) {
                  e.currentTarget.style.background = "#1d4ed8";
                }
              }}
              onMouseLeave={(e) => {
                if (input.trim() && !isLoading) {
                  e.currentTarget.style.background = "#2563eb";
                }
              }}
            >
              {isLoading ? "Thinking..." : "Send"}
            </button>
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#9ca3af",
              marginTop: 8,
              textAlign: "center",
            }}
          >
            Press <kbd>Enter</kbd> to send • <kbd>Shift+Enter</kbd> for new
            line
          </div>
        </div>
      </div>
    </div>
  );
}

function SuggestionCard({
  icon,
  title,
  example,
  onClick,
}: {
  icon: string;
  title: string;
  example: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#f9fafb",
        border: "2px solid #e5e7eb",
        borderRadius: 8,
        padding: 16,
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#3b82f6";
        e.currentTarget.style.background = "#eff6ff";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#e5e7eb";
        e.currentTarget.style.background = "#f9fafb";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "#111827",
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 12, color: "#6b7280" }}>
        {example}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 11,
          color: "#3b82f6",
          fontWeight: 600,
        }}
      >
        Click to start →
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: AiMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          maxWidth: "75%",
          background: isUser ? "#2563eb" : "#f3f4f6",
          color: isUser ? "#ffffff" : "#111827",
          borderRadius: 16,
          padding: "12px 16px",
          fontSize: 14,
          lineHeight: 1.6,
          boxShadow: isUser
            ? "0 2px 4px rgba(37, 99, 235, 0.2)"
            : "0 1px 2px rgba(0,0,0,0.05)",
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
        }}
      >
        {message.content}
      </div>
    </div>
  );
}

// Add keyframe animation for loading dots
const style = document.createElement("style");
style.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }
  kbd {
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 2px 6px;
    font-family: monospace;
    font-size: 11px;
  }
`;
document.head.appendChild(style);

export default AiAssistantPage;

