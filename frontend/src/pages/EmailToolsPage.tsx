import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { WorkbenchLayout } from "../components/WorkbenchLayout";
import { apiGet, apiPost, apiPut, apiDelete } from "../api/client";
import {
  cardStyle,
  inputStyle,
  labelStyle,
  selectStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from "../ui/designSystem";

type EmailTemplate = {
  id: number;
  name: string;
  subject: string;
  body: string;
  category: string | null;
  created_by_employee_id: number | null;
  is_system_template: boolean;
  created_at: string;
  updated_at: string;
};

type EmailTemplatePreview = {
  subject: string;
  body: string;
};

const EmailToolsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const prefillEmail = searchParams.get("email") || "";
  const prefillContactId = searchParams.get("contactId") ? Number(searchParams.get("contactId")) : null;
  const prefillAgencyId = searchParams.get("agencyId") ? Number(searchParams.get("agencyId")) : null;

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [recipientEmail, setRecipientEmail] = useState(prefillEmail);
  const [preview, setPreview] = useState<EmailTemplatePreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [agencies, setAgencies] = useState<Array<{ id: number; name: string; code: string | null; office_id: number | null }>>([]);
  const [offices, setOffices] = useState<Array<{ id: number; name: string; code: string }>>([]);
  const [contacts, setContacts] = useState<Array<{ id: number; name: string; email: string | null; agency_id: number }>>([]);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  
  // Template creation/editing form
  const [templateName, setTemplateName] = useState("");
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [templateCategory, setTemplateCategory] = useState("");
  const [isSystemTemplate, setIsSystemTemplate] = useState(false);
  
  const isAdmin = localStorage.getItem("is_admin") === "true";

  const selectedTemplate = useMemo(() => {
    return templates.find(t => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  // Group templates by category
  const templatesByCategory = useMemo(() => {
    const grouped: Record<string, EmailTemplate[]> = {};
    templates.forEach(template => {
      const category = template.category || "Uncategorized";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(template);
    });
    return grouped;
  }, [templates]);

  useEffect(() => {
    loadTemplates();
  }, []);

  // Load agencies, offices, and contacts for logging
  useEffect(() => {
    const loadData = async () => {
      try {
        const [agenciesResp, officesResp, contactsResp] = await Promise.all([
          apiGet<Array<{ id: number; name: string; code: string | null; office_id: number | null }>>("/agencies"),
          apiGet<Array<{ id: number; name: string; code: string }>>("/offices"),
          apiGet<Array<{ id: number; name: string; email: string | null; agency_id: number }>>("/contacts"),
        ]);
        setAgencies(agenciesResp || []);
        setOffices(officesResp || []);
        setContacts(contactsResp || []);
      } catch (err) {
        // Silently fail - logging is optional
        console.error("Failed to load data for logging:", err);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedTemplateId && recipientEmail) {
      generatePreview();
    }
  }, [selectedTemplateId, recipientEmail, prefillContactId, prefillAgencyId]);

  const loadTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<EmailTemplate[]>("/email-templates");
      setTemplates(data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load email templates");
    } finally {
      setIsLoading(false);
    }
  };

  const generatePreview = async () => {
    if (!selectedTemplateId || !recipientEmail.trim()) {
      setPreview(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const previewData = await apiPost<EmailTemplatePreview>("/email-templates/preview", {
        template_id: selectedTemplateId,
        recipient_email: recipientEmail.trim(),
        contact_id: prefillContactId || undefined,
        agency_id: prefillAgencyId || undefined,
      });
      setPreview(previewData);
    } catch (err: any) {
      setError(err?.message || "Failed to generate preview");
      setPreview(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!preview) return;
    
    const fullEmail = `Subject: ${preview.subject}\n\n${preview.body}`;
    navigator.clipboard.writeText(fullEmail).then(() => {
      alert("Email copied to clipboard!");
    }).catch(() => {
      alert("Failed to copy to clipboard");
    });
  };

  const handleLogAgencyCall = async () => {
    if (!preview || !prefillContactId || !prefillAgencyId) {
      setError("Contact and agency information required for logging");
      return;
    }

    setIsLogging(true);
    setError(null);

    try {
      const contact = contacts.find(c => c.id === prefillContactId);
      const agency = agencies.find(a => a.id === prefillAgencyId);
      
      if (!contact || !agency) {
        setError("Contact or agency not found");
        return;
      }

      // Get office code for the log
      const office = agency.office_id 
        ? offices.find(o => o.id === agency.office_id)
        : null;
      const officeCode = office?.code || null;

      const selectedTemplateName = selectedTemplate?.name || "Unknown Template";
      
      const logPayload = {
        user: localStorage.getItem("username") || "User",
        datetime: new Date().toISOString(),
        action: "Email Sent",
        agency_id: agency.id,
        contact_id: contact.id,
        contact: contact.name,
        notes: `Email sent via Email Templates: Template "${selectedTemplateName}" | Subject: "${preview.subject}" | Recipient: ${recipientEmail}`,
        office: officeCode,
      };

      await apiPost("/logs", logPayload);

      alert("Agency call logged successfully!");
    } catch (err: any) {
      setError(err?.message || "Failed to log agency call");
    } finally {
      setIsLogging(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateName.trim() || !templateSubject.trim() || !templateBody.trim()) {
      alert("Name, subject, and body are required");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Use query parameter for is_system_template
      const url = `/email-templates${isSystemTemplate && isAdmin ? "?is_system_template=true" : ""}`;
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}${url}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(localStorage.getItem("auth_token") ? { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } : {}),
        },
        body: JSON.stringify({
          name: templateName.trim(),
          subject: templateSubject.trim(),
          body: templateBody.trim(),
          category: templateCategory.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create template");
      }
      const newTemplate = await response.json();
      await loadTemplates();
      setIsCreatingTemplate(false);
      setTemplateName("");
      setTemplateSubject("");
      setTemplateBody("");
      setTemplateCategory("");
      setIsSystemTemplate(false);
    } catch (err: any) {
      setError(err?.message || "Failed to create template");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplateId(template.id);
    setTemplateName(template.name);
    setTemplateSubject(template.subject);
    setTemplateBody(template.body);
    setTemplateCategory(template.category || "");
    setIsSystemTemplate(template.is_system_template);
    setIsEditingTemplate(true);
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplateId || !templateName.trim() || !templateSubject.trim() || !templateBody.trim()) {
      alert("Name, subject, and body are required");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const updatePayload: any = {
        name: templateName.trim(),
        subject: templateSubject.trim(),
        body: templateBody.trim(),
        category: templateCategory.trim() || undefined,
      };
      
      // Only include is_system_template if user is admin
      if (isAdmin) {
        updatePayload.is_system_template = isSystemTemplate;
      }
      
      await apiPut<EmailTemplate>(`/email-templates/${editingTemplateId}`, updatePayload);
      await loadTemplates();
      setIsEditingTemplate(false);
      setEditingTemplateId(null);
      setTemplateName("");
      setTemplateSubject("");
      setTemplateBody("");
      setTemplateCategory("");
    } catch (err: any) {
      setError(err?.message || "Failed to update template");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (!window.confirm("Are you sure you want to delete this template?")) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await apiDelete(`/email-templates/${templateId}`);
      await loadTemplates();
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId(null);
        setPreview(null);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to delete template");
    } finally {
      setIsLoading(false);
    }
  };

  const sidebar = (
    <>
      <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#111827" }}>
        Email Templates
      </h2>
      <button
        type="button"
        onClick={() => {
          setIsCreatingTemplate(true);
          setIsEditingTemplate(false);
          setEditingTemplateId(null);
          setTemplateName("");
          setTemplateSubject("");
          setTemplateBody("");
          setTemplateCategory("");
        }}
        style={{
          ...primaryButtonStyle,
          width: "100%",
          marginBottom: 16,
          padding: "8px 12px",
          fontSize: 12,
        }}
      >
        + Create Template
      </button>

      {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
        <div key={category} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase" }}>
            {category}
          </div>
          {categoryTemplates.map(template => (
            <div
              key={template.id}
              style={{
                padding: "8px 10px",
                marginBottom: 4,
                borderRadius: 6,
                background: selectedTemplateId === template.id ? "#eff6ff" : "#f9fafb",
                border: selectedTemplateId === template.id ? "1px solid #2563eb" : "1px solid #e5e7eb",
                cursor: "pointer",
                fontSize: 12,
              }}
              onClick={() => setSelectedTemplateId(template.id)}
            >
              <div style={{ fontWeight: selectedTemplateId === template.id ? 600 : 500, marginBottom: 2 }}>
                {template.name}
              </div>
              {template.is_system_template && (
                <div style={{ fontSize: 10, color: "#059669", fontWeight: 600, marginTop: 2 }}>
                  🌐 System Template
                </div>
              )}
              {/* Show edit/delete buttons: admins can edit/delete system templates, users can only edit/delete their own */}
              {(isAdmin || !template.is_system_template) && (
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditTemplate(template);
                    }}
                    style={{
                      padding: "2px 6px",
                      fontSize: 10,
                      background: "#f3f4f6",
                      border: "1px solid #d1d5db",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTemplate(template.id);
                    }}
                    style={{
                      padding: "2px 6px",
                      fontSize: 10,
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      color: "#dc2626",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </>
  );

  return (
    <WorkbenchLayout
      title="Email Templates"
      subtitle="Select a template and generate ready-to-use email content"
      rightNote="Agency Management · Marketing Tools"
      sidebar={sidebar}
    >
      <div style={{ marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => navigate("/crm/marketing-tools")}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid #d1d5db",
            background: "#f9fafb",
            color: "#374151",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ← Back to Marketing Tools
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {error && (
          <div style={{ padding: "12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626" }}>
            {error}
          </div>
        )}

        {/* Template Creation/Editing Form */}
        {(isCreatingTemplate || isEditingTemplate) && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
              {isEditingTemplate ? "Edit Template" : "Create New Template"}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={labelStyle}>Template Name*</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Introduction Email"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <input
                  type="text"
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                  placeholder="e.g., Introduction, Follow-up"
                  style={inputStyle}
                />
              </div>
              {isAdmin && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    id="isSystemTemplate"
                    checked={isSystemTemplate}
                    onChange={(e) => setIsSystemTemplate(e.target.checked)}
                    style={{ cursor: "pointer" }}
                  />
                  <label htmlFor="isSystemTemplate" style={{ ...labelStyle, margin: 0, cursor: "pointer" }}>
                    {isEditingTemplate ? "Convert to System Template (available to all users)" : "Create as System Template (available to all users)"}
                  </label>
                </div>
              )}
              <div>
                <label style={labelStyle}>Subject*</label>
                <input
                  type="text"
                  value={templateSubject}
                  onChange={(e) => setTemplateSubject(e.target.value)}
                  placeholder="Email subject line"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Body*</label>
                <textarea
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  placeholder="Email body text. Use {contact_name}, {agency_name}, {underwriter_name} for variables."
                  rows={10}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                  Available variables: {"{contact_name}"}, {"{contact_title}"}, {"{contact_email}"}, {"{agency_name}"}, {"{agency_code}"}, {"{underwriter_name}"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingTemplate(false);
                    setIsEditingTemplate(false);
                    setEditingTemplateId(null);
                  }}
                  style={secondaryButtonStyle}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={isEditingTemplate ? handleSaveTemplate : handleCreateTemplate}
                  style={primaryButtonStyle}
                  disabled={isLoading}
                >
                  {isEditingTemplate ? "Save Changes" : "Create Template"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Email Tools Interface */}
        {!isCreatingTemplate && !isEditingTemplate && (
          <>
            <div style={cardStyle}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Email Generator</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Select Template</label>
                  <select
                    value={selectedTemplateId || ""}
                    onChange={(e) => setSelectedTemplateId(e.target.value ? Number(e.target.value) : null)}
                    style={selectStyle}
                  >
                    <option value="">Choose a template...</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.category ? `[${template.category}] ` : ""}{template.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Recipient Email</label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="recipient@example.com"
                    style={inputStyle}
                  />
                </div>

                {selectedTemplate && (
                  <div style={{ padding: "12px", background: "#f9fafb", borderRadius: 8, fontSize: 12, color: "#6b7280" }}>
                    <strong>Template:</strong> {selectedTemplate.name}
                    {selectedTemplate.category && <span> · {selectedTemplate.category}</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Preview Window */}
            {preview && (
              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600 }}>Email Preview</h3>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={handleCopyToClipboard}
                      style={{
                        ...primaryButtonStyle,
                        padding: "8px 16px",
                        fontSize: 13,
                      }}
                    >
                      📋 Copy to Clipboard
                    </button>
                    {prefillContactId && prefillAgencyId && (
                      <button
                        type="button"
                        onClick={handleLogAgencyCall}
                        disabled={isLogging}
                        style={{
                          ...primaryButtonStyle,
                          padding: "8px 16px",
                          fontSize: 13,
                          opacity: isLogging ? 0.5 : 1,
                          cursor: isLogging ? "not-allowed" : "pointer",
                        }}
                      >
                        {isLogging ? "Logging..." : "📝 Log Agency Call"}
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>Subject:</div>
                    <div style={{ padding: "12px", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 14 }}>
                      {preview.subject}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>Body:</div>
                    <div
                      style={{
                        padding: "12px",
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 6,
                        fontSize: 14,
                        whiteSpace: "pre-wrap",
                        minHeight: 200,
                        maxHeight: 500,
                        overflowY: "auto",
                      }}
                    >
                      {preview.body}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </WorkbenchLayout>
  );
};

export default EmailToolsPage;
