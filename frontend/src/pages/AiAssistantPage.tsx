import React, { useState, useRef, useEffect } from "react";
import { useAiAssistant, AiMessage } from "../hooks/useAiAssistant";

export function AiAssistantPage() {
  const { messages, input, setInput, sendMessage, sendCustomMessage, reset, isLoading, error } =
    useAiAssistant();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Property Details Form
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [propertyAddress, setPropertyAddress] = useState("");

  // Agency Research Form
  const [showAgencyForm, setShowAgencyForm] = useState(false);
  const [agencySearchQuery, setAgencySearchQuery] = useState("");

  // Ownership Research Form
  const [showOwnershipForm, setShowOwnershipForm] = useState(false);
  const [namedInsured, setNamedInsured] = useState("");
  const [ownershipAddress, setOwnershipAddress] = useState("");
  const [tenantName, setTenantName] = useState("");

  // Business Hazard Research Form
  const [showHazardForm, setShowHazardForm] = useState(false);
  const [businessQuery, setBusinessQuery] = useState("");

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
    
    // Include property address if form is visible
    if (showPropertyForm && propertyAddress) {
      context.propertyAddress = propertyAddress;
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
      setPropertyAddress("");
      setShowAgencyForm(false);
      setAgencySearchQuery("");
      setShowOwnershipForm(false);
      setNamedInsured("");
      setOwnershipAddress("");
      setTenantName("");
      setShowHazardForm(false);
      setBusinessQuery("");
    }
  };

  const handleSuggestionClick = (prompt: string, showForm: boolean = false) => {
    setInput(prompt);
    setShowPropertyForm(showForm);
    textareaRef.current?.focus();
  };

  const handlePropertyAnalysis = () => {
    if (!propertyAddress.trim()) {
      alert("Please enter a property address");
      return;
    }

    // Send directly without showing prompt in input
    const message = `Generate an underwriting reconnaissance report for:\n\n${propertyAddress}`;
    sendCustomMessage(message, { propertyAddress });
  };

  const handleCopyAndOpenChatGPT = () => {
    if (!propertyAddress.trim()) {
      alert("Please enter a property address");
      return;
    }

    const fullPrompt = `You are an Elite Insurance Underwriting Reconnaissance Analyst. Your job is to produce exceptionally detailed, accurate, location-specific underwriting intelligence with strong reasoning and verifiable detail. You NEVER hallucinate.

Use only credible public signals, reasonable inference, and visible data. If unknown, state "cannot be confirmed."

Always output:

Google Maps (overhead): https://www.google.com/maps/place/[ADDRESS_ENCODED]

## 1. Basic Property Snapshot
- Exact address
- Property classification
- Estimated year built
- Building & lot SF (reasonable inference allowed)
- Visible site & structure details

## 2. Construction, Protection & Access
(Concrete, tilt-up, roof, hydrants, fire station distance, access paths, fire apparatus turning, etc.)

## 3. Occupancy & Tenants
Identify real tenants whenever possible (e.g., Fix Auto Poway). Include historic occupants if clearly identifiable.

## 4. Surrounding Area & Exposure Analysis
(Adjacent occupancies, wildfire interface, drainage, roadway risks, neighboring hazards.)

## 5. Permit & Update History
Include:
- CUP permits
- CEQA findings
- APCD permits (spray booth)
- Pressure vessel registrations
If none: state so.

## 6. Listings & Market Information
Active / off-market / archived listings with SF, lot, updates, and links.

## 7. Underwriting Positives & Red Flags
Specific to THIS property only.

## 8. Data Gaps & Uncertainties
List ONLY what cannot be verified.

Style:
- Clean underwriting tone
- Bullet points
- Conservative inference
- No generic boilerplate

---

Generate a full underwriting reconnaissance report for:

${propertyAddress}`;

    // Copy to clipboard
    navigator.clipboard.writeText(fullPrompt)
      .then(() => {
        // Open ChatGPT in new window
        window.open('https://chat.openai.com', '_blank');
        alert('✅ Prompt copied to clipboard!\n\n1. ChatGPT is opening in a new window\n2. Paste (Ctrl+V) into ChatGPT\n3. Hit Enter to get your report');
      })
      .catch((err) => {
        alert('Failed to copy to clipboard. Please try again.');
        console.error('Clipboard error:', err);
      });
  };

  const handleCopyAndOpenChatGPTForAgency = () => {
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

    // Copy to clipboard
    navigator.clipboard.writeText(fullPrompt)
      .then(() => {
        // Open ChatGPT in new window
        window.open('https://chat.openai.com', '_blank');
        alert('✅ Agency research prompt copied!\n\n1. ChatGPT is opening in a new window\n2. Paste (Ctrl+V) into ChatGPT\n3. Hit Enter to get contact/employee info');
      })
      .catch((err) => {
        alert('Failed to copy to clipboard. Please try again.');
        console.error('Clipboard error:', err);
      });
  };

  const handleCopyAndOpenChatGPTForOwnership = () => {
    if (!namedInsured.trim() || !ownershipAddress.trim()) {
      alert("Please enter both Named Insured and Property Address");
      return;
    }

    const tenantInfo = tenantName.trim() 
      ? `\n**Known Tenant:** ${tenantName}` 
      : "";

    const fullPrompt = `You are an Insurance Underwriting Risk Analyst specializing in identifying common ownership and related party relationships.

**OBJECTIVE:** Investigate whether there is common ownership or control between the property owner and tenant(s) at the specified location. This is critical for underwriting as common ownership can indicate increased risk exposure.

---

**PROPERTY INFORMATION:**

**Named Insured (Owner):** ${namedInsured}
**Property Address:** ${ownershipAddress}${tenantInfo}

---

**RESEARCH REQUIREMENTS:**

## 1. Property Ownership Verification
- Confirm the legal owner of the property at the address
- Identify ownership structure (individual, LLC, corporation, trust, etc.)
- Find any DBA names or alternate business names
- Property deed information (if publicly available)
- Ownership history (if relevant)

## 2. Tenant Identification & Research
${tenantName.trim() 
  ? `- Research the provided tenant: **${tenantName}**
- Find additional tenants at this address (if multi-tenant)` 
  : `- Identify all current tenants at this property
- Business names, operating names, DBAs`}
- Tenant business type/industry
- Tenant ownership structure
- Tenant principal officers/owners

## 3. Common Ownership Analysis ⚠️ **CRITICAL**
Investigate connections between owner and tenant(s):
- **Same individuals** as owners/officers/members?
- **Family relationships** (spouses, relatives) between owners?
- **Shared addresses** (business or residential)?
- **Cross-ownership** (owner owns tenant business or vice versa)?
- **Shared management** or board members?
- **Historical connections** (previous businesses, partnerships)?
- **Corporate structure relationships** (parent/subsidiary, sister companies)?

## 4. Business Entity Research
For BOTH owner and tenant(s):
- Corporate/LLC registration details
- Registered agent
- Principal officers and their roles
- Formation date
- Registered business address
- DBA filings

## 5. Public Records & Data Sources
Search across:
- Property records / tax assessor
- Secretary of State business registrations
- LinkedIn profiles (officers, owners, employees)
- Court records (partnerships, lawsuits)
- News articles, press releases
- Social media (business pages)
- BBB listings, Yelp, Google Business

## 6. Red Flags & Risk Indicators
Explicitly identify:
- ✅ **CONFIRMED common ownership** (with evidence)
- ⚠️ **LIKELY related parties** (circumstantial evidence)
- ⚠️ **POSSIBLE connections** (requires further investigation)
- ❌ **NO connection found** (appears independent)
- 🔍 **UNCERTAIN** (insufficient public data)

---

**OUTPUT FORMAT:**

### Summary: Common Ownership Assessment
[Start with clear YES/NO/LIKELY/UNCERTAIN]

### Property Owner Details
- Legal entity name
- Structure type
- Key individuals
- Business address
- Sources: [links]

### Tenant Details
- Business name(s)
- Structure type  
- Key individuals
- Sources: [links]

### Common Ownership Findings
[Detailed analysis of any connections found]
- List specific connections (names, roles, relationships)
- Provide evidence and sources
- Rate confidence level (Confirmed / Likely / Possible / None)

### Supporting Evidence
- Links to sources
- Specific data points (names matching, addresses matching, etc.)
- Timeline of relationships (if applicable)

### Underwriting Recommendation
- Risk level: [Low / Medium / High]
- Rationale
- Suggested follow-up actions (if any)

---

**CRITICAL RULES:**
- ✅ Cite sources with clickable URLs
- ✅ Distinguish between confirmed facts and reasonable inferences
- ✅ Mark speculation clearly: "(unverified)" or "(possible)"
- ❌ NEVER fabricate ownership information
- ❌ NEVER guess at relationships without evidence
- 🔍 If data is limited, state: "Insufficient public records to confirm"
- 🎯 Focus on **verifiable connections** between owner and tenant

---

**BEGIN OWNERSHIP INVESTIGATION:**

Named Insured: **${namedInsured}**  
Property: **${ownershipAddress}**${tenantInfo ? `  \nTenant: **${tenantName}**` : ""}`;

    // Copy to clipboard
    navigator.clipboard.writeText(fullPrompt)
      .then(() => {
        // Open ChatGPT in new window
        window.open('https://chat.openai.com', '_blank');
        alert('✅ Ownership research prompt copied!\n\n1. ChatGPT is opening in a new window\n2. Paste (Ctrl+V) into ChatGPT\n3. Hit Enter to get ownership analysis');
      })
      .catch((err) => {
        alert('Failed to copy to clipboard. Please try again.');
        console.error('Clipboard error:', err);
      });
  };

  const handleCopyAndOpenChatGPTForHazard = () => {
    if (!businessQuery.trim()) {
      alert("Please enter a business class or specific business name");
      return;
    }

    const fullPrompt = `You are an Insurance Underwriting Risk Analyst specializing in operational hazards, fire risks, and business classification analysis.

**OBJECTIVE:** Provide comprehensive underwriting intelligence about the specified business to help evaluate fire risk, operational hazards, chemical exposures, and loss potential.

---

**BUSINESS TO RESEARCH:**

${businessQuery}

---

**RESEARCH REQUIREMENTS:**

## 1. Business Classification & Description
- ISO classification code (if applicable)
- NAICS code
- Industry category (manufacturing, retail, service, etc.)
- Common business names/types in this class
- Typical operations and scope of work
- Business model and revenue streams

## 2. Fire & Explosion Hazards 🔥
**CRITICAL for underwriting**
- Fire hazard severity rating (Low / Medium / High / Severe)
- Primary fire ignition sources
- Combustible materials present
- Fire load (BTU per sq ft estimates)
- Explosion hazards (dust, vapor, gas)
- Historical fire loss data for this class
- Notable fire incidents (with sources/links)

## 3. Operational Processes & Equipment
- Step-by-step process description
- Key equipment and machinery used
- Heat-producing equipment (ovens, furnaces, dryers, etc.)
- Open flame operations (welding, cutting, heating)
- Electrical load and potential hazards
- Material handling and storage
- Waste generation and disposal

## 4. Chemical & Hazardous Material Exposures ⚠️
List all potentially present chemicals/materials:
- Flammable liquids (flash points, quantities)
- Combustible liquids (oils, solvents)
- Gases (propane, natural gas, acetylene, etc.)
- Solvents and cleaners
- Paints, coatings, finishes
- Adhesives and glues
- Hazardous waste
- Dust-producing operations
- Chemical storage requirements (flammable cabinets, etc.)

## 5. Protection & Safety Systems
Typical for this business class:
- Sprinkler systems (required? common?)
- Fire alarm systems
- Suppression systems (hood systems, special hazard)
- Ventilation requirements
- Hazmat storage compliance
- Fire department access needs
- ISO PPC considerations

## 6. Common Underwriting Concerns
- Loss frequency and severity patterns
- Target underwriting risks (what to avoid)
- Preferred risk characteristics (what to accept)
- Red flags and declination triggers
- Seasonal or cyclical risks
- Supply chain vulnerabilities
- Catastrophic loss potential

## 7. Regulatory & Compliance
- OSHA requirements
- EPA regulations
- Fire code requirements (NFPA, IFC)
- Permit requirements (APCD, hazmat, CUP)
- Industry-specific regulations
- Required inspections and certifications

## 8. Occupancy-Specific Loss Prevention
- Best practices for this business type
- Critical loss control measures
- Housekeeping requirements
- Hot work procedures
- Maintenance programs
- Employee training needs

## 9. Exposure to Premises & Surrounding Properties
- Typical building construction for this occupancy
- Separation requirements from other occupancies
- Impact on neighboring properties if fire occurs
- Smoke, odor, or contamination potential
- Utility requirements and risks

## 10. Real-World Examples (if applicable)
If a specific business name was provided:
- Research the actual business operations
- Location-specific hazards
- Online reviews mentioning safety/hazards
- Photos of operations (if publicly available)
- News articles about incidents
- LinkedIn employee descriptions of processes

---

**OUTPUT FORMAT:**

### Summary: Underwriting Risk Profile
[Start with clear risk rating: Low / Medium / High / Severe]

### Business Overview
- Classification codes
- Typical operations
- Industry position

### Fire & Explosion Risk Analysis 🔥
[Detailed fire hazard assessment]
- Ignition sources
- Fuel sources
- Fire severity potential
- Historical loss data

### Chemical & Hazardous Materials ⚠️
[Complete list with quantities, flash points, storage]

### Operational Processes
[Step-by-step with equipment and hazards]

### Protection Systems
[What's typical or required for this class]

### Underwriting Recommendations
- **Accept / Decline / Conditional**
- Required protections
- Coverage limits guidance
- Pricing considerations
- Loss control requirements
- Information needed for proper evaluation

### Red Flags 🚩
[Specific conditions that would trigger declination]

### Preferred Risk Characteristics ✅
[What makes this a good underwriting risk]

### Sources & References
[Clickable links to sources]

---

**CRITICAL RULES:**
- ✅ Provide specific, actionable underwriting guidance
- ✅ Cite industry sources (NFPA, OSHA, insurance loss data)
- ✅ Include flash points and chemical quantities
- ✅ Identify all ignition and fuel sources
- ✅ Rate fire hazard severity (Low/Medium/High/Severe)
- ✅ List declination triggers clearly
- ❌ NEVER downplay hazards
- ❌ NEVER fabricate loss statistics
- 🔍 If specific data unavailable, state: "Typically varies by operation"
- 🎯 Focus on **fire, explosion, and chemical hazards** most relevant to property underwriting

---

**BEGIN HAZARD ANALYSIS:**

Business/Class: **${businessQuery}**`;

    // Copy to clipboard
    navigator.clipboard.writeText(fullPrompt)
      .then(() => {
        // Open ChatGPT in new window
        window.open('https://chat.openai.com', '_blank');
        alert('✅ Business hazard research prompt copied!\n\n1. ChatGPT is opening in a new window\n2. Paste (Ctrl+V) into ChatGPT\n3. Hit Enter to get comprehensive hazard analysis');
      })
      .catch((err) => {
        alert('Failed to copy to clipboard. Please try again.');
        console.error('Clipboard error:', err);
      });
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
                  title="Agency Research"
                  example="Find contacts & employees via ChatGPT"
                  onClick={() => {
                    setShowAgencyForm(true);
                    textareaRef.current?.focus();
                  }}
                />
                <SuggestionCard
                  icon="⚠️"
                  title="Ownership Research"
                  example="Check for common ownership via ChatGPT"
                  onClick={() => {
                    setShowOwnershipForm(true);
                    textareaRef.current?.focus();
                  }}
                />
                <SuggestionCard
                  icon="📋"
                  title="Business Hazard Research"
                  example="Research fire risk, chemicals, processes via ChatGPT"
                  onClick={() => {
                    setShowHazardForm(true);
                    textareaRef.current?.focus();
                  }}
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

        {/* Property Address Input */}
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
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  🏗️ Property Analysis
                </h3>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 12,
                    color: "#6b7280",
                  }}
                >
                  Enter a property address and AI will research and analyze it
                </p>
              </div>
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

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                Property Address *
              </label>
              <input
                type="text"
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handlePropertyAnalysis();
                  }
                }}
                placeholder="e.g., 123 Main Street, Los Angeles, CA 90012"
                autoFocus
                style={{
                  width: "100%",
                  border: "2px solid #e5e7eb",
                  borderRadius: 8,
                  padding: "12px 16px",
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
              <div
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  marginTop: 6,
                }}
              >
                💡 Include street address, city, and state for best results
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handlePropertyAnalysis}
                disabled={isLoading || !propertyAddress.trim()}
                style={{
                  background:
                    !propertyAddress.trim() || isLoading ? "#d1d5db" : "#10b981",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor:
                    !propertyAddress.trim() || isLoading
                      ? "not-allowed"
                      : "pointer",
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <span>🔍</span>
                {isLoading
                  ? "Researching property..."
                  : "Analyze Here (Limited)"}
              </button>

              <button
                onClick={handleCopyAndOpenChatGPT}
                disabled={!propertyAddress.trim()}
                style={{
                  background:
                    !propertyAddress.trim() ? "#d1d5db" : "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor:
                    !propertyAddress.trim() ? "not-allowed" : "pointer",
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <span>🚀</span>
                Copy & Open ChatGPT
              </button>
            </div>
          </div>
        )}

        {/* Agency Research Input */}
        {showAgencyForm && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              padding: "20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              marginBottom: 16,
              border: "2px solid #10b981",
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
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  🏢 Agency Research
                </h3>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 12,
                    color: "#6b7280",
                  }}
                >
                  Enter agency name or website - ChatGPT will find contacts & employees
                </p>
              </div>
              <button
                onClick={() => setShowAgencyForm(false)}
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

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
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
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
                placeholder="e.g., 'Acme Insurance Agency' or 'acmeinsurance.com'"
              />
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 12,
                  color: "#6b7280",
                  fontStyle: "italic",
                }}
              >
                💡 Tip: Company websites often yield better results than just names
              </p>
            </div>

            <div>
              <button
                onClick={handleCopyAndOpenChatGPTForAgency}
                disabled={!agencySearchQuery.trim()}
                style={{
                  background:
                    !agencySearchQuery.trim() ? "#d1d5db" : "#10b981",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor:
                    !agencySearchQuery.trim() ? "not-allowed" : "pointer",
                  width: "100%",
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
          </div>
        )}

        {/* Ownership Research Input */}
        {showOwnershipForm && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              padding: "20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              marginBottom: 16,
              border: "2px solid #f59e0b",
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
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  ⚠️ Ownership Research
                </h3>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 12,
                    color: "#6b7280",
                  }}
                >
                  ChatGPT will investigate common ownership between owner and tenant(s)
                </p>
              </div>
              <button
                onClick={() => setShowOwnershipForm(false)}
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

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  Named Insured (Property Owner) *
                </label>
                <input
                  type="text"
                  value={namedInsured}
                  onChange={(e) => setNamedInsured(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 14,
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                  placeholder="e.g., 'John Smith' or 'ABC Properties LLC'"
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  Property Address *
                </label>
                <input
                  type="text"
                  value={ownershipAddress}
                  onChange={(e) => setOwnershipAddress(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 14,
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                  placeholder="e.g., '123 Main St, Anytown, CA 12345'"
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  Tenant Name (Optional)
                </label>
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleCopyAndOpenChatGPTForOwnership();
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 14,
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                  placeholder="e.g., 'XYZ Manufacturing Inc.' (leave blank to find all tenants)"
                />
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: 12,
                    color: "#6b7280",
                    fontStyle: "italic",
                  }}
                >
                  💡 Tip: If you know a tenant name, include it. Otherwise, ChatGPT will search for all tenants.
                </p>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <button
                onClick={handleCopyAndOpenChatGPTForOwnership}
                disabled={!namedInsured.trim() || !ownershipAddress.trim()}
                style={{
                  background:
                    !namedInsured.trim() || !ownershipAddress.trim() ? "#d1d5db" : "#f59e0b",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor:
                    !namedInsured.trim() || !ownershipAddress.trim() ? "not-allowed" : "pointer",
                  width: "100%",
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
          </div>
        )}

        {/* Business Hazard Research Input */}
        {showHazardForm && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              padding: "20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              marginBottom: 16,
              border: "2px solid #ef4444",
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
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  📋 Business Hazard Research
                </h3>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 12,
                    color: "#6b7280",
                  }}
                >
                  ChatGPT will research fire risk, chemicals, processes, and hazards
                </p>
              </div>
              <button
                onClick={() => setShowHazardForm(false)}
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

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                Business Class or Specific Business Name
              </label>
              <input
                type="text"
                value={businessQuery}
                onChange={(e) => setBusinessQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleCopyAndOpenChatGPTForHazard();
                  }
                }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
                placeholder='e.g., "Auto Body Shop" or "Joe\'s Collision Center, 123 Main St"'
              />
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 12,
                  color: "#6b7280",
                  fontStyle: "italic",
                }}
              >
                💡 Examples: "Woodworking Shop", "Paint Spray Booth Operations", "Chemical Manufacturing", or a specific business name
              </p>
            </div>

            <div>
              <button
                onClick={handleCopyAndOpenChatGPTForHazard}
                disabled={!businessQuery.trim()}
                style={{
                  background:
                    !businessQuery.trim() ? "#d1d5db" : "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor:
                    !businessQuery.trim() ? "not-allowed" : "pointer",
                  width: "100%",
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

  // Function to convert URLs in text to clickable links
  const renderContentWithLinks = (text: string) => {
    // URL regex pattern
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlPattern);

    return parts.map((part, index) => {
      if (part.match(urlPattern)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: isUser ? "#bfdbfe" : "#2563eb",
              textDecoration: "underline",
              fontWeight: 500,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

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
        {renderContentWithLinks(message.content)}
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

