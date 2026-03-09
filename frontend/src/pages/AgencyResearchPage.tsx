import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { WorkbenchLayout } from "../components/WorkbenchLayout";
import { cardStyle, inputStyle, labelStyle, primaryButtonStyle, selectStyle } from "../ui/designSystem";
import { AI_SERVICES, copyPromptAndOpenAI } from "../utils/aiServiceSelector";

const AgencyResearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [agencySearchQuery, setAgencySearchQuery] = useState("");
  const [selectedAIService, setSelectedAIService] = useState("chatgpt");

  const handleCopyAndOpenChatGPTForAgency = async () => {
    if (!agencySearchQuery.trim()) {
      alert("Please enter an agency name or website");
      return;
    }

    const fullPrompt = `You are an Insurance Agency Research Assistant. Your job is to find comprehensive contact and employee information for insurance agencies.

Research the following agency and provide detailed, accurate information:

**Agency to Research:** ${agencySearchQuery}

**Required Information to Find:**

## 1. Agency Overview
- Official agency name
- DBA (Doing Business As) names if different
- Agency website URL
- Main office address
- Phone number(s)
- General email address

## 2. Key Contacts & Employees
For each person you find, provide:
- Full name
- Job title/role
- Direct phone number (if available)
- Email address (if available)
- LinkedIn profile URL (if available)
- Professional bio/background (brief)

Focus on finding:
- Owner(s) / Principal(s)
- Commercial lines producers/brokers
- Account managers
- Key decision makers

## 3. Agency Details
- Year established
- Number of employees (estimate)
- Specializations (commercial, personal, benefits, etc.)
- Carrier appointments (if publicly listed)
- Industry associations/memberships

## 4. Social Media & Online Presence
- LinkedIn company page
- Facebook page
- Twitter/X handle
- Other relevant profiles

## 5. News & Updates
- Recent news mentions
- Press releases
- Awards or recognitions
- Notable clients (if public)

**Output Format:**
- Use clean, organized sections
- Provide clickable URLs
- Mark uncertain information as "(estimated)" or "(unverified)"
- If information cannot be found, state "Not publicly available"
- Cite sources where possible

**Important:**
- Only provide information that is publicly available
- Do NOT fabricate contact information
- Verify information across multiple sources when possible
- Focus on decision makers and producers (most relevant for underwriting)

---

Begin research for: ${agencySearchQuery}`;

    // Copy prompt and open selected AI service
    await copyPromptAndOpenAI(
      fullPrompt,
      selectedAIService,
      `✅ Agency research prompt copied!\n\n1. ${AI_SERVICES.find(s => s.id === selectedAIService)?.name || 'AI service'} is opening in a new window\n2. Paste (Ctrl+V) into the AI\n3. Hit Enter to get contact/employee info`
    );
  };

  return (
    <WorkbenchLayout
      title="Agency Research"
      subtitle="Research insurance agencies and find key contacts using AI"
      rightNote="Agency Management · Marketing Tools"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={cardStyle}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 8 }}>
              🏢 Agency Research Tool
            </h2>
            <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
              Enter an agency name or website to generate a comprehensive research prompt. 
              The prompt will be copied to your clipboard and ChatGPT will open in a new window 
              to help you find contacts, employees, and key information about the agency.
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
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              Agency Name or Website
            </label>
            <input
              type="text"
              value={agencySearchQuery}
              onChange={(e) => setAgencySearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleCopyAndOpenChatGPTForAgency();
                }
              }}
              style={inputStyle}
              placeholder="e.g., 'Acme Insurance Agency' or 'acmeinsurance.com'"
            />
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#6b7280", fontStyle: "italic" }}>
              💡 Tip: Company websites often yield better results than just names
            </p>
          </div>

          <button
            onClick={handleCopyAndOpenChatGPTForAgency}
            disabled={!agencySearchQuery.trim()}
            style={{
              ...primaryButtonStyle,
              width: "100%",
              opacity: !agencySearchQuery.trim() ? 0.5 : 1,
              cursor: !agencySearchQuery.trim() ? "not-allowed" : "pointer",
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
            How It Works
          </h3>
          <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.8 }}>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 8 }}>
                Enter the agency name or website in the field above
              </li>
              <li style={{ marginBottom: 8 }}>
                Click "Copy Prompt & Open ChatGPT" - this will copy a detailed research prompt to your clipboard
              </li>
              <li style={{ marginBottom: 8 }}>
                ChatGPT will open in a new window automatically
              </li>
              <li style={{ marginBottom: 8 }}>
                Paste the prompt (Ctrl+V or Cmd+V) into ChatGPT
              </li>
              <li>
                ChatGPT will provide comprehensive information about the agency, including contacts, employees, and key details
              </li>
            </ol>
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

export default AgencyResearchPage;
