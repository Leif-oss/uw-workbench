import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { WorkbenchLayout } from "../components/WorkbenchLayout";
import { cardStyle, inputStyle, labelStyle, primaryButtonStyle, selectStyle } from "../ui/designSystem";
import { AI_SERVICES, copyPromptAndOpenAI } from "../utils/aiServiceSelector";

const AgentSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchType, setSearchType] = useState<"zip" | "county">("zip");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAIService, setSelectedAIService] = useState("perplexity");

  const handleCopyAndOpenChatGPT = async () => {
    if (!searchQuery.trim()) {
      alert(`Please enter a ${searchType === "zip" ? "zip code" : "county name"}`);
      return;
    }

    const locationLabel = searchType === "zip" ? "Zip Code" : "County";
    const locationValue = searchQuery.trim();

    const fullPrompt = `You are a commercial insurance market research analyst.

Your task is to enumerate ALL independent insurance agencies that write commercial lines in the specified geographic area.

**IMPORTANT EXECUTION RULES:**

1. DO NOT explain your methodology before producing results.
2. Begin outputting agencies immediately.
3. Produce a MINIMUM of 40 agencies per response.
4. If you reach the output limit, continue in the next message automatically.
5. Continue until you cannot identify additional agencies.
6. Do not stop early to summarize or explain.
7. Only include agencies you can reasonably verify exist.
8. If data is missing, leave the field blank.

**LOCATION:**
${locationValue}

**EXCLUDE:**
- Captive agents (State Farm, Farmers, Allstate, etc.)
- Agencies that only write personal lines
- MGAs (Managing General Agents)
- Wholesale brokers

**INCLUDE:**
- Independent retail agencies
- Agencies that write commercial lines (even if they also do personal)

**OUTPUT FORMAT:**

Use pipe-delimited format for easy copying to spreadsheet:

Agency Name | Website | Owner/Primary Contact

**Field Definitions:**
- **Agency Name**: Official business name
- **Website**: Full URL (leave blank if not found)
- **Owner/Primary Contact**: Name of owner or primary contact if publicly available (leave blank if not found)

**SEARCH STRATEGY:**
Use multiple approaches:
- Google Business/Maps: "[${locationValue}] commercial insurance", "[${locationValue}] independent insurance agencies"
- Business directories: Yelp, Yellow Pages, BBB
- LinkedIn company searches
- State insurance department licensee databases (if accessible)

**Begin now.**
Return the first 40 agencies.
Do not include commentary.
Start outputting immediately.`;

    // Copy prompt and open selected AI service
    await copyPromptAndOpenAI(
      fullPrompt,
      selectedAIService,
      `✅ Agent search prompt copied!\n\n1. ${AI_SERVICES.find(s => s.id === selectedAIService)?.name || 'AI service'} is opening in a new window\n2. Paste (Ctrl+V) into the AI\n3. Hit Enter to get a comprehensive list of commercial lines agents in ${locationValue}`
    );
  };

  return (
    <WorkbenchLayout
      title="Agent Search"
      subtitle="Find all commercial lines independent agents in a specific area"
      rightNote="Agency Management · Marketing Tools"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={cardStyle}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 8 }}>
              🔍 Commercial Lines Agent Search
            </h2>
            <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
              Enter a zip code or county name to generate a comprehensive search prompt. 
              ChatGPT will create an exhaustive spreadsheet-style list of all commercial lines 
              independent insurance agencies in that area, organized by confidence level, size, 
              and business focus.
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              AI Service
            </label>
            <select
              value={selectedAIService}
              onChange={(e) => setSelectedAIService(e.target.value)}
              style={selectStyle}
            >
              {AI_SERVICES.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - {service.description}
                </option>
              ))}
            </select>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "#6b7280" }}>
              💡 Perplexity is recommended for research tasks with source citations
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              Search By
            </label>
            <select
              value={searchType}
              onChange={(e) => {
                setSearchType(e.target.value as "zip" | "county");
                setSearchQuery(""); // Clear input when switching
              }}
              style={selectStyle}
            >
              <option value="zip">Zip Code</option>
              <option value="county">County Name</option>
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              {searchType === "zip" ? "Zip Code" : "County Name"}
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleCopyAndOpenChatGPT();
                }
              }}
              style={inputStyle}
              placeholder={searchType === "zip" 
                ? "e.g., '90210' or '90210, CA'" 
                : "e.g., 'Los Angeles County' or 'Orange County, CA'"}
            />
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#6b7280", fontStyle: "italic" }}>
              💡 Tip: Including the state (e.g., "90210, CA" or "Los Angeles County, CA") can improve accuracy
            </p>
          </div>

          <button
            onClick={handleCopyAndOpenChatGPT}
            disabled={!searchQuery.trim()}
            style={{
              ...primaryButtonStyle,
              width: "100%",
              opacity: !searchQuery.trim() ? 0.5 : 1,
              cursor: !searchQuery.trim() ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <span>🚀</span>
            Copy Prompt & Open ChatGPT
          </button>
        </div>

        <div style={cardStyle}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 12 }}>
            What You'll Get
          </h3>
          <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.8 }}>
            <p style={{ marginBottom: 12 }}>
              ChatGPT will generate a focused list with essential information:
            </p>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 6 }}>
                <strong>Agency Name:</strong> Official business name
              </li>
              <li style={{ marginBottom: 6 }}>
                <strong>Website:</strong> Agency website URL (if available)
              </li>
              <li style={{ marginBottom: 6 }}>
                <strong>Owner/Primary Contact:</strong> Name of owner or primary contact (if publicly available)
              </li>
            </ul>
            <p style={{ marginTop: 12, marginBottom: 0, fontSize: 12, color: "#6b7280" }}>
              Results are returned in pipe-delimited format for easy copying to a spreadsheet.
            </p>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 12 }}>
            How It Works
          </h3>
          <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.8 }}>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 8 }}>
                Select whether to search by zip code or county name
              </li>
              <li style={{ marginBottom: 8 }}>
                Enter the location information (including state for best results)
              </li>
              <li style={{ marginBottom: 8 }}>
                Click "Copy Prompt & Open ChatGPT" - this copies a detailed, exhaustive search prompt
              </li>
              <li style={{ marginBottom: 8 }}>
                ChatGPT opens automatically in a new window
              </li>
              <li style={{ marginBottom: 8 }}>
                Paste the prompt (Ctrl+V or Cmd+V) into ChatGPT
              </li>
              <li>
                ChatGPT will use multiple search strategies and data sources to create a comprehensive list of all commercial lines independent agents in that area
              </li>
            </ol>
            <p style={{ marginTop: 12, padding: 12, background: "#fef3c7", borderRadius: 6, border: "1px solid #fbbf24" }}>
              <strong>Note:</strong> The prompt focuses on independent retail agencies only (excludes MGAs and wholesale brokers). 
              Results include only essential information: agency name, website, and owner/primary contact when available.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <button
            onClick={() => navigate("/crm/marketing-tools")}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              background: "#f9fafb",
              color: "#374151",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            ← Back to Marketing Tools
          </button>
        </div>
      </div>
    </WorkbenchLayout>
  );
};

export default AgentSearchPage;
