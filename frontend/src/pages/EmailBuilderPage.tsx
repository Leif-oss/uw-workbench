import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { WorkbenchLayout } from "../components/WorkbenchLayout";
import { apiGet, apiPost } from "../api/client";
import {
  cardStyle,
  inputStyle,
  labelStyle,
  selectStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from "../ui/designSystem";

type Contact = {
  id: number;
  name: string;
  email: string | null;
  title: string | null;
  agency_id: number;
};

type Agency = {
  id: number;
  name: string;
  code: string | null;
  office_id: number | null;
};

type Office = {
  id: number;
  name: string;
  code: string;
};

// Email builder options - written to combine seamlessly
const INTRO_OPTIONS = [
  { 
    id: "intro-1", 
    label: "New Contact – Cold Introduction",
    text: "I wanted to introduce myself and reach out as a resource for your team. I work with brokers on commercial property and casualty opportunities and wanted to share a few areas where we may be able to help."
  },
  { 
    id: "intro-2", 
    label: "New Contact – Referred Introduction",
    text: "I was given your name as someone who may handle this type of business, so I wanted to reach out and introduce myself. I'd welcome the chance to connect and share a few areas where we may be able to support your team."
  },
  { 
    id: "intro-3", 
    label: "Renewal / Account Transition Outreach",
    text: "I wanted to reach out regarding an upcoming renewal opportunity and also introduce myself as a resource for similar business going forward. We would be glad to review accounts that fit our appetite."
  },
  { 
    id: "intro-4", 
    label: "Haven't Heard From You in a While",
    text: "It has been a little while since we last connected, so I wanted to check in and reintroduce myself as a market for business that may fit our appetite. I also wanted to share a few areas we are actively interested in reviewing."
  },
  { 
    id: "intro-5", 
    label: "Wanted to Share What We're Writing",
    text: "I wanted to briefly share a few areas we are actively writing right now in case you have anything in the pipeline that may align. We continue to look for opportunities where we can be a competitive and responsive market."
  },
  { 
    id: "intro-6", 
    label: "Share Recent Successes",
    text: "I wanted to share a few examples of the types of accounts we have recently been able to help with, as I thought it might be useful context for opportunities you are seeing in the market."
  },
  { 
    id: "intro-7", 
    label: "Share Claims Story / Coverage Story",
    text: "I wanted to share a recent example that highlights the practical value of our coverage approach and claims handling, as I thought it might be relevant to the types of insureds you work with."
  },
  { 
    id: "intro-8", 
    label: "Thanks for the Recent Opportunity",
    text: "Thank you for the recent opportunity. We appreciate the chance to review your business and wanted to stay in front of you as a resource for similar accounts going forward."
  },
  { 
    id: "intro-9", 
    label: "Standard + Surplus Proposition",
    text: "I wanted to share a quick overview of how we may be able to help on both standard and surplus opportunities, particularly when flexibility and responsiveness are important."
  },
  { 
    id: "intro-10", 
    label: "Meeting / Call Introduction",
    text: "I wanted to introduce myself and see if you might have a few minutes for a quick call or meeting sometime soon. I'd appreciate the chance to learn more about the business you focus on and share where we may be able to help."
  },
];

const PRODUCT_OPTIONS = [
  { 
    id: "product-1", 
    label: "Premier Building Owners Package Policy",
    text: "One area we would particularly welcome is our Premier Building Owners Package Policy, designed for well-maintained tenant-occupied commercial buildings such as retail, office, mercantile, and light industrial properties. The program combines property and liability coverage with strong features like replacement cost coverage, loss of rents options, and flexible underwriting for building ownership risks."
  },
  { 
    id: "product-2", 
    label: "Business Personal Property Policy",
    text: "We would also be glad to review opportunities for Business Personal Property coverage, designed for operating businesses where coverage is needed for business property and tenant improvements. The policy offers replacement cost options, flexible coverage structures, and a straightforward solution for protecting business property exposures."
  },
  { 
    id: "product-3", 
    label: "Builders Risk / Course of Construction",
    text: "We would welcome Builder's Risk opportunities for projects during the course of construction, including both residential and commercial developments. The program provides replacement cost coverage for structures, materials, and related exposures while construction is underway."
  },
  { 
    id: "product-4", 
    label: "Contractor's Equipment / Equipment Floater",
    text: "We are also interested in Contractor's Equipment and Equipment Floater opportunities for mobile equipment, machinery, and tools owned by contractors or in their care, custody, or control. The coverage is designed to protect equipment exposures across jobsites and operating locations."
  },
  { 
    id: "product-5", 
    label: "Difference in Conditions (DIC)",
    text: "We would also welcome Difference in Conditions (DIC) opportunities, particularly for properties placed with the CA FAIR Plan where additional coverage is needed for perils not included in the base policy. These policies can provide broader protection and flexible coverage solutions depending on the risk."
  },
  { 
    id: "product-6", 
    label: "Surplus Lines",
    text: "We are always interested in reviewing Surplus Lines opportunities, particularly for risks that may be difficult to place in the standard market. Our surplus lines platform allows us to work with a range of commercial and inland marine risks where flexible underwriting and customized solutions are needed."
  },
];

const ASK_OPTIONS = [
  { 
    id: "ask-1", 
    label: "Ask for That Specific Type of Business",
    text: "If you have any business along those lines, I would be glad to take a look and let you know whether it may be a fit."
  },
  { 
    id: "ask-2", 
    label: "Ask for a Meeting",
    text: "If it would be helpful, I would welcome the chance to set up a quick meeting and learn more about the opportunities your team is seeing."
  },
  { 
    id: "ask-3", 
    label: "Ask for Referral to the Right Person",
    text: "If you are not the right person for this area, I would appreciate any direction to the teammate who handles this type of business."
  },
  { 
    id: "ask-4", 
    label: "Ask for a Call to Discuss",
    text: "If you have a few minutes sometime soon, I would be glad to connect by phone and discuss where we may be able to help."
  },
];

const EmailBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillContactId = searchParams.get("contactId") ? Number(searchParams.get("contactId")) : null;
  const prefillAgencyId = searchParams.get("agencyId") ? Number(searchParams.get("agencyId")) : null;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<number | null>(null);
  const [selectedAgencyId, setSelectedAgencyId] = useState<number | null>(prefillAgencyId);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(prefillContactId);
  const [selectedIntro, setSelectedIntro] = useState<string>("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedAsk, setSelectedAsk] = useState<string>("");
  const [generatedEmail, setGeneratedEmail] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState<string>("");
  const [logNote, setLogNote] = useState<string>("");
  const [isLogging, setIsLogging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [contactsResp, agenciesResp, officesResp] = await Promise.all([
          apiGet<Contact[]>("/contacts"),
          apiGet<Agency[]>("/agencies"),
          apiGet<Office[]>("/offices"),
        ]);
        setContacts(contactsResp || []);
        setAgencies(agenciesResp || []);
        setOffices(officesResp || []);
      } catch (err: any) {
        setError(err?.message || "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Auto-select contact/agency/office when data is loaded and prefill values are set
  useEffect(() => {
    if (prefillContactId && contacts.length > 0 && agencies.length > 0 && offices.length > 0) {
      const contact = contacts.find(c => c.id === prefillContactId);
      if (contact) {
        const agency = agencies.find(a => a.id === contact.agency_id);
        if (agency) {
          // Set office first
          if (agency.office_id) {
            setSelectedOfficeId(agency.office_id);
          }
          // Set agency
          setSelectedAgencyId(agency.id);
          // Set contact
          setSelectedContactId(prefillContactId);
        }
      }
    } else if (prefillAgencyId && agencies.length > 0 && offices.length > 0) {
      const agency = agencies.find(a => a.id === prefillAgencyId);
      if (agency && agency.office_id) {
        setSelectedOfficeId(agency.office_id);
        setSelectedAgencyId(prefillAgencyId);
      }
    }
  }, [contacts, agencies, offices, prefillContactId, prefillAgencyId]);

  const selectedContact = contacts.find(c => c.id === selectedContactId);
  const selectedAgency = selectedAgencyId
    ? agencies.find(a => a.id === selectedAgencyId)
    : (selectedContact ? agencies.find(a => a.id === selectedContact.agency_id) : null);
  const selectedOffice = selectedOfficeId
    ? offices.find(o => o.id === selectedOfficeId)
    : (selectedAgency && selectedAgency.office_id ? offices.find(o => o.id === selectedAgency.office_id) : null);

  const handleProductToggle = (productId: string) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const generateEmail = () => {
    if (!selectedContact) {
      setError("Please select a contact");
      return;
    }
    if (!selectedIntro) {
      setError("Please select an intro/reason");
      return;
    }
    if (selectedProducts.length === 0) {
      setError("Please select at least one product/service");
      return;
    }
    if (!selectedAsk) {
      setError("Please select an ask");
      return;
    }

    setError(null);

    // Get selected option texts
    const introOption = INTRO_OPTIONS.find(opt => opt.id === selectedIntro);
    const introText = introOption?.text || "";
    const productOptions = selectedProducts
      .map(id => PRODUCT_OPTIONS.find(opt => opt.id === id))
      .filter((opt): opt is { id: string; label: string; text: string } => opt !== undefined);
    const productTexts = productOptions.map(opt => opt.text);
    const askOption = ASK_OPTIONS.find(opt => opt.id === selectedAsk);
    const askText = askOption?.text || "";

    // Build email body - combine seamlessly (options are written to flow naturally)
    const contactName = selectedContact.name.split(" ")[0]; // First name
    
    // Combine intro, products, and ask seamlessly
    let emailBody = `Hi ${contactName},\n\n${introText}`;
    
    // Add product blocks (they're written to flow naturally after any intro)
    if (productTexts.length > 0) {
      emailBody += "\n\n" + productTexts.join("\n\n");
    }
    
    // Add ask (it's written to flow naturally after any intro/product combination)
    if (askText) {
      emailBody += "\n\n" + askText;
    }
    
    // Add closing
    emailBody += "\n\nPlease let me know if you'd like to discuss further or have any questions.\n\nBest regards";

    // Generate subject based on intro type
    const subject = introOption?.label === "Renewal / Account Transition Outreach"
      ? "Renewal Opportunity"
      : introOption?.label === "Thanks for the Recent Opportunity"
      ? "Thank You"
      : introOption?.label === "Meeting / Call Introduction"
      ? "Introduction and Meeting Request"
      : productOptions.length === 1
      ? `Information about ${productOptions[0].label}`
      : "Insurance Solutions for Your Business";

    setEmailSubject(subject);
    setGeneratedEmail(emailBody);

    // Auto-generate log note with labels for clarity
    const productLabels = productOptions.map(opt => opt.label).join(", ");
    const note = `Email sent via Email Builder: ${introOption?.label || selectedIntro} | Products: ${productLabels} | Ask: ${askOption?.label || selectedAsk}`;
    setLogNote(note);
  };

  const handleCopyEmail = async () => {
    if (!generatedEmail) return;
    
    try {
      await navigator.clipboard.writeText(generatedEmail);
      alert("Email copied to clipboard!");
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = generatedEmail;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Email copied to clipboard!");
    }
  };

  const handleLogContact = async () => {
    if (!selectedContact || !selectedAgencyId) {
      setError("Please select a contact");
      return;
    }
    if (!generatedEmail) {
      setError("Please generate an email first");
      return;
    }

    const agency = agencies.find(a => a.id === selectedAgencyId);
    if (!agency) {
      setError("Agency not found");
      return;
    }

    setIsLogging(true);
    setError(null);

    try {
      // Get office code for the log
      const office = agency.office_id 
        ? offices.find(o => o.id === agency.office_id)
        : null;
      const officeCode = office?.code || null;
      
      const logPayload = {
        user: localStorage.getItem("username") || "User",
        datetime: new Date().toISOString(),
        action: "Email Sent",
        agency_id: agency.id,
        contact_id: selectedContact.id,
        contact: selectedContact.name,
        notes: logNote || `Email sent via Email Builder: ${selectedIntro} | Products: ${selectedProducts.join(", ")} | Ask: ${selectedAsk}`,
        office: officeCode,
      };

      await apiPost("/logs", logPayload);

      alert("Contact logged successfully!");
      
      // Reset form
      setSelectedIntro("");
      setSelectedProducts([]);
      setSelectedAsk("");
      setGeneratedEmail("");
      setEmailSubject("");
      setLogNote("");
    } catch (err: any) {
      setError(err?.message || "Failed to log contact");
    } finally {
      setIsLogging(false);
    }
  };

  const sidebar = (
    <>
      <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13, color: "#111827" }}>Navigation</div>
      <button
        type="button"
        onClick={() => navigate("/crm/marketing-tools")}
        style={{
          ...secondaryButtonStyle,
          width: "100%",
          marginBottom: 8,
          fontSize: 12,
        }}
      >
        ← Back to Marketing Tools
      </button>
    </>
  );

  return (
    <WorkbenchLayout
      title="Email Builder"
      subtitle="Build professional emails with customizable options"
      rightNote="Agency Management · Marketing Tools"
      sidebar={sidebar}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {error && (
          <div style={{ padding: "12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626" }}>
            {error}
          </div>
        )}

        {isLoading && (
          <div style={{ padding: "12px", background: "#f9fafb", borderRadius: 8, color: "#6b7280" }}>
            Loading contacts and agencies...
          </div>
        )}

        {/* Contact Selection */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>1. Select Contact</h3>
          <div>
            <label style={labelStyle}>Office</label>
            <select
              value={selectedOfficeId || ""}
              onChange={(e) => {
                const officeId = e.target.value ? Number(e.target.value) : null;
                setSelectedOfficeId(officeId);
                // Reset agency and contact when office changes
                setSelectedAgencyId(null);
                setSelectedContactId(null);
              }}
              style={selectStyle}
            >
              <option value="">-- Select an office --</option>
              {offices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.code} - {office.name}
                </option>
              ))}
            </select>
          </div>

          {selectedOfficeId && (
            <div style={{ marginTop: 16 }}>
              <label style={labelStyle}>Agency</label>
              <select
                value={selectedAgencyId || ""}
                onChange={(e) => {
                  const agencyId = e.target.value ? Number(e.target.value) : null;
                  setSelectedAgencyId(agencyId);
                  // Reset contact when agency changes
                  setSelectedContactId(null);
                }}
                style={selectStyle}
              >
                <option value="">-- Select an agency --</option>
                {agencies
                  .filter(a => a.office_id === selectedOfficeId)
                  .map((agency) => (
                    <option key={agency.id} value={agency.id}>
                      {agency.code ? `${agency.code} - ` : ""}{agency.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {selectedAgencyId && (
            <div style={{ marginTop: 16 }}>
              <label style={labelStyle}>Contact</label>
              <select
                value={selectedContactId || ""}
                onChange={(e) => setSelectedContactId(e.target.value ? Number(e.target.value) : null)}
                style={selectStyle}
              >
                <option value="">-- Select a contact --</option>
                {contacts
                  .filter(c => c.agency_id === selectedAgencyId)
                  .map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} {contact.email ? `(${contact.email})` : ""}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {selectedContact && (
            <div style={{ marginTop: 12, padding: 12, background: "#f9fafb", borderRadius: 8, fontSize: 12, color: "#374151" }}>
              <div><strong>Contact:</strong> {selectedContact.name}</div>
              {selectedContact.title && <div><strong>Title:</strong> {selectedContact.title}</div>}
              <div><strong>Email:</strong> {selectedContact.email || "No email"}</div>
              <div><strong>Agency:</strong> {selectedAgency?.name || "Unknown"}</div>
              {selectedOffice && <div><strong>Office:</strong> {selectedOffice.code} - {selectedOffice.name}</div>}
            </div>
          )}
        </div>

        {/* Email Builder Options */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>2. Build Your Email</h3>
          
          {/* Intro/Reason */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Intro / Reason for Email *</label>
            <select
              value={selectedIntro}
              onChange={(e) => setSelectedIntro(e.target.value)}
              style={selectStyle}
            >
              <option value="">-- Select an intro --</option>
              {INTRO_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            {selectedIntro && (
              <div style={{ marginTop: 8, padding: 8, background: "#f9fafb", borderRadius: 6, fontSize: 12, color: "#374151" }}>
                {INTRO_OPTIONS.find(opt => opt.id === selectedIntro)?.text}
              </div>
            )}
          </div>

          {/* Products/Services - Multiple Selection */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Product / Service Offering * (Select one or more)</label>
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: 8,
              maxHeight: 200,
              overflowY: "auto",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              padding: 8,
            }}>
              {PRODUCT_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    cursor: "pointer",
                    padding: "8px 10px",
                    borderRadius: 4,
                    background: selectedProducts.includes(option.id) ? "#eff6ff" : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(option.id)}
                    onChange={() => handleProductToggle(option.id)}
                    style={{ cursor: "pointer", marginTop: 2 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{option.label}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{option.text}</div>
                  </div>
                </label>
              ))}
            </div>
            {selectedProducts.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#059669" }}>
                {selectedProducts.length} product{selectedProducts.length > 1 ? "s" : ""} selected
              </div>
            )}
          </div>

          {/* Ask */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>The Ask *</label>
            <select
              value={selectedAsk}
              onChange={(e) => setSelectedAsk(e.target.value)}
              style={selectStyle}
            >
              <option value="">-- Select an ask --</option>
              {ASK_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            {selectedAsk && (
              <div style={{ marginTop: 8, padding: 8, background: "#f9fafb", borderRadius: 6, fontSize: 12, color: "#374151" }}>
                {ASK_OPTIONS.find(opt => opt.id === selectedAsk)?.text}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={generateEmail}
            disabled={!selectedContact || !selectedIntro || selectedProducts.length === 0 || !selectedAsk}
            style={{
              ...primaryButtonStyle,
              opacity: (!selectedContact || !selectedIntro || selectedProducts.length === 0 || !selectedAsk) ? 0.5 : 1,
              cursor: (!selectedContact || !selectedIntro || selectedProducts.length === 0 || !selectedAsk) ? "not-allowed" : "pointer",
            }}
          >
            Generate Email
          </button>
        </div>

        {/* Generated Email */}
        {generatedEmail && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>3. Generated Email</h3>
            
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Email Body</label>
              <textarea
                value={generatedEmail}
                onChange={(e) => setGeneratedEmail(e.target.value)}
                rows={12}
                style={{
                  ...inputStyle,
                  fontFamily: "monospace",
                  fontSize: 13,
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button
                type="button"
                onClick={handleCopyEmail}
                style={{
                  ...primaryButtonStyle,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                📋 Copy Email Text
              </button>
            </div>

            {/* Log Contact Section */}
            <div style={{ 
              padding: 16, 
              background: "#f9fafb", 
              borderRadius: 8, 
              border: "1px solid #e5e7eb",
              marginTop: 16,
            }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Log This Contact</h4>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Note (auto-filled, can edit)</label>
                <textarea
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                  rows={3}
                  style={{
                    ...inputStyle,
                    fontSize: 12,
                    resize: "vertical",
                  }}
                  placeholder="Note describing the email options..."
                />
              </div>
              <button
                type="button"
                onClick={handleLogContact}
                disabled={isLogging || !selectedContact}
                style={{
                  ...primaryButtonStyle,
                  opacity: (isLogging || !selectedContact) ? 0.5 : 1,
                  cursor: (isLogging || !selectedContact) ? "not-allowed" : "pointer",
                }}
              >
                {isLogging ? "Logging..." : "📝 Log Contact & Email"}
              </button>
            </div>
          </div>
        )}
      </div>
    </WorkbenchLayout>
  );
};

export default EmailBuilderPage;
