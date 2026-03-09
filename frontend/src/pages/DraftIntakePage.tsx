import React, { useState, useRef } from "react";
import { WorkbenchLayout } from "../components/WorkbenchLayout";
import { cardStyle, primaryButtonStyle, secondaryButtonStyle, inputStyle, labelStyle, selectStyle } from "../ui/designSystem";
import { API_BASE_URL, getAuthHeaders, apiGet, apiPost } from "../api/client";

// Product definitions - extensible for future products
interface ProductDefinition {
  code: string;
  name: string;
  description: string;
}

const PRODUCTS: ProductDefinition[] = [
  { code: "PBOP", name: "PBOP", description: "Property Building & Operations Policy" },
  { code: "PBP", name: "PBP", description: "Property Building Policy" },
  { code: "SLPCKG", name: "SLPCKG", description: "Specialty Package" },
  { code: "SLBLDG", name: "SLBLDG", description: "Specialty Building" },
  { code: "COC", name: "COC", description: "Commercial General Liability" },
  { code: "INLAND_MARINE", name: "Inland Marine", description: "Inland Marine Coverage" },
  { code: "BPP", name: "BPP", description: "Business Personal Property" },
];

interface Draft {
  id: number;
  product_code: string;
  product_version: string;
  status: "NEW" | "INGESTED" | "EXTRACTED" | "READY" | "SUBMITTED";
  created_at: string;
  updated_at?: string;
  extracted_data?: {
    extracted_data?: any;
    redaction_instructions?: Array<{
      source_id: number;
      text_to_redact: string;
      reason: string;
      start_position?: number;
      end_position?: number;
    }>;
  };
  sources?: Array<{
    id: number;
    source_type: string;
    filename?: string;
    extracted_text?: string;
    extraction_method?: string;
    page_count?: number;
    file_size?: number;
    processed_at?: string;
  }>;
}

interface LayerStatus {
  layer1_detection: "pending" | "complete" | "error";
  layer2_transcription: "pending" | "complete" | "skipped" | "error";
  layer3_extraction: "pending" | "complete" | "error";
  details?: string;
}

