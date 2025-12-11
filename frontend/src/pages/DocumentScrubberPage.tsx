import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { WorkbenchLayout } from "../components/WorkbenchLayout";
import { cardStyle, buttonPrimaryStyle, buttonSecondaryStyle, inputStyle, labelStyle, selectStyle } from "../ui/designSystem";

type ExtractedFields = {
  effective_date?: string;
  expiration_date?: string;
  producer_name?: string;
  producer_code?: string;
  insured_name?: string;
  additional_insured_names?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  mailing_address?: string;
  location_street_number?: string;
  location_street_name?: string;
  location_suite?: string;
  location_city?: string;
  location_state?: string;
  location_zip?: string;
  building_limit?: string;
  deductible?: string;
  additional_limits_rents?: string;
  additional_limits_ordinance?: string;
  additional_limits_demolition?: string;
  additional_limits_eqsl?: string;
  additional_insured?: string;
  mortgagee?: string;
  loss_payee?: string;
  construction_type?: string;
  construction_year?: string;
  square_feet?: string;
  sprinkler_percent?: string;
  protection_class?: string;
  line_of_business?: string;
  notes?: string;
};

type AgencyMatch = {
  id: number;
  name: string;
  code: string;
  dba?: string;
  email?: string;
  primary_underwriter?: string;
};

type ContactMatch = {
  id: number;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  agency_id: number;
};

