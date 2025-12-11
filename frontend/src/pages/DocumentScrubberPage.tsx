import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { WorkbenchLayout } from "../components/WorkbenchLayout";
import { cardStyle, primaryButtonStyle, secondaryButtonStyle, inputStyle, labelStyle, selectStyle } from "../ui/designSystem";

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
  
  // Field verification state
  const [editedFields, setEditedFields] = useState<ExtractedFields>({});
  const [verifiedFields, setVerifiedFields] = useState<Record<string, boolean>>({});
  const [showReviewForm, setShowReviewForm] = useState(false);
  
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
      
      console.log("Uploading file:", selectedFile.name);
      
      const response = await fetch("http://127.0.0.1:8000/submissions/upload", {
        method: "POST",
        body: formData,
      });
      
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("Upload error:", errorData);
        throw new Error(errorData?.detail || `Upload failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Upload successful:", data);
      console.log("DEBUG INFO:", data.debug_info);
      console.log("Extracted fields:", data.extracted_fields);
      console.log("Extracted fields keys:", Object.keys(data.extracted_fields || {}));
      console.log("Number of fields:", Object.keys(data.extracted_fields || {}).length);
      
      setExtractedText(data.extracted_text || "");
      setExtractedFields(data.extracted_fields || {});
      setEditedFields(data.extracted_fields || {});
      setAgencyMatches(data.agency_matches || []);
      
      // Initialize all fields as verified (checked) by default
      const initialVerified: Record<string, boolean> = {};
      Object.keys(data.extracted_fields || {}).forEach(key => {
        if (data.extracted_fields[key]) {
          initialVerified[key] = true; // Auto-check fields that have values
        }
      });
      setVerifiedFields(initialVerified);
      setShowReviewForm(true);
      
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

  const getVerifiedData = (): Partial<ExtractedFields> => {
    // Only include verified (checked) fields
    const verifiedData: Partial<ExtractedFields> = {};
    Object.keys(editedFields).forEach((key) => {
      if (verifiedFields[key]) {
        verifiedData[key as keyof ExtractedFields] = editedFields[key as keyof ExtractedFields];
      }
    });
    return verifiedData;
  };

  const handleExportCSV = () => {
    const verifiedData = getVerifiedData();
    
    // AS400 format - all fields in specific order
    const columns = [
      "effective_date", "expiration_date", "notes",
      "producer_name", "producer_code",
      "insured_name", "additional_insured_names",
      "mailing_address",
      "contact_name", "contact_phone", "contact_email",
      "location_street_number", "location_street_name", "location_suite",
      "location_city", "location_state", "location_zip",
      "building_limit", "deductible",
      "additional_limits_rents", "additional_limits_ordinance",
      "additional_limits_demolition", "additional_limits_eqsl",
      "additional_insured", "mortgagee", "loss_payee",
      "construction_type", "construction_year", "square_feet",
      "sprinkler_percent", "protection_class",
      "line_of_business"
    ];
    
    const headers = columns.join(",");
    const values = columns.map(col => {
      const val = verifiedData[col as keyof ExtractedFields] || "";
      // Escape commas and quotes for CSV
      return val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(",");
    
    const csvContent = `${headers}\n${values}`;
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `as400_upload_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportTXT = () => {
    const verifiedData = getVerifiedData();
    
    let txtContent = "UNDERWRITING SUBMISSION\n";
    txtContent += "=".repeat(50) + "\n\n";
    
    Object.keys(verifiedData).forEach((key) => {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const value = verifiedData[key as keyof ExtractedFields];
      txtContent += `${label}: ${value}\n`;
    });
    
    const blob = new Blob([txtContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `submission_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const verifiedData = getVerifiedData();
    
    const jsonContent = JSON.stringify(verifiedData, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `submission_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveSubmission = async () => {
    setIsProcessing(true);
    
    try {
      const verifiedData = getVerifiedData();
      
      const response = await fetch("http://127.0.0.1:8000/submissions/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...verifiedData,
          agency_id: selectedAgencyId,
          contact_id: selectedContactId,
          original_filename: selectedFile?.name,
          file_type: selectedFile?.type,
          extracted_text: extractedText,
          status: "reviewed",
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
              textAlign: "center" as const,
              background: "#f8fafc",
              cursor: "pointer" as const,
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
          
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            style={{
              ...primaryButtonStyle,
              opacity: !selectedFile || isUploading ? 0.5 : 1,
              cursor: !selectedFile || isUploading ? "not-allowed" : "pointer",
            }}
          >
            {isUploading ? "Processing..." : "Extract Data"}
          </button>
        </div>

        {/* Extraction Status */}
        {showReviewForm && Object.keys(editedFields).length > 0 && (
          <div style={cardStyle}>
            <div style={{ marginBottom: 16, padding: 12, background: "#f0f9ff", borderRadius: 8, border: "1px solid #0ea5e9" }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>📊 Extraction Status:</div>
              <div style={{ fontSize: 13 }}>
                Total fields returned: {Object.keys(editedFields).length}<br/>
                Fields with values: {Object.values(editedFields).filter(v => v && v.trim()).length}<br/>
                {Object.values(editedFields).filter(v => v && v.trim()).length === 0 && (
                  <div style={{ color: "#dc2626", marginTop: 8, fontWeight: 600 }}>
                    ⚠️ AI extracted text but found no specific fields. The document may not contain underwriting data, or the AI couldn't parse it.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Field Review & Verification Section */}
        {showReviewForm && Object.keys(editedFields).length > 0 && Object.values(editedFields).filter(v => v && v.trim()).length > 0 && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 16 }}>
              ✅ Review & Verify Extracted Fields
            </h3>
            
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
              Review the extracted data below. Check the boxes for fields you want to include in the AS400 upload. You can edit any field before checking it.
            </div>

            {/* Date Fields */}
            {(editedFields.effective_date || editedFields.expiration_date) && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 12, borderBottom: "2px solid #e5e7eb", paddingBottom: 6 }}>
                  📅 Dates
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {editedFields.effective_date && (
                    <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={verifiedFields.effective_date || false}
                        onChange={(e) => setVerifiedFields({ ...verifiedFields, effective_date: e.target.checked })}
                        style={{ marginTop: 10 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={labelStyle}>Effective Date</div>
                        <input
                          value={editedFields.effective_date}
                          onChange={(e) => setEditedFields({ ...editedFields, effective_date: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                    </label>
                  )}
                  {editedFields.expiration_date && (
                    <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={verifiedFields.expiration_date || false}
                        onChange={(e) => setVerifiedFields({ ...verifiedFields, expiration_date: e.target.checked })}
                        style={{ marginTop: 10 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={labelStyle}>Expiration Date</div>
                        <input
                          value={editedFields.expiration_date}
                          onChange={(e) => setEditedFields({ ...editedFields, expiration_date: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Producer/Agency Fields */}
            {(editedFields.producer_name || editedFields.producer_code || editedFields.insured_name) && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 12, borderBottom: "2px solid #e5e7eb", paddingBottom: 6 }}>
                  🏢 Producer & Insured
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {editedFields.producer_name && (
                    <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={verifiedFields.producer_name || false}
                        onChange={(e) => setVerifiedFields({ ...verifiedFields, producer_name: e.target.checked })}
                        style={{ marginTop: 10 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={labelStyle}>Producer Name</div>
                        <input
                          value={editedFields.producer_name}
                          onChange={(e) => setEditedFields({ ...editedFields, producer_name: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                    </label>
                  )}
                  {editedFields.producer_code && (
                    <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={verifiedFields.producer_code || false}
                        onChange={(e) => setVerifiedFields({ ...verifiedFields, producer_code: e.target.checked })}
                        style={{ marginTop: 10 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={labelStyle}>Producer Code</div>
                        <input
                          value={editedFields.producer_code}
                          onChange={(e) => setEditedFields({ ...editedFields, producer_code: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                    </label>
                  )}
                  {editedFields.insured_name && (
                    <label style={{ display: "flex", alignItems: "start", gap: 8, gridColumn: "1 / -1" }}>
                      <input
                        type="checkbox"
                        checked={verifiedFields.insured_name || false}
                        onChange={(e) => setVerifiedFields({ ...verifiedFields, insured_name: e.target.checked })}
                        style={{ marginTop: 10 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={labelStyle}>Insured Name</div>
                        <input
                          value={editedFields.insured_name}
                          onChange={(e) => setEditedFields({ ...editedFields, insured_name: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Contact Information */}
            {(editedFields.contact_name || editedFields.contact_phone || editedFields.contact_email) && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 12, borderBottom: "2px solid #e5e7eb", paddingBottom: 6 }}>
                  👤 Contact Information
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {editedFields.contact_name && (
                    <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={verifiedFields.contact_name || false}
                        onChange={(e) => setVerifiedFields({ ...verifiedFields, contact_name: e.target.checked })}
                        style={{ marginTop: 10 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={labelStyle}>Contact Name</div>
                        <input
                          value={editedFields.contact_name}
                          onChange={(e) => setEditedFields({ ...editedFields, contact_name: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                    </label>
                  )}
                  {editedFields.contact_phone && (
                    <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={verifiedFields.contact_phone || false}
                        onChange={(e) => setVerifiedFields({ ...verifiedFields, contact_phone: e.target.checked })}
                        style={{ marginTop: 10 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={labelStyle}>Phone</div>
                        <input
                          value={editedFields.contact_phone}
                          onChange={(e) => setEditedFields({ ...editedFields, contact_phone: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                    </label>
                  )}
                  {editedFields.contact_email && (
                    <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={verifiedFields.contact_email || false}
                        onChange={(e) => setVerifiedFields({ ...verifiedFields, contact_email: e.target.checked })}
                        style={{ marginTop: 10 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={labelStyle}>Email</div>
                        <input
                          value={editedFields.contact_email}
                          onChange={(e) => setEditedFields({ ...editedFields, contact_email: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Property Limits */}
            {(editedFields.building_limit || editedFields.deductible || editedFields.additional_limits_rents) && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 12, borderBottom: "2px solid #e5e7eb", paddingBottom: 6 }}>
                  💰 Limits & Coverages
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {editedFields.building_limit && (
                    <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={verifiedFields.building_limit || false}
                        onChange={(e) => setVerifiedFields({ ...verifiedFields, building_limit: e.target.checked })}
                        style={{ marginTop: 10 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={labelStyle}>Building Limit</div>
                        <input
                          value={editedFields.building_limit}
                          onChange={(e) => setEditedFields({ ...editedFields, building_limit: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                    </label>
                  )}
                  {editedFields.deductible && (
                    <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={verifiedFields.deductible || false}
                        onChange={(e) => setVerifiedFields({ ...verifiedFields, deductible: e.target.checked })}
                        style={{ marginTop: 10 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={labelStyle}>Deductible</div>
                        <input
                          value={editedFields.deductible}
                          onChange={(e) => setEditedFields({ ...editedFields, deductible: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                    </label>
                  )}
                  {editedFields.additional_limits_rents && (
                    <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={verifiedFields.additional_limits_rents || false}
                        onChange={(e) => setVerifiedFields({ ...verifiedFields, additional_limits_rents: e.target.checked })}
                        style={{ marginTop: 10 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={labelStyle}>Business Income / Rents</div>
                        <input
                          value={editedFields.additional_limits_rents}
                          onChange={(e) => setEditedFields({ ...editedFields, additional_limits_rents: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Property Details */}
            {(editedFields.construction_type || editedFields.construction_year || editedFields.square_feet) && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 12, borderBottom: "2px solid #e5e7eb", paddingBottom: 6 }}>
                  🏗️ Property Details
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {editedFields.construction_type && (
                    <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={verifiedFields.construction_type || false}
                        onChange={(e) => setVerifiedFields({ ...verifiedFields, construction_type: e.target.checked })}
                        style={{ marginTop: 10 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={labelStyle}>Construction Type</div>
                        <input
                          value={editedFields.construction_type}
                          onChange={(e) => setEditedFields({ ...editedFields, construction_type: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                    </label>
                  )}
                  {editedFields.construction_year && (
                    <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={verifiedFields.construction_year || false}
                        onChange={(e) => setVerifiedFields({ ...verifiedFields, construction_year: e.target.checked })}
                        style={{ marginTop: 10 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={labelStyle}>Year Built</div>
                        <input
                          value={editedFields.construction_year}
                          onChange={(e) => setEditedFields({ ...editedFields, construction_year: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                    </label>
                  )}
                  {editedFields.square_feet && (
                    <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={verifiedFields.square_feet || false}
                        onChange={(e) => setVerifiedFields({ ...verifiedFields, square_feet: e.target.checked })}
                        style={{ marginTop: 10 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={labelStyle}>Square Feet</div>
                        <input
                          value={editedFields.square_feet}
                          onChange={(e) => setEditedFields({ ...editedFields, square_feet: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Line of Business & Notes */}
            {(editedFields.line_of_business || editedFields.notes) && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 12, borderBottom: "2px solid #e5e7eb", paddingBottom: 6 }}>
                  📝 Additional Information
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                  {editedFields.line_of_business && (
                    <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={verifiedFields.line_of_business || false}
                        onChange={(e) => setVerifiedFields({ ...verifiedFields, line_of_business: e.target.checked })}
                        style={{ marginTop: 10 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={labelStyle}>Line of Business</div>
                        <input
                          value={editedFields.line_of_business}
                          onChange={(e) => setEditedFields({ ...editedFields, line_of_business: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                    </label>
                  )}
                  {editedFields.notes && (
                    <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={verifiedFields.notes || false}
                        onChange={(e) => setVerifiedFields({ ...verifiedFields, notes: e.target.checked })}
                        style={{ marginTop: 10 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={labelStyle}>Notes / Description</div>
                        <textarea
                          value={editedFields.notes}
                          onChange={(e) => setEditedFields({ ...editedFields, notes: e.target.value })}
                          style={{ ...inputStyle, minHeight: 80, resize: "vertical" as const }}
                        />
                      </div>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Show All Other Fields (Expandable) */}
            <details style={{ marginTop: 16, marginBottom: 16 }}>
              <summary style={{ fontSize: 14, fontWeight: 600, color: "#2563eb", cursor: "pointer", padding: "8px 0" }}>
                📋 Show All Extracted Fields ({Object.keys(editedFields).filter(k => editedFields[k as keyof ExtractedFields]).length} total)
              </summary>
              
              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {Object.keys(editedFields).map((key) => {
                  const value = editedFields[key as keyof ExtractedFields];
                  if (!value) return null;
                  
                  // Format the label
                  const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  
                  return (
                    <label key={key} style={{ display: "flex", alignItems: "start", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={verifiedFields[key] || false}
                        onChange={(e) => setVerifiedFields({ ...verifiedFields, [key]: e.target.checked })}
                        style={{ marginTop: 10 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={labelStyle}>{label}</div>
                        {key === 'notes' || key === 'mailing_address' || key === 'additional_insured' ? (
                          <textarea
                            value={value}
                            onChange={(e) => setEditedFields({ ...editedFields, [key]: e.target.value })}
                            style={{ ...inputStyle, minHeight: 60, resize: "vertical" as const }}
                          />
                        ) : (
                          <input
                            value={value}
                            onChange={(e) => setEditedFields({ ...editedFields, [key]: e.target.value })}
                            style={inputStyle}
                          />
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </details>

            <div style={{ padding: 12, background: "#eff6ff", borderRadius: 8, marginTop: 16 }}>
              <div style={{ fontSize: 12, color: "#1e40af", fontWeight: 500 }}>
                ✓ {Object.values(verifiedFields).filter(Boolean).length} of {Object.keys(editedFields).filter(k => editedFields[k as keyof ExtractedFields]).length} fields verified
              </div>
            </div>

            {/* Quick Export Section */}
            <div style={{ marginTop: 16, padding: 16, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 12 }}>
                📥 Export Verified Data
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
                Export only the fields you've checked above
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={handleExportCSV}
                  style={{
                    ...secondaryButtonStyle,
                    background: "#f0fdf4",
                    border: "1px solid #22c55e",
                    color: "#15803d",
                    fontWeight: 600,
                  }}
                >
                  📄 CSV (AS400)
                </button>
                <button
                  onClick={handleExportTXT}
                  style={{
                    ...secondaryButtonStyle,
                    background: "#fef3c7",
                    border: "1px solid #f59e0b",
                    color: "#92400e",
                    fontWeight: 600,
                  }}
                >
                  📝 TXT
                </button>
                <button
                  onClick={handleExportJSON}
                  style={{
                    ...secondaryButtonStyle,
                    background: "#ede9fe",
                    border: "1px solid #8b5cf6",
                    color: "#6b21a8",
                    fontWeight: 600,
                  }}
                >
                  🔗 JSON
                </button>
              </div>
            </div>
          </div>
        )}

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
                    ...secondaryButtonStyle,
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
                    style={primaryButtonStyle}
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
                      ...primaryButtonStyle,
                      opacity: !newContactName ? 0.5 : 1,
                      cursor: !newContactName ? "not-allowed" : "pointer",
                    }}
                  >
                    Create Contact
                  </button>
                  <button
                    onClick={() => setShowContactForm(false)}
                    style={secondaryButtonStyle}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Save to Database Section */}
        {selectedAgencyId && selectedContactId && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 16 }}>
              💾 Save to Database & Link to CRM
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
                  Save this submission to the database and link it to the selected agency and contact. This creates a permanent record in your CRM.
                </div>
                
                <button
                  onClick={handleSaveSubmission}
                  disabled={isProcessing}
                  style={{
                    ...primaryButtonStyle,
                    width: "100%",
                    opacity: isProcessing ? 0.5 : 1,
                    cursor: isProcessing ? "not-allowed" : "pointer",
                  }}
                >
                  {isProcessing ? "Saving..." : "💾 Save to Database & Go to Agency"}
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