const DraftIntakePage: React.FC = () => {
  const [selectedProduct, setSelectedProduct] = useState<string>("PBOP");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [emailBody, setEmailBody] = useState<string>("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isIngesting, setIsIngesting] = useState<boolean>(false);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [layerStatuses, setLayerStatuses] = useState<Map<number, LayerStatus>>(new Map());
  
  // Field review/edit state (similar to DocumentScrubber)
  const [editedFields, setEditedFields] = useState<any>(null);
  const [verifiedFields, setVerifiedFields] = useState<Record<string, boolean>>({});
  const [showFieldReview, setShowFieldReview] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Get selected product info
  const selectedProductInfo = PRODUCTS.find(p => p.code === selectedProduct) || PRODUCTS[0];

  // Calculate layer statuses from sources
  React.useEffect(() => {
    if (draft?.sources) {
      const statusMap = new Map<number, LayerStatus>();
      
      draft.sources.forEach((source) => {
        const status: LayerStatus = {
          layer1_detection: "complete", // Always complete once source exists
          layer2_transcription: source.extraction_method === "vision" ? "complete" : 
                               source.extraction_method === "text" ? "skipped" : "pending",
          layer3_extraction: draft.status === "EXTRACTED" ? "complete" : "pending",
        };
        
        if (source.extraction_method) {
          status.details = `Method: ${source.extraction_method}`;
          if (source.page_count) {
            status.details += ` | Pages: ${source.page_count}`;
          }
        }
        
        statusMap.set(source.id, status);
      });
      
      setLayerStatuses(statusMap);
    }
  }, [draft]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...files]);
    }
  };

  // Handle drag and drop (supports both files and email content)
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const dt = e.dataTransfer;
    const newFiles: File[] = [];
    let emailContentFound = false;
    
    // Helper function to check if a file is already in the attachments list
    const isFileDuplicate = (file: File, existingFiles: File[]): boolean => {
      return existingFiles.some(
        (existing) =>
          existing.name === file.name &&
          existing.size === file.size &&
          existing.lastModified === file.lastModified
      );
    };
    
    // Process items first (more comprehensive - handles both files and email content)
    if (dt.items) {
      const items = Array.from(dt.items);
      for (const item of items) {
        // Check if it's a file
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file && !isFileDuplicate(file, attachments)) {
            newFiles.push(file);
          }
        }
        // Check if it's text/email content
        else if (item.kind === 'string') {
          if (item.type === 'text/html' || item.type === 'text/plain') {
            item.getAsString((str) => {
              if (str && !emailContentFound) {
                emailContentFound = true;
                // Extract plain text from HTML if needed
                let text = str;
                if (str.includes('<')) {
                  const tempDiv = document.createElement('div');
                  tempDiv.innerHTML = str;
                  text = tempDiv.textContent || tempDiv.innerText || str;
                }
                
                // Set email body if not already set
                if (!emailBody.trim()) {
                  setEmailBody(text);
                  setStatus("✅ Email content extracted from drag");
                } else {
                  // Append to existing email body
                  setEmailBody(prev => prev + "\n\n--- Additional content from drag ---\n\n" + text);
                  setStatus("✅ Additional email content added");
                }
              }
            });
          }
        }
      }
    }
    
    // Only process dt.files if items didn't already handle files (to avoid duplicates)
    // Some browsers/cases might only have dt.files, so we check if we already found files
    if (dt.files && dt.files.length > 0 && newFiles.length === 0) {
      const files = Array.from(dt.files);
      for (const file of files) {
        if (!isFileDuplicate(file, attachments)) {
          newFiles.push(file);
        }
      }
    }
    
    // Also check for email content via types (fallback if items didn't work)
    if (!emailContentFound && (dt.types.includes('text/html') || dt.types.includes('text/plain'))) {
      try {
        let emailContent = '';
        if (dt.types.includes('text/html')) {
          emailContent = dt.getData('text/html');
        } else if (dt.types.includes('text/plain')) {
          emailContent = dt.getData('text/plain');
        }
        
        if (emailContent) {
          // Extract plain text from HTML if needed
          if (emailContent.includes('<')) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = emailContent;
            emailContent = tempDiv.textContent || tempDiv.innerText || emailContent;
          }
          
          // Set email body if not already set
          if (!emailBody.trim()) {
            setEmailBody(emailContent);
            setStatus("✅ Email content extracted from drag");
          } else {
            setEmailBody(prev => prev + "\n\n--- Additional content from drag ---\n\n" + emailContent);
            setStatus("✅ Additional email content added");
          }
        }
      } catch (err) {
        console.error("Error extracting email content:", err);
        setError("Failed to extract email content from drag");
      }
    }
    
    // Add new files (deduplicated)
    if (newFiles.length > 0) {
      setAttachments((prev) => [...prev, ...newFiles]);
      setStatus(`✅ ${newFiles.length} file(s) added from drag`);
    }
    
    if (dropZoneRef.current) {
      dropZoneRef.current.style.borderColor = "#cbd5e1";
      dropZoneRef.current.style.backgroundColor = "#f8fafc";
    }
  };


  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current) {
      dropZoneRef.current.style.borderColor = "#cbd5e1";
      dropZoneRef.current.style.backgroundColor = "#f8fafc";
    }
  };

  // Enhanced drag over to show email support
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if dragging email content
    const dt = e.dataTransfer;
    const isEmail = dt.types.includes('text/html') || dt.types.includes('text/plain') || 
                    (dt.items && Array.from(dt.items).some(item => 
                      item.kind === 'string' && (item.type === 'text/html' || item.type === 'text/plain')
                    ));
    
    if (dropZoneRef.current) {
      if (isEmail) {
        dropZoneRef.current.style.borderColor = "#10b981";
        dropZoneRef.current.style.backgroundColor = "#ecfdf5";
        dropZoneRef.current.style.borderStyle = "dashed";
        dropZoneRef.current.style.borderWidth = "3px";
      } else {
        dropZoneRef.current.style.borderColor = "#3b82f6";
        dropZoneRef.current.style.backgroundColor = "#eff6ff";
        dropZoneRef.current.style.borderStyle = "dashed";
        dropZoneRef.current.style.borderWidth = "2px";
      }
    }
  };

  // Create draft
  const handleCreateDraft = async () => {
    try {
      setLoading(true);
      setError(null);
      setStatus("Creating draft...");
      
      const formData = new FormData();
      formData.append("product_code", selectedProduct);
      formData.append("product_version", "v1");
      
      const response = await apiPost<Draft, FormData>("/drafts", formData);
      setDraft(response);
      setStatus(`✅ Draft created: ID ${response.id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create draft");
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  // Ingest email and attachments
  const handleIngest = async () => {
    if (!draft) {
      setError("Please create a draft first");
      return;
    }
    
    if (!emailBody.trim() && attachments.length === 0) {
      setError("Please provide email body or attachments");
      return;
    }
    
    try {
      setIsIngesting(true);
      setError(null);
      setStatus("🔄 Processing through 3-layer pipeline...");
      
      const formData = new FormData();
      if (emailBody.trim()) {
        formData.append("email_body", emailBody);
      }
      attachments.forEach((file) => {
        formData.append("attachments", file);
      });
      
      const response = await apiPost(`/drafts/${draft.id}/ingest`, formData);
      setStatus(`✅ Ingested ${response.total_sources} source(s) through Layer 1 & 2 pipeline`);
      
      // Refresh draft to get sources with layer information
      const updated = await apiGet<Draft>(`/drafts/${draft.id}`);
      setDraft(updated);
      
      // Clear attachments after successful ingestion
      setAttachments([]);
    } catch (err: any) {
      setError(err?.message || "Failed to ingest");
      setStatus("");
    } finally {
      setIsIngesting(false);
    }
  };

  // Extract data (Layer 3)
  const handleExtract = async () => {
    if (!draft || draft.status !== "INGESTED") {
      setError("Draft must be ingested first (Layer 1 & 2 must complete)");
      return;
    }
    
    try {
      setIsExtracting(true);
      setError(null);
      setStatus("🔄 Layer 3: Extracting structured data with AI...");
      
      const response = await apiPost(`/drafts/${draft.id}/extract`, {});
      setStatus("✅ Layer 3 complete: Data extracted and redaction candidates identified");
      
      // Refresh draft
      const updated = await apiGet<Draft>(`/drafts/${draft.id}`);
      setDraft(updated);
      
      // Initialize field editing state
      const extractedData = updated.extracted_data?.extracted_data || updated.extracted_data;
      if (extractedData) {
        setEditedFields(JSON.parse(JSON.stringify(extractedData))); // Deep copy
        setShowFieldReview(true);
        
        // Auto-verify fields that have values
        const initialVerified: Record<string, boolean> = {};
        const verifyFieldsRecursive = (obj: any, path: string = "") => {
          if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
            Object.keys(obj).forEach(key => {
              const fullPath = path ? `${path}.${key}` : key;
              const value = obj[key];
              if (value !== null && value !== undefined && value !== "" && 
                  (typeof value !== 'object' || (Array.isArray(value) && value.length > 0) || 
                   (typeof value === 'object' && Object.keys(value).length > 0))) {
                initialVerified[fullPath] = true;
              }
              if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
                verifyFieldsRecursive(value, fullPath);
              }
            });
          } else if (Array.isArray(obj)) {
            obj.forEach((item, idx) => {
              if (item && typeof item === 'object') {
                verifyFieldsRecursive(item, `${path}[${idx}]`);
              }
            });
          }
        };
        verifyFieldsRecursive(extractedData);
        setVerifiedFields(initialVerified);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to extract");
      setStatus("");
    } finally {
      setIsExtracting(false);
    }
  };

  // Reset everything and start over
  const handleReset = () => {
    if (confirm("Are you sure you want to reset? This will clear all draft data, files, and extracted information.")) {
      // Clear all state
      setDraft(null);
      setEmailBody("");
      setAttachments([]);
      setEditedFields(null);
      setVerifiedFields({});
      setShowFieldReview(false);
      setError(null);
      setStatus("");
      setIsIngesting(false);
      setIsExtracting(false);
      setLoading(false);
      setLayerStatuses(new Map());
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Accept and submit
  const handleAccept = async () => {
    if (!draft || !draft.extracted_data) {
      setError("No extracted data to submit");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setStatus("Submitting to AS400...");
      
      // Use editedFields if available, otherwise fall back to extracted_data
      const finalData = editedFields || (draft.extracted_data.extracted_data || draft.extracted_data);
      const response = await apiPost("/as400/submit", {
        payload: finalData,
        draft_id: draft.id,
      });
      
      setStatus(`✅ Submitted successfully! Outbox ID: ${response.outbox_id}`);
      
      // Update draft status
      const updated = await apiGet<Draft>(`/drafts/${draft.id}`);
      setDraft(updated);
    } catch (err: any) {
      setError(err?.message || "Failed to submit");
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "NEW": return "#6b7280";
      case "INGESTED": return "#3b82f6";
      case "EXTRACTED": return "#10b981";
      case "READY": return "#059669";
      case "SUBMITTED": return "#059669";
      default: return "#6b7280";
    }
  };

  return (
    <WorkbenchLayout
      title="Underwriter Workbench - Draft Intake"
      subtitle="Schema-driven submission intake with 3-layer processing pipeline"
      rightNote={
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            {draft ? `Draft ID: ${draft.id} | Status: ${draft.status}` : "No draft created"}
          </div>
          <button
            onClick={handleReset}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.3)",
              background: "transparent",
              color: "#fff",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
            }}
            title="Reset and start over"
          >
            ↻ Reset
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        
        {/* Product Selection & Draft Creation */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 16 }}>
            📋 Product Selection
          </h3>
          
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 250 }}>
              <label style={labelStyle}>Select Product</label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                disabled={!!draft}
                style={{
                  ...selectStyle,
                  minWidth: 250,
                }}
              >
                {PRODUCTS.map((product) => (
                  <option key={product.code} value={product.code}>
                    {product.name} - {product.description}
                  </option>
                ))}
              </select>
              {selectedProductInfo && (
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  {selectedProductInfo.description}
                </div>
              )}
            </div>
            
            {!draft && (
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button
                  onClick={handleCreateDraft}
                  disabled={loading}
                  style={{
                    ...primaryButtonStyle,
                    opacity: loading ? 0.5 : 1,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "Creating..." : "Create Draft"}
                </button>
              </div>
            )}
            
            {draft && (
              <div style={{ 
                padding: "12px 16px", 
                background: "#f0f9ff", 
                borderRadius: 8,
                border: `1px solid ${getStatusColor(draft.status)}`,
                minWidth: 200,
              }}>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                  Draft Status
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: getStatusColor(draft.status) }}>
                  Draft #{draft.id} - {draft.status}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  Product: {draft.product_code} v{draft.product_version}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Email & Attachments Input */}
        {draft && draft.status === "NEW" && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 16 }}>
              📧 Email & Document Intake
            </h3>
            
            {/* Email Body */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Email Body Text</label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Paste email body text here... (optional)"
                style={{
                  ...inputStyle,
                  minHeight: 120,
                  fontFamily: "monospace",
                  resize: "vertical" as const,
                }}
              />
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                Email body will be processed as a text source
              </div>
            </div>

            {/* File Upload Dropzone */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Document Attachments</label>
              <div
                ref={dropZoneRef}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: "2px dashed #cbd5e1",
                  borderRadius: 12,
                  padding: 40,
                  textAlign: "center" as const,
                  cursor: "pointer",
                  background: "#f8fafc",
                  transition: "all 0.2s",
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.xlsx,.xls,.txt,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />
                <div style={{ fontSize: 48, marginBottom: 8 }}>📎</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                  Drag & drop files here or click to select
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  Supported: PDF, DOCX, Excel, Images, TXT, Email (drag email from your email client)
                </div>
              </div>
            </div>

            {/* Attachments List */}
            {attachments.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>
                  Selected Files ({attachments.length}):
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        background: "#f9fafb",
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>
                          {file.name}
                        </div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>
                          {formatFileSize(file.size)} • {file.type || "Unknown type"}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAttachment(index);
                        }}
                        style={{
                          ...secondaryButtonStyle,
                          background: "#fef2f2",
                          border: "1px solid #fca5a5",
                          color: "#dc2626",
                          padding: "4px 10px",
                          fontSize: 11,
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ingest Button */}
            <div style={{ marginTop: 20 }}>
              <button
                onClick={handleIngest}
                disabled={isIngesting || (!emailBody.trim() && attachments.length === 0)}
                style={{
                  ...primaryButtonStyle,
                  width: "100%",
                  opacity: (isIngesting || (!emailBody.trim() && attachments.length === 0)) ? 0.5 : 1,
                  cursor: (isIngesting || (!emailBody.trim() && attachments.length === 0)) ? "not-allowed" : "pointer",
                  background: "#10b981",
                  border: "1px solid #10b981",
                }}
              >
                {isIngesting ? "🔄 Processing Layers 1 & 2..." : "▶️ Ingest & Process (Layers 1 & 2)"}
              </button>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8, textAlign: "center" }}>
                Layer 1: Detection (no AI) • Layer 2: Transcription (Vision if needed)
              </div>
            </div>
          </div>
        )}

        {/* 3-Layer Pipeline Status */}
        {draft && draft.sources && draft.sources.length > 0 && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 16 }}>
              🔄 3-Layer Processing Pipeline Status
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {draft.sources.map((source) => {
                const status = layerStatuses.get(source.id) || {
                  layer1_detection: "pending",
                  layer2_transcription: "pending",
                  layer3_extraction: "pending",
                };

                return (
                  <div
                    key={source.id}
                    style={{
                      padding: 16,
                      background: "#f9fafb",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    {/* Source Header */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                            {source.filename || `Source #${source.id}`}
                          </div>
                          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                            {source.source_type.toUpperCase()}
                            {source.page_count && ` • ${source.page_count} page${source.page_count > 1 ? "s" : ""}`}
                            {source.file_size && ` • ${formatFileSize(source.file_size)}`}
                          </div>
                        </div>
                        {status.details && (
                          <div style={{ fontSize: 11, color: "#6b7280", textAlign: "right" }}>
                            {status.details}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Layer Status Bars */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {/* Layer 1 */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ minWidth: 140, fontSize: 12, fontWeight: 500, color: "#6b7280" }}>
                          Layer 1: Detection
                        </div>
                        <div style={{ flex: 1, height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
                          <div
                            style={{
                              width: status.layer1_detection === "complete" ? "100%" : "0%",
                              height: "100%",
                              background: status.layer1_detection === "complete" ? "#10b981" : "#e5e7eb",
                              transition: "width 0.3s",
                            }}
                          />
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: status.layer1_detection === "complete" ? "#10b981" : "#6b7280", minWidth: 60 }}>
                          {status.layer1_detection === "complete" ? "✓ Complete" : "Pending"}
                        </div>
                      </div>

                      {/* Layer 2 */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ minWidth: 140, fontSize: 12, fontWeight: 500, color: "#6b7280" }}>
                          Layer 2: Transcription
                        </div>
                        <div style={{ flex: 1, height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
                          <div
                            style={{
                              width: status.layer2_transcription === "complete" ? "100%" : 
                                     status.layer2_transcription === "skipped" ? "100%" : "0%",
                              height: "100%",
                              background: status.layer2_transcription === "complete" ? "#3b82f6" :
                                        status.layer2_transcription === "skipped" ? "#94a3b8" : "#e5e7eb",
                              transition: "width 0.3s",
                            }}
                          />
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, 
                          color: status.layer2_transcription === "complete" ? "#3b82f6" :
                                status.layer2_transcription === "skipped" ? "#94a3b8" : "#6b7280",
                          minWidth: 60 }}>
                          {status.layer2_transcription === "complete" ? "✓ Complete" :
                           status.layer2_transcription === "skipped" ? "⊘ Skipped" : "Pending"}
                        </div>
                      </div>

                      {/* Layer 3 */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ minWidth: 140, fontSize: 12, fontWeight: 500, color: "#6b7280" }}>
                          Layer 3: Extraction
                        </div>
                        <div style={{ flex: 1, height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
                          <div
                            style={{
                              width: status.layer3_extraction === "complete" ? "100%" : "0%",
                              height: "100%",
                              background: status.layer3_extraction === "complete" ? "#8b5cf6" : "#e5e7eb",
                              transition: "width 0.3s",
                            }}
                          />
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: status.layer3_extraction === "complete" ? "#8b5cf6" : "#6b7280", minWidth: 60 }}>
                          {status.layer3_extraction === "complete" ? "✓ Complete" : "Pending"}
                        </div>
                      </div>
                    </div>

                    {/* Extracted Text Preview (Collapsible) */}
                    {source.extracted_text && (
                      <details style={{ marginTop: 12 }}>
                        <summary style={{ fontSize: 12, fontWeight: 600, color: "#3b82f6", cursor: "pointer" }}>
                          📄 View Extracted Text ({source.extracted_text.length} chars)
                        </summary>
                        <div style={{ 
                          marginTop: 8, 
                          padding: 12, 
                          background: "#f8fafc", 
                          borderRadius: 6, 
                          fontSize: 11, 
                          fontFamily: "monospace", 
                          whiteSpace: "pre-wrap", 
                          maxHeight: 200, 
                          overflow: "auto",
                          border: "1px solid #e5e7eb",
                        }}>
                          {source.extracted_text.substring(0, 1000)}
                          {source.extracted_text.length > 1000 && "... (truncated)"}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Layer 3 Extraction Action */}
        {draft && draft.status === "INGESTED" && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 12 }}>
              🔍 Layer 3: Schema-Driven Extraction
            </h3>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
              Extract structured data from ingested sources using {selectedProductInfo.name} schema.
              This will identify all required fields and redaction candidates (PII).
            </div>
            <button
              onClick={handleExtract}
              disabled={isExtracting}
              style={{
                ...primaryButtonStyle,
                width: "100%",
                opacity: isExtracting ? 0.5 : 1,
                cursor: isExtracting ? "not-allowed" : "pointer",
                background: "#8b5cf6",
                border: "1px solid #8b5cf6",
              }}
            >
              {isExtracting ? "🔄 Extracting..." : "▶️ Extract Data (Layer 3)"}
            </button>
          </div>
        )}

        {/* Extracted Data Review */}
        {draft && draft.extracted_data && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 16 }}>
              ✅ Extracted Data Review
            </h3>
            
            {/* Redaction Instructions */}
            {draft.extracted_data.redaction_instructions && 
             draft.extracted_data.redaction_instructions.length > 0 && (
              <div style={{ marginBottom: 20, padding: 12, background: "#fef3c7", borderRadius: 8, border: "1px solid #fbbf24" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e", marginBottom: 8 }}>
                  ⚠️ Redaction Candidates Identified
                </div>
                <div style={{ fontSize: 12, color: "#78350f" }}>
                  {draft.extracted_data.redaction_instructions.length} PII item(s) identified for redaction:
                </div>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                  {draft.extracted_data.redaction_instructions.slice(0, 5).map((redaction, idx) => (
                    <div key={idx} style={{ fontSize: 11, color: "#78350f" }}>
                      • Source {redaction.source_id}: "{redaction.text_to_redact.substring(0, 40)}..." ({redaction.reason})
                    </div>
                  ))}
                  {draft.extracted_data.redaction_instructions.length > 5 && (
                    <div style={{ fontSize: 11, color: "#78350f", fontStyle: "italic" }}>
                      ... and {draft.extracted_data.redaction_instructions.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Field Review & Edit UI */}
            {editedFields && showFieldReview ? (
              <div>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
                  Review and verify the extracted fields below. Check the boxes for fields you want to include in the final submission. You can edit any field before checking it.
                </div>

                {/* Policy Section */}
                {editedFields.policy && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 12, borderBottom: "2px solid #e5e7eb", paddingBottom: 6 }}>
                      📋 Policy Information
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                      <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={verifiedFields["policy.company_number"] || false}
                          onChange={(e) => setVerifiedFields({ ...verifiedFields, "policy.company_number": e.target.checked })}
                          style={{ marginTop: 10 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={labelStyle}>Company Number</div>
                          <input
                            value={editedFields.policy?.company_number || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, policy: { ...editedFields.policy, company_number: e.target.value } })}
                            style={inputStyle}
                            placeholder="105"
                          />
                        </div>
                      </label>
                      <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={verifiedFields["policy.producer_number"] || false}
                          onChange={(e) => setVerifiedFields({ ...verifiedFields, "policy.producer_number": e.target.checked })}
                          style={{ marginTop: 10 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={labelStyle}>Producer Number</div>
                          <input
                            value={editedFields.policy?.producer_number || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, policy: { ...editedFields.policy, producer_number: e.target.value } })}
                            style={inputStyle}
                            placeholder="010233"
                          />
                        </div>
                      </label>
                      <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={verifiedFields["policy.key_name"] || false}
                          onChange={(e) => setVerifiedFields({ ...verifiedFields, "policy.key_name": e.target.checked })}
                          style={{ marginTop: 10 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={labelStyle}>Key Name (max 15 chars)</div>
                          <input
                            value={editedFields.policy?.key_name || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, policy: { ...editedFields.policy, key_name: e.target.value.substring(0, 15) } })}
                            style={inputStyle}
                            placeholder="Last, First"
                            maxLength={15}
                          />
                        </div>
                      </label>
                      <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={verifiedFields["policy.inception_date"] || false}
                          onChange={(e) => setVerifiedFields({ ...verifiedFields, "policy.inception_date": e.target.checked })}
                          style={{ marginTop: 10 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={labelStyle}>Inception Date</div>
                          <input
                            value={editedFields.policy?.inception_date || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, policy: { ...editedFields.policy, inception_date: e.target.value } })}
                            style={inputStyle}
                            placeholder="MM/DD/YY"
                          />
                        </div>
                      </label>
                      <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={verifiedFields["policy.expiration_date"] || false}
                          onChange={(e) => setVerifiedFields({ ...verifiedFields, "policy.expiration_date": e.target.checked })}
                          style={{ marginTop: 10 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={labelStyle}>Expiration Date</div>
                          <input
                            value={editedFields.policy?.expiration_date || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, policy: { ...editedFields.policy, expiration_date: e.target.value } })}
                            style={inputStyle}
                            placeholder="MM/DD/YY"
                          />
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Agency Section */}
                {editedFields.agency && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 12, borderBottom: "2px solid #e5e7eb", paddingBottom: 6 }}>
                      🏢 Agency Information
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <label style={{ display: "flex", alignItems: "start", gap: 8, gridColumn: "1 / -1" }}>
                        <input
                          type="checkbox"
                          checked={verifiedFields["agency.agency_name"] || false}
                          onChange={(e) => setVerifiedFields({ ...verifiedFields, "agency.agency_name": e.target.checked })}
                          style={{ marginTop: 10 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={labelStyle}>Agency Name</div>
                          <input
                            value={editedFields.agency?.agency_name || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, agency: { ...editedFields.agency, agency_name: e.target.value } })}
                            style={inputStyle}
                          />
                        </div>
                      </label>
                      <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={verifiedFields["agency.contact_name"] || false}
                          onChange={(e) => setVerifiedFields({ ...verifiedFields, "agency.contact_name": e.target.checked })}
                          style={{ marginTop: 10 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={labelStyle}>Contact Name</div>
                          <input
                            value={editedFields.agency?.contact_name || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, agency: { ...editedFields.agency, contact_name: e.target.value } })}
                            style={inputStyle}
                          />
                        </div>
                      </label>
                      <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={verifiedFields["agency.contact_email"] || false}
                          onChange={(e) => setVerifiedFields({ ...verifiedFields, "agency.contact_email": e.target.checked })}
                          style={{ marginTop: 10 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={labelStyle}>Contact Email</div>
                          <input
                            type="email"
                            value={editedFields.agency?.contact_email || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, agency: { ...editedFields.agency, contact_email: e.target.value } })}
                            style={inputStyle}
                          />
                        </div>
                      </label>
                      <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={verifiedFields["agency.contact_phone"] || false}
                          onChange={(e) => setVerifiedFields({ ...verifiedFields, "agency.contact_phone": e.target.checked })}
                          style={{ marginTop: 10 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={labelStyle}>Contact Phone</div>
                          <input
                            value={editedFields.agency?.contact_phone || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, agency: { ...editedFields.agency, contact_phone: e.target.value } })}
                            style={inputStyle}
                          />
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Insured Section */}
                {editedFields.insured && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 12, borderBottom: "2px solid #e5e7eb", paddingBottom: 6 }}>
                      👤 Insured Information
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <label style={{ display: "flex", alignItems: "start", gap: 8, gridColumn: "1 / -1" }}>
                        <input
                          type="checkbox"
                          checked={verifiedFields["insured.full_name"] || false}
                          onChange={(e) => setVerifiedFields({ ...verifiedFields, "insured.full_name": e.target.checked })}
                          style={{ marginTop: 10 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={labelStyle}>Full Name</div>
                          <input
                            value={editedFields.insured?.full_name || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, insured: { ...editedFields.insured, full_name: e.target.value } })}
                            style={inputStyle}
                          />
                        </div>
                      </label>
                      <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={verifiedFields["insured.care_of"] || false}
                          onChange={(e) => setVerifiedFields({ ...verifiedFields, "insured.care_of": e.target.checked })}
                          style={{ marginTop: 10 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={labelStyle}>C/O (Care Of)</div>
                          <input
                            value={editedFields.insured?.care_of || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, insured: { ...editedFields.insured, care_of: e.target.value } })}
                            style={inputStyle}
                            placeholder="Care of name"
                          />
                        </div>
                      </label>
                      <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={verifiedFields["insured.street"] || false}
                          onChange={(e) => setVerifiedFields({ ...verifiedFields, "insured.street": e.target.checked })}
                          style={{ marginTop: 10 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={labelStyle}>Street Address</div>
                          <input
                            value={editedFields.insured?.street || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, insured: { ...editedFields.insured, street: e.target.value } })}
                            style={inputStyle}
                          />
                        </div>
                      </label>
                      <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={verifiedFields["insured.city"] || false}
                          onChange={(e) => setVerifiedFields({ ...verifiedFields, "insured.city": e.target.checked })}
                          style={{ marginTop: 10 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={labelStyle}>City</div>
                          <input
                            value={editedFields.insured?.city || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, insured: { ...editedFields.insured, city: e.target.value } })}
                            style={inputStyle}
                          />
                        </div>
                      </label>
                      <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={verifiedFields["insured.state"] || false}
                          onChange={(e) => setVerifiedFields({ ...verifiedFields, "insured.state": e.target.checked })}
                          style={{ marginTop: 10 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={labelStyle}>State</div>
                          <input
                            value={editedFields.insured?.state || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, insured: { ...editedFields.insured, state: e.target.value } })}
                            style={inputStyle}
                            placeholder="CA"
                            maxLength={2}
                          />
                        </div>
                      </label>
                      <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={verifiedFields["insured.zip"] || false}
                          onChange={(e) => setVerifiedFields({ ...verifiedFields, "insured.zip": e.target.checked })}
                          style={{ marginTop: 10 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={labelStyle}>ZIP Code</div>
                          <input
                            value={editedFields.insured?.zip || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, insured: { ...editedFields.insured, zip: e.target.value } })}
                            style={inputStyle}
                            placeholder="12345"
                          />
                        </div>
                      </label>
                      <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={verifiedFields["insured.phone"] || false}
                          onChange={(e) => setVerifiedFields({ ...verifiedFields, "insured.phone": e.target.checked })}
                          style={{ marginTop: 10 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={labelStyle}>Phone</div>
                          <input
                            value={editedFields.insured?.phone || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, insured: { ...editedFields.insured, phone: e.target.value } })}
                            style={inputStyle}
                          />
                        </div>
                      </label>
                      <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={verifiedFields["insured.email"] || false}
                          onChange={(e) => setVerifiedFields({ ...verifiedFields, "insured.email": e.target.checked })}
                          style={{ marginTop: 10 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={labelStyle}>Email</div>
                          <input
                            type="email"
                            value={editedFields.insured?.email || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, insured: { ...editedFields.insured, email: e.target.value } })}
                            style={inputStyle}
                          />
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Locations Section */}
                {editedFields.locations && Array.isArray(editedFields.locations) && editedFields.locations.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 12, borderBottom: "2px solid #e5e7eb", paddingBottom: 6 }}>
                      📍 Property Locations ({editedFields.locations.length})
                    </div>
                    {editedFields.locations.map((location: any, locIdx: number) => (
                      <div key={locIdx} style={{ marginBottom: 16, padding: 16, background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 12 }}>
                          Location {locIdx + 1}
                        </div>

                        {/* Address */}
                        {location.address && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>Address</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr 1fr 1fr", gap: 8 }}>
                              <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={verifiedFields[`locations[${locIdx}].address.street_number`] || false}
                                  onChange={(e) => setVerifiedFields({ ...verifiedFields, [`locations[${locIdx}].address.street_number`]: e.target.checked })}
                                  style={{ marginTop: 10 }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ ...labelStyle, fontSize: 10 }}>Number</div>
                                  <input
                                    value={location.address.street_number || ""}
                                    onChange={(e) => {
                                      const newLocations = [...editedFields.locations];
                                      newLocations[locIdx] = {
                                        ...newLocations[locIdx],
                                        address: { ...newLocations[locIdx].address, street_number: e.target.value }
                                      };
                                      setEditedFields({ ...editedFields, locations: newLocations });
                                    }}
                                    style={{ ...inputStyle, fontSize: 12 }}
                                  />
                                </div>
                              </label>
                              <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={verifiedFields[`locations[${locIdx}].address.street_name`] || false}
                                  onChange={(e) => setVerifiedFields({ ...verifiedFields, [`locations[${locIdx}].address.street_name`]: e.target.checked })}
                                  style={{ marginTop: 10 }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ ...labelStyle, fontSize: 10 }}>Street Name</div>
                                  <input
                                    value={location.address.street_name || ""}
                                    onChange={(e) => {
                                      const newLocations = [...editedFields.locations];
                                      newLocations[locIdx] = {
                                        ...newLocations[locIdx],
                                        address: { ...newLocations[locIdx].address, street_name: e.target.value }
                                      };
                                      setEditedFields({ ...editedFields, locations: newLocations });
                                    }}
                                    style={{ ...inputStyle, fontSize: 12 }}
                                  />
                                </div>
                              </label>
                              <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={verifiedFields[`locations[${locIdx}].address.suite`] || false}
                                  onChange={(e) => setVerifiedFields({ ...verifiedFields, [`locations[${locIdx}].address.suite`]: e.target.checked })}
                                  style={{ marginTop: 10 }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ ...labelStyle, fontSize: 10 }}>Suite</div>
                                  <input
                                    value={location.address?.suite || ""}
                                    onChange={(e) => {
                                      const newLocations = [...editedFields.locations];
                                      newLocations[locIdx] = {
                                        ...newLocations[locIdx],
                                        address: { ...newLocations[locIdx].address, suite: e.target.value }
                                      };
                                      setEditedFields({ ...editedFields, locations: newLocations });
                                    }}
                                    style={{ ...inputStyle, fontSize: 12 }}
                                    placeholder="Suite 200"
                                  />
                                </div>
                              </label>
                              <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={verifiedFields[`locations[${locIdx}].address.city`] || false}
                                  onChange={(e) => setVerifiedFields({ ...verifiedFields, [`locations[${locIdx}].address.city`]: e.target.checked })}
                                  style={{ marginTop: 10 }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ ...labelStyle, fontSize: 10 }}>City</div>
                                  <input
                                    value={location.address.city || ""}
                                    onChange={(e) => {
                                      const newLocations = [...editedFields.locations];
                                      newLocations[locIdx] = {
                                        ...newLocations[locIdx],
                                        address: { ...newLocations[locIdx].address, city: e.target.value }
                                      };
                                      setEditedFields({ ...editedFields, locations: newLocations });
                                    }}
                                    style={{ ...inputStyle, fontSize: 12 }}
                                  />
                                </div>
                              </label>
                              <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={verifiedFields[`locations[${locIdx}].address.state`] || false}
                                  onChange={(e) => setVerifiedFields({ ...verifiedFields, [`locations[${locIdx}].address.state`]: e.target.checked })}
                                  style={{ marginTop: 10 }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ ...labelStyle, fontSize: 10 }}>State</div>
                                  <input
                                    value={location.address.state || ""}
                                    onChange={(e) => {
                                      const newLocations = [...editedFields.locations];
                                      newLocations[locIdx] = {
                                        ...newLocations[locIdx],
                                        address: { ...newLocations[locIdx].address, state: e.target.value }
                                      };
                                      setEditedFields({ ...editedFields, locations: newLocations });
                                    }}
                                    style={{ ...inputStyle, fontSize: 12 }}
                                    maxLength={2}
                                  />
                                </div>
                              </label>
                              <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={verifiedFields[`locations[${locIdx}].address.zip`] || false}
                                  onChange={(e) => setVerifiedFields({ ...verifiedFields, [`locations[${locIdx}].address.zip`]: e.target.checked })}
                                  style={{ marginTop: 10 }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ ...labelStyle, fontSize: 10 }}>ZIP</div>
                                  <input
                                    value={location.address.zip || ""}
                                    onChange={(e) => {
                                      const newLocations = [...editedFields.locations];
                                      newLocations[locIdx] = {
                                        ...newLocations[locIdx],
                                        address: { ...newLocations[locIdx].address, zip: e.target.value }
                                      };
                                      setEditedFields({ ...editedFields, locations: newLocations });
                                    }}
                                    style={{ ...inputStyle, fontSize: 12 }}
                                  />
                                </div>
                              </label>
                            </div>
                          </div>
                        )}

                        {/* Party Selection Checkboxes */}
                        <div style={{ marginBottom: 12, padding: 12, background: "#f0f9ff", borderRadius: 8, border: "1px solid #bae6fd" }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>Select Parties (check all that apply)</div>
                          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                              <input
                                type="checkbox"
                                checked={!!(location.additional_insureds && Array.isArray(location.additional_insureds) && location.additional_insureds.length > 0)}
                                onChange={(e) => {
                                  const newLocations = [...editedFields.locations];
                                  if (e.target.checked && !newLocations[locIdx].additional_insureds) {
                                    newLocations[locIdx] = { ...newLocations[locIdx], additional_insureds: [{ name: "", address: "" }] };
                                  } else if (!e.target.checked) {
                                    newLocations[locIdx] = { ...newLocations[locIdx], additional_insureds: [] };
                                  }
                                  setEditedFields({ ...editedFields, locations: newLocations });
                                }}
                              />
                              <span style={{ fontSize: 12, color: "#111827" }}>A.I. (Additional Insured)</span>
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                              <input
                                type="checkbox"
                                checked={!!location.mortgagee?.name || !!location.mortgagee?.address}
                                onChange={(e) => {
                                  const newLocations = [...editedFields.locations];
                                  if (e.target.checked && !newLocations[locIdx].mortgagee) {
                                    newLocations[locIdx] = { ...newLocations[locIdx], mortgagee: { name: "", address: "" } };
                                  } else if (!e.target.checked) {
                                    newLocations[locIdx] = { ...newLocations[locIdx], mortgagee: null };
                                  }
                                  setEditedFields({ ...editedFields, locations: newLocations });
                                }}
                              />
                              <span style={{ fontSize: 12, color: "#111827" }}>Mortgagee</span>
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                              <input
                                type="checkbox"
                                checked={!!location.loss_payee?.name || !!location.loss_payee?.address}
                                onChange={(e) => {
                                  const newLocations = [...editedFields.locations];
                                  if (e.target.checked && !newLocations[locIdx].loss_payee) {
                                    newLocations[locIdx] = { ...newLocations[locIdx], loss_payee: { name: "", address: "" } };
                                  } else if (!e.target.checked) {
                                    newLocations[locIdx] = { ...newLocations[locIdx], loss_payee: null };
                                  }
                                  setEditedFields({ ...editedFields, locations: newLocations });
                                }}
                              />
                              <span style={{ fontSize: 12, color: "#111827" }}>Loss Payee</span>
                            </label>
                          </div>
                        </div>

                        {/* Additional Insureds */}
                        {location.additional_insureds && Array.isArray(location.additional_insureds) && location.additional_insureds.length > 0 && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>
                              Additional Insureds ({location.additional_insureds.length})
                            </div>
                            {location.additional_insureds.map((ai: any, aiIdx: number) => (
                              <div key={aiIdx} style={{ marginBottom: 8, padding: 8, background: "#f9fafb", borderRadius: 6, border: "1px solid #e5e7eb" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                  <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                                    <input
                                      type="checkbox"
                                      checked={verifiedFields[`locations[${locIdx}].additional_insureds[${aiIdx}].name`] || false}
                                      onChange={(e) => setVerifiedFields({ ...verifiedFields, [`locations[${locIdx}].additional_insureds[${aiIdx}].name`]: e.target.checked })}
                                      style={{ marginTop: 10 }}
                                    />
                                    <div style={{ flex: 1 }}>
                                      <div style={{ ...labelStyle, fontSize: 10 }}>Name</div>
                                      <input
                                        value={ai.name || ""}
                                        onChange={(e) => {
                                          const newLocations = [...editedFields.locations];
                                          const newAIs = [...(newLocations[locIdx].additional_insureds || [])];
                                          newAIs[aiIdx] = { ...newAIs[aiIdx], name: e.target.value };
                                          newLocations[locIdx] = { ...newLocations[locIdx], additional_insureds: newAIs };
                                          setEditedFields({ ...editedFields, locations: newLocations });
                                        }}
                                        style={{ ...inputStyle, fontSize: 12 }}
                                        placeholder="Additional Insured Name"
                                      />
                                    </div>
                                  </label>
                                  <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                                    <input
                                      type="checkbox"
                                      checked={verifiedFields[`locations[${locIdx}].additional_insureds[${aiIdx}].address`] || false}
                                      onChange={(e) => setVerifiedFields({ ...verifiedFields, [`locations[${locIdx}].additional_insureds[${aiIdx}].address`]: e.target.checked })}
                                      style={{ marginTop: 10 }}
                                    />
                                    <div style={{ flex: 1 }}>
                                      <div style={{ ...labelStyle, fontSize: 10 }}>Address</div>
                                      <input
                                        value={ai.address || ""}
                                        onChange={(e) => {
                                          const newLocations = [...editedFields.locations];
                                          const newAIs = [...(newLocations[locIdx].additional_insureds || [])];
                                          newAIs[aiIdx] = { ...newAIs[aiIdx], address: e.target.value };
                                          newLocations[locIdx] = { ...newLocations[locIdx], additional_insureds: newAIs };
                                          setEditedFields({ ...editedFields, locations: newLocations });
                                        }}
                                        style={{ ...inputStyle, fontSize: 12 }}
                                        placeholder="Address"
                                      />
                                    </div>
                                  </label>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Building Characteristics */}
                        {location.building && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>Building Characteristics</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", gap: 8 }}>
                              <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={verifiedFields[`locations[${locIdx}].building.construction_type`] || false}
                                  onChange={(e) => setVerifiedFields({ ...verifiedFields, [`locations[${locIdx}].building.construction_type`]: e.target.checked })}
                                  style={{ marginTop: 10 }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ ...labelStyle, fontSize: 10 }}>Construction Type</div>
                                  <input
                                    value={location.building.construction_type || ""}
                                    onChange={(e) => {
                                      const newLocations = [...editedFields.locations];
                                      newLocations[locIdx] = {
                                        ...newLocations[locIdx],
                                        building: { ...newLocations[locIdx].building, construction_type: e.target.value }
                                      };
                                      setEditedFields({ ...editedFields, locations: newLocations });
                                    }}
                                    style={{ ...inputStyle, fontSize: 12 }}
                                    placeholder="AD, ST, RB, etc."
                                  />
                                </div>
                              </label>
                              <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={verifiedFields[`locations[${locIdx}].building.construction_year`] || false}
                                  onChange={(e) => setVerifiedFields({ ...verifiedFields, [`locations[${locIdx}].building.construction_year`]: e.target.checked })}
                                  style={{ marginTop: 10 }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ ...labelStyle, fontSize: 10 }}>Year Built</div>
                                  <input
                                    type="number"
                                    value={location.building.construction_year || ""}
                                    onChange={(e) => {
                                      const newLocations = [...editedFields.locations];
                                      newLocations[locIdx] = {
                                        ...newLocations[locIdx],
                                        building: { ...newLocations[locIdx].building, construction_year: e.target.value ? parseInt(e.target.value) : null }
                                      };
                                      setEditedFields({ ...editedFields, locations: newLocations });
                                    }}
                                    style={{ ...inputStyle, fontSize: 12 }}
                                    placeholder="1985"
                                  />
                                </div>
                              </label>
                              <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={verifiedFields[`locations[${locIdx}].building.square_footage`] || false}
                                  onChange={(e) => setVerifiedFields({ ...verifiedFields, [`locations[${locIdx}].building.square_footage`]: e.target.checked })}
                                  style={{ marginTop: 10 }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ ...labelStyle, fontSize: 10 }}>Square Feet</div>
                                  <input
                                    type="number"
                                    value={location.building.square_footage || ""}
                                    onChange={(e) => {
                                      const newLocations = [...editedFields.locations];
                                      newLocations[locIdx] = {
                                        ...newLocations[locIdx],
                                        building: { ...newLocations[locIdx].building, square_footage: e.target.value ? parseFloat(e.target.value) : null }
                                      };
                                      setEditedFields({ ...editedFields, locations: newLocations });
                                    }}
                                    style={{ ...inputStyle, fontSize: 12 }}
                                    placeholder="10000"
                                  />
                                </div>
                              </label>
                              <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={verifiedFields[`locations[${locIdx}].building.sprinkler_percent`] || false}
                                  onChange={(e) => setVerifiedFields({ ...verifiedFields, [`locations[${locIdx}].building.sprinkler_percent`]: e.target.checked })}
                                  style={{ marginTop: 10 }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ ...labelStyle, fontSize: 10 }}>Sprinkler %</div>
                                  <input
                                    type="number"
                                    value={location.building.sprinkler_percent || ""}
                                    onChange={(e) => {
                                      const newLocations = [...editedFields.locations];
                                      newLocations[locIdx] = {
                                        ...newLocations[locIdx],
                                        building: { ...newLocations[locIdx].building, sprinkler_percent: e.target.value ? parseFloat(e.target.value) : null }
                                      };
                                      setEditedFields({ ...editedFields, locations: newLocations });
                                    }}
                                    style={{ ...inputStyle, fontSize: 12 }}
                                    placeholder="100"
                                  />
                                </div>
                              </label>
                              <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={verifiedFields[`locations[${locIdx}].building.stories`] || false}
                                  onChange={(e) => setVerifiedFields({ ...verifiedFields, [`locations[${locIdx}].building.stories`]: e.target.checked })}
                                  style={{ marginTop: 10 }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ ...labelStyle, fontSize: 10 }}>Stories</div>
                                  <input
                                    type="number"
                                    value={location.building.stories || ""}
                                    onChange={(e) => {
                                      const newLocations = [...editedFields.locations];
                                      newLocations[locIdx] = {
                                        ...newLocations[locIdx],
                                        building: { ...newLocations[locIdx].building, stories: e.target.value ? parseInt(e.target.value) : null }
                                      };
                                      setEditedFields({ ...editedFields, locations: newLocations });
                                    }}
                                    style={{ ...inputStyle, fontSize: 12 }}
                                    placeholder="2"
                                  />
                                </div>
                              </label>
                              <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={verifiedFields[`locations[${locIdx}].building.protection_class`] || false}
                                  onChange={(e) => setVerifiedFields({ ...verifiedFields, [`locations[${locIdx}].building.protection_class`]: e.target.checked })}
                                  style={{ marginTop: 10 }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ ...labelStyle, fontSize: 10 }}>Protection Class</div>
                                  <input
                                    value={location.building.protection_class || ""}
                                    onChange={(e) => {
                                      const newLocations = [...editedFields.locations];
                                      newLocations[locIdx] = {
                                        ...newLocations[locIdx],
                                        building: { ...newLocations[locIdx].building, protection_class: e.target.value }
                                      };
                                      setEditedFields({ ...editedFields, locations: newLocations });
                                    }}
                                    style={{ ...inputStyle, fontSize: 12 }}
                                    placeholder="3"
                                  />
                                </div>
                              </label>
                            </div>
                          </div>
                        )}

                        {/* Coverages */}
                        {location.coverages && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>Coverages</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 8 }}>
                              <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={verifiedFields[`locations[${locIdx}].coverages.building_limit`] || false}
                                  onChange={(e) => setVerifiedFields({ ...verifiedFields, [`locations[${locIdx}].coverages.building_limit`]: e.target.checked })}
                                  style={{ marginTop: 10 }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ ...labelStyle, fontSize: 10 }}>Building Limit</div>
                                  <input
                                    type="number"
                                    value={location.coverages.building_limit || ""}
                                    onChange={(e) => {
                                      const newLocations = [...editedFields.locations];
                                      newLocations[locIdx] = {
                                        ...newLocations[locIdx],
                                        coverages: { ...newLocations[locIdx].coverages, building_limit: e.target.value ? parseFloat(e.target.value) : null }
                                      };
                                      setEditedFields({ ...editedFields, locations: newLocations });
                                    }}
                                    style={{ ...inputStyle, fontSize: 12 }}
                                    placeholder="2500000"
                                  />
                                </div>
                              </label>
                              <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={verifiedFields[`locations[${locIdx}].coverages.rents`] || false}
                                  onChange={(e) => setVerifiedFields({ ...verifiedFields, [`locations[${locIdx}].coverages.rents`]: e.target.checked })}
                                  style={{ marginTop: 10 }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ ...labelStyle, fontSize: 10 }}>Rents</div>
                                  <input
                                    type="number"
                                    value={location.coverages.rents || ""}
                                    onChange={(e) => {
                                      const newLocations = [...editedFields.locations];
                                      newLocations[locIdx] = {
                                        ...newLocations[locIdx],
                                        coverages: { ...newLocations[locIdx].coverages, rents: e.target.value ? parseFloat(e.target.value) : null }
                                      };
                                      setEditedFields({ ...editedFields, locations: newLocations });
                                    }}
                                    style={{ ...inputStyle, fontSize: 12 }}
                                    placeholder="500000"
                                  />
                                </div>
                              </label>
                              <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={verifiedFields[`locations[${locIdx}].coverages.deductible`] || false}
                                  onChange={(e) => setVerifiedFields({ ...verifiedFields, [`locations[${locIdx}].coverages.deductible`]: e.target.checked })}
                                  style={{ marginTop: 10 }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ ...labelStyle, fontSize: 10 }}>Deductible</div>
                                  <input
                                    value={location.coverages.deductible || ""}
                                    onChange={(e) => {
                                      const newLocations = [...editedFields.locations];
                                      newLocations[locIdx] = {
                                        ...newLocations[locIdx],
                                        coverages: { ...newLocations[locIdx].coverages, deductible: e.target.value }
                                      };
                                      setEditedFields({ ...editedFields, locations: newLocations });
                                    }}
                                    style={{ ...inputStyle, fontSize: 12 }}
                                    placeholder="5000 or 1%"
                                  />
                                </div>
                              </label>
                              <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={verifiedFields[`locations[${locIdx}].coverages.icc_ordinance`] || false}
                                  onChange={(e) => setVerifiedFields({ ...verifiedFields, [`locations[${locIdx}].coverages.icc_ordinance`]: e.target.checked })}
                                  style={{ marginTop: 10 }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ ...labelStyle, fontSize: 10 }}>ICC Ordinance</div>
                                  <input
                                    type="number"
                                    value={location.coverages.icc_ordinance || ""}
                                    onChange={(e) => {
                                      const newLocations = [...editedFields.locations];
                                      newLocations[locIdx] = {
                                        ...newLocations[locIdx],
                                        coverages: { ...newLocations[locIdx].coverages, icc_ordinance: e.target.value ? parseFloat(e.target.value) : null }
                                      };
                                      setEditedFields({ ...editedFields, locations: newLocations });
                                    }}
                                    style={{ ...inputStyle, fontSize: 12 }}
                                    placeholder="250000"
                                  />
                                </div>
                              </label>
                              <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={verifiedFields[`locations[${locIdx}].coverages.eqsl_requested`] || false}
                                  onChange={(e) => setVerifiedFields({ ...verifiedFields, [`locations[${locIdx}].coverages.eqsl_requested`]: e.target.checked })}
                                  style={{ marginTop: 10 }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ ...labelStyle, fontSize: 10 }}>EQSL Requested</div>
                                  <input
                                    type="checkbox"
                                    checked={location.coverages.eqsl_requested || false}
                                    onChange={(e) => {
                                      const newLocations = [...editedFields.locations];
                                      newLocations[locIdx] = {
                                        ...newLocations[locIdx],
                                        coverages: { ...newLocations[locIdx].coverages, eqsl_requested: e.target.checked }
                                      };
                                      setEditedFields({ ...editedFields, locations: newLocations });
                                    }}
                                    style={{ ...inputStyle, fontSize: 12, width: "auto" }}
                                  />
                                </div>
                              </label>
                              <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={verifiedFields[`locations[${locIdx}].coverages.eqsl_limit`] || false}
                                  onChange={(e) => setVerifiedFields({ ...verifiedFields, [`locations[${locIdx}].coverages.eqsl_limit`]: e.target.checked })}
                                  style={{ marginTop: 10 }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ ...labelStyle, fontSize: 10 }}>EQSL Limit</div>
                                  <input
                                    type="number"
                                    value={location.coverages.eqsl_limit || ""}
                                    onChange={(e) => {
                                      const newLocations = [...editedFields.locations];
                                      newLocations[locIdx] = {
                                        ...newLocations[locIdx],
                                        coverages: { ...newLocations[locIdx].coverages, eqsl_limit: e.target.value ? parseFloat(e.target.value) : null }
                                      };
                                      setEditedFields({ ...editedFields, locations: newLocations });
                                    }}
                                    style={{ ...inputStyle, fontSize: 12 }}
                                    placeholder="100000"
                                  />
                                </div>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes Section */}
                {editedFields.notes && Array.isArray(editedFields.notes) && editedFields.notes.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 12, borderBottom: "2px solid #e5e7eb", paddingBottom: 6 }}>
                      📝 Notes ({editedFields.notes.length})
                    </div>
                    {editedFields.notes.map((note: any, noteIdx: number) => (
                      <div key={noteIdx} style={{ marginBottom: 12, padding: 12, background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                        <label style={{ display: "flex", alignItems: "start", gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={verifiedFields[`notes[${noteIdx}].text`] || false}
                            onChange={(e) => setVerifiedFields({ ...verifiedFields, [`notes[${noteIdx}].text`]: e.target.checked })}
                            style={{ marginTop: 10 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={labelStyle}>Note {noteIdx + 1}</div>
                            <textarea
                              value={note.text || ""}
                              onChange={(e) => {
                                const newNotes = [...editedFields.notes];
                                newNotes[noteIdx] = { ...newNotes[noteIdx], text: e.target.value };
                                setEditedFields({ ...editedFields, notes: newNotes });
                              }}
                              style={{ ...inputStyle, minHeight: 60, resize: "vertical" as const }}
                            />
                            {note.source_refs && note.source_refs.length > 0 && (
                              <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>
                                Source: {note.source_refs.map((ref: any) => `Source ${ref.source_id}, Page ${ref.page}`).join(", ")}
                              </div>
                            )}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {/* Summary */}
                <div style={{ padding: 12, background: "#eff6ff", borderRadius: 8, marginTop: 16 }}>
                  <div style={{ fontSize: 12, color: "#1e40af", fontWeight: 500 }}>
                    ✓ {Object.values(verifiedFields).filter(Boolean).length} field(s) verified • {Object.keys(editedFields).filter(k => {
                      const val = (editedFields as any)[k];
                      return val && (typeof val === 'object' ? Object.keys(val).length > 0 : val !== "");
                    }).length} section(s) with data
                  </div>
                </div>

                {/* JSON Preview (Collapsible) */}
                <details style={{ marginTop: 16 }}>
                  <summary style={{ fontSize: 12, fontWeight: 600, color: "#3b82f6", cursor: "pointer" }}>
                    🔍 View Raw JSON
                  </summary>
                  <div style={{ 
                    marginTop: 8, 
                    padding: 12, 
                    background: "#f8fafc", 
                    borderRadius: 6, 
                    fontSize: 11, 
                    fontFamily: "monospace", 
                    whiteSpace: "pre-wrap", 
                    maxHeight: 300, 
                    overflow: "auto",
                    border: "1px solid #e5e7eb",
                  }}>
                    {JSON.stringify(editedFields, null, 2)}
                  </div>
                </details>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
                  Extracted structured data for {selectedProductInfo.name}:
                </div>
                <div style={{ 
                  padding: 16, 
                  background: "#f9fafb", 
                  borderRadius: 8, 
                  border: "1px solid #e5e7eb",
                  maxHeight: 500,
                  overflow: "auto",
                }}>
                  <pre style={{ 
                    fontSize: 12, 
                    fontFamily: "monospace", 
                    margin: 0, 
                    whiteSpace: "pre-wrap",
                    color: "#111827",
                  }}>
                    {JSON.stringify(draft.extracted_data?.extracted_data || draft.extracted_data, null, 2)}
                  </pre>
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8, fontStyle: "italic" }}>
                  Loading field editing UI...
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit to AS400 */}
        {draft && draft.status === "EXTRACTED" && draft.extracted_data && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 12 }}>
              📤 Submit to AS400
            </h3>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
              Submit the extracted data to AS400. This will create an outbox message for processing.
            </div>
            <button
              onClick={handleAccept}
              disabled={loading}
              style={{
                ...primaryButtonStyle,
                width: "100%",
                opacity: loading ? 0.5 : 1,
                cursor: loading ? "not-allowed" : "pointer",
                background: "#059669",
                border: "1px solid #059669",
              }}
            >
              {loading ? "Submitting..." : "▶️ Accept & Submit to AS400"}
            </button>
          </div>
        )}

        {/* Status/Error Messages */}
        {status && (
          <div style={{ 
            padding: 12, 
            background: "#dbeafe", 
            borderRadius: 8, 
            border: "1px solid #60a5fa",
            color: "#1e40af",
            fontSize: 13,
          }}>
            {status}
          </div>
        )}
        
        {error && (
          <div style={{ 
            padding: 12, 
            background: "#fee2e2", 
            borderRadius: 8, 
            border: "1px solid #fca5a5",
            color: "#dc2626",
            fontSize: 13,
          }}>
            ⚠️ Error: {error}
          </div>
        )}

      </div>
    </WorkbenchLayout>
  );
};

export default DraftIntakePage;