export const DocumentScrubberPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [extractedText, setExtractedText] = useState("");
  const [extractedFields, setExtractedFields] = useState<ExtractedFields>({});
  const [agencyMatches, setAgencyMatches] = useState<AgencyMatch[]>([]);
  const [contactMatches, setContactMatches] = useState<ContactMatch[]>([]);
  
  const [selectedAgencyId, setSelectedAgencyId] = useState<number | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  
  const [newContactName, setNewContactName] = useState("");
  const [newContactTitle, setNewContactTitle] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  
  const [showSuccess, setShowSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      // Reset state
      setExtractedText("");
      setExtractedFields({});
      setAgencyMatches([]);
      setContactMatches([]);
      setSelectedAgencyId(null);
      setSelectedContactId(null);
      setShowContactForm(false);
      setShowSuccess(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      // Reset state
      setExtractedText("");
      setExtractedFields({});
      setAgencyMatches([]);
      setContactMatches([]);
      setSelectedAgencyId(null);
      setSelectedContactId(null);
      setShowContactForm(false);
      setShowSuccess(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (apiKey) {
        formData.append("api_key", apiKey);
      }
      
      const response = await fetch("http://127.0.0.1:8000/submissions/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || "Upload failed");
      }
      
      const data = await response.json();
      
      setExtractedText(data.extracted_text || "");
      setExtractedFields(data.extracted_fields || {});
      setAgencyMatches(data.agency_matches || []);
      
      // Auto-select agency if only one match
      if (data.agency_matches && data.agency_matches.length === 1) {
        const agencyId = data.agency_matches[0].id;
        setSelectedAgencyId(agencyId);
        await searchContacts(agencyId, data.extracted_fields);
      }
      
    } catch (error) {
      console.error("Upload error:", error);
      alert(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const searchContacts = async (agencyId: number, fields: ExtractedFields) => {
    try {
      const params = new URLSearchParams();
      if (fields.contact_name) params.append("contact_name", fields.contact_name);
      if (fields.contact_email) params.append("contact_email", fields.contact_email);
      
      const response = await fetch(
        `http://127.0.0.1:8000/submissions/search-contacts/${agencyId}?${params.toString()}`,
        { method: "POST" }
      );
      
      if (response.ok) {
        const data = await response.json();
        setContactMatches(data.contact_matches || []);
        
        // Auto-select if only one match
        if (data.contact_matches && data.contact_matches.length === 1) {
          setSelectedContactId(data.contact_matches[0].id);
        } else if (data.contact_matches && data.contact_matches.length === 0) {
          // No matches, pre-fill new contact form
          setShowContactForm(true);
          setNewContactName(fields.contact_name || "");
          setNewContactEmail(fields.contact_email || "");
          setNewContactPhone(fields.contact_phone || "");
        }
      }
    } catch (error) {
      console.error("Contact search error:", error);
    }
  };

  const handleAgencySelect = async (agencyId: number) => {
    setSelectedAgencyId(agencyId);
    setContactMatches([]);
    setSelectedContactId(null);
    setShowContactForm(false);
    
    await searchContacts(agencyId, extractedFields);
  };

  const handleCreateContact = async () => {
    if (!selectedAgencyId || !newContactName) {
      alert("Please select an agency and enter a contact name");
      return;
    }
    
    try {
      const response = await fetch("http://127.0.0.1:8000/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newContactName,
          title: newContactTitle,
          email: newContactEmail,
          phone: newContactPhone,
          agency_id: selectedAgencyId,
          notes: "",
          linkedin_url: "",
        }),
      });
      
      if (!response.ok) throw new Error("Failed to create contact");
      
      const newContact = await response.json();
      setSelectedContactId(newContact.id);
      setShowContactForm(false);
      
      // Refresh contact list
      await searchContacts(selectedAgencyId, extractedFields);
      
      alert("Contact created successfully!");
    } catch (error) {
      console.error("Create contact error:", error);
      alert("Failed to create contact");
    }
  };

  const handleSaveSubmission = async () => {
    setIsProcessing(true);
    
    try {
      const response = await fetch("http://127.0.0.1:8000/submissions/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...extractedFields,
          agency_id: selectedAgencyId,
          contact_id: selectedContactId,
          original_filename: selectedFile?.name,
          file_type: selectedFile?.type,
          extracted_text: extractedText,
          status: "pending",
        }),
      });
      
      if (!response.ok) throw new Error("Failed to save submission");
      
      const submission = await response.json();
      setShowSuccess(true);
      
      setTimeout(() => {
        navigate(`/crm/agencies/${selectedAgencyId}`);
      }, 2000);
      
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save submission");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <WorkbenchLayout
      title="Document Scrubber"
      subtitle="Upload underwriting submissions and extract data with AI"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        
        {/* File Upload Section */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 16 }}>
            Upload Submission Document
          </h3>
          
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            style={{
              border: "2px dashed #cbd5e1",
              borderRadius: 12,
              padding: 40,
              textAlign: "center",
              background: "#f8fafc",
              cursor: "pointer",
              marginBottom: 16,
            }}
          >
            <input
              type="file"
              accept=".pdf,.docx,.xlsx,.xls,.txt"
              onChange={handleFileChange}
              style={{ display: "none" }}
              id="file-upload"
            />
            <label htmlFor="file-upload" style={{ cursor: "pointer" }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>📄</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                {selectedFile ? selectedFile.name : "Drag & drop or click to select"}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                Supported: PDF, DOCX, Excel, TXT
              </div>
            </label>
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>OpenAI API Key (optional, for AI extraction)</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              style={inputStyle}
            />
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
              Your API key is never stored. Used only for this extraction.
            </div>
          </div>
          
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            style={{
              ...buttonPrimaryStyle,
              opacity: !selectedFile || isUploading ? 0.5 : 1,
              cursor: !selectedFile || isUploading ? "not-allowed" : "pointer",
            }}
          >
            {isUploading ? "Processing..." : "Extract Data"}
          </button>
        </div>

        {/* Agency Matching Section */}
        {agencyMatches.length > 0 && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 16 }}>
              🏢 Agency Matching
            </h3>
            
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
              Found {agencyMatches.length} potential agency match{agencyMatches.length !== 1 ? "es" : ""}:
            </div>
            
            {agencyMatches.map((agency) => (
              <div
                key={agency.id}
                onClick={() => handleAgencySelect(agency.id)}
                style={{
                  padding: 16,
                  border: selectedAgencyId === agency.id ? "2px solid #2563eb" : "1px solid #e2e8f0",
                  borderRadius: 8,
                  marginBottom: 12,
                  background: selectedAgencyId === agency.id ? "#eff6ff" : "#fff",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 4 }}>
                      {agency.name}
                      {agency.dba && <span style={{ fontWeight: 400, color: "#64748b", fontSize: 13, marginLeft: 8 }}>({agency.dba})</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      Code: {agency.code} | Underwriter: {agency.primary_underwriter || "Unassigned"}
                    </div>
                  </div>
                  {selectedAgencyId === agency.id && (
                    <div style={{ fontSize: 20 }}>✅</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Contact Matching Section */}
        {selectedAgencyId && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 16 }}>
              👤 Contact Matching
            </h3>
            
            {contactMatches.length > 0 ? (
              <>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
                  Found {contactMatches.length} contact match{contactMatches.length !== 1 ? "es" : ""}:
                </div>
                
                {contactMatches.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => setSelectedContactId(contact.id)}
                    style={{
                      padding: 16,
                      border: selectedContactId === contact.id ? "2px solid #2563eb" : "1px solid #e2e8f0",
                      borderRadius: 8,
                      marginBottom: 12,
                      background: selectedContactId === contact.id ? "#eff6ff" : "#fff",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 4 }}>
                          {contact.name}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          {contact.title && `${contact.title} | `}
                          {contact.email || contact.phone || "No contact info"}
                        </div>
                      </div>
                      {selectedContactId === contact.id && (
                        <div style={{ fontSize: 20 }}>✅</div>
                      )}
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={() => setShowContactForm(!showContactForm)}
                  style={{
                    ...buttonSecondaryStyle,
                    marginTop: 8,
                  }}
                >
                  {showContactForm ? "Cancel" : "+ Add New Contact"}
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, color: "#f59e0b", marginBottom: 12, padding: 12, background: "#fffbeb", borderRadius: 8 }}>
                  ⚠️ No matching contacts found. Create a new contact below:
                </div>
                {!showContactForm && (
                  <button
                    onClick={() => setShowContactForm(true)}
                    style={buttonPrimaryStyle}
                  >
                    + Add New Contact
                  </button>
                )}
              </>
            )}
            
            {showContactForm && (
              <div style={{ marginTop: 16, padding: 16, background: "#f8fafc", borderRadius: 8 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 12 }}>
                  New Contact Information
                </h4>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Name *</label>
                    <input
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      placeholder="John Doe"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Title</label>
                    <input
                      value={newContactTitle}
                      onChange={(e) => setNewContactTitle(e.target.value)}
                      placeholder="Insurance Broker"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      type="email"
                      value={newContactEmail}
                      onChange={(e) => setNewContactEmail(e.target.value)}
                      placeholder="john@example.com"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      style={inputStyle}
                    />
                  </div>
                </div>
                
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button
                    onClick={handleCreateContact}
                    disabled={!newContactName}
                    style={{
                      ...buttonPrimaryStyle,
                      opacity: !newContactName ? 0.5 : 1,
                      cursor: !newContactName ? "not-allowed" : "pointer",
                    }}
                  >
                    Create Contact
                  </button>
                  <button
                    onClick={() => setShowContactForm(false)}
                    style={buttonSecondaryStyle}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Save Section */}
        {selectedAgencyId && selectedContactId && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 16 }}>
              💾 Save Submission
            </h3>
            
            {showSuccess ? (
              <div style={{ padding: 20, background: "#ecfdf5", borderRadius: 8, textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#059669", marginBottom: 4 }}>
                  Submission Saved!
                </div>
                <div style={{ fontSize: 13, color: "#047857" }}>
                  Redirecting to agency page...
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
                  All data will be saved and linked to the selected agency and contact.
                </div>
                
                <button
                  onClick={handleSaveSubmission}
                  disabled={isProcessing}
                  style={{
                    ...buttonPrimaryStyle,
                    width: "100%",
                    opacity: isProcessing ? 0.5 : 1,
                    cursor: isProcessing ? "not-allowed" : "pointer",
                  }}
                >
                  {isProcessing ? "Saving..." : "Save Submission & Go to Agency"}
                </button>
              </>
            )}
          </div>
        )}

        {/* Debug/Preview Section */}
        {extractedText && (
          <div style={cardStyle}>
            <details>
              <summary style={{ fontSize: 14, fontWeight: 600, color: "#111827", cursor: "pointer" }}>
                📄 Extracted Text Preview
              </summary>
              <div style={{ marginTop: 12, padding: 12, background: "#f8fafc", borderRadius: 8, fontSize: 12, fontFamily: "monospace", whiteSpace: "pre-wrap", maxHeight: 300, overflowY: "auto" }}>
                {extractedText}
              </div>
            </details>
          </div>
        )}
      </div>
    </WorkbenchLayout>
  );
};

export default DocumentScrubberPage;

