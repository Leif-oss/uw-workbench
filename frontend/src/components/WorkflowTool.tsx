import React, { useState, useEffect, useMemo } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../api/client";
import { cardStyle, inputStyle, labelStyle, primaryButtonStyle, selectStyle } from "../ui/designSystem";

interface Renewal {
  id: number;
  policy_number: string;
  insured_name: string;
  expiration_date: string;
  producer: string | null;
  producer_code: string | null;
  status: string;
  notes: string | null;
  premium: number | null;
  coverage_type: string | null;
  created_at: string;
  updated_at: string;
}

interface ContactDue {
  contact_id: number;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  contact_title: string | null;
  agency_id: number;
  agency_name: string | null;
  next_contact_date: string;
  last_contact_date: string | null;
  contact_frequency_days: number;
}

export const WorkflowTool: React.FC = () => {
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [contactsDue, setContactsDue] = useState<ContactDue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState("pending");

  // Load both renewals and contacts due on mount so they persist across sessions
  useEffect(() => {
    loadRenewals();
    loadContactsDue();
  }, []);

  const loadRenewals = async () => {
    setIsLoading(true);
    try {
      // Only load pending renewals for the logged-in user
      const data = await apiGet<Renewal[]>("/renewals?status=pending");
      console.log("Loaded pending renewals:", data);
      console.log("Number of pending renewals loaded:", data?.length || 0);
      setRenewals(data || []);
      if (data && data.length > 0) {
        console.log("First renewal:", data[0]);
      }
    } catch (err: any) {
      console.error("Failed to load renewals", err);
      console.error("Error details:", err?.message);
      // Don't show alert on initial load - just log the error
    } finally {
      setIsLoading(false);
    }
  };

  const loadContactsDue = async () => {
    try {
      const data = await apiGet<ContactDue[]>("/renewals/contacts-due");
      console.log("Loaded contacts due:", data);
      setContactsDue(data || []);
    } catch (err: any) {
      console.error("Failed to load contacts due", err);
      // Don't show alert - just log the error
    }
  };

  // Parse renewal data from pasted text
  const parseRenewalText = (text: string): Renewal[] => {
    const lines = text.split("\n");
    const parsed: Renewal[] = [];
    let currentRenewal: Partial<Renewal> | null = null;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      // Don't trim yet - we need to preserve leading spaces for " Prod:" lines
      const trimmedLine = line.trim();
      if (!trimmedLine) continue; // Skip empty lines
      
      // Policy line: "Pol 2952718 DELGADO, LORFY Exp 7/03/26"
      if (trimmedLine.match(/^Pol\s+\d+/i)) {
        // Save previous renewal if exists
        if (currentRenewal && currentRenewal.policy_number) {
          parsed.push(currentRenewal as Renewal);
        }
        
        // More flexible regex - match everything between policy number and "Exp"
        // Format: "Pol 2952718 [insured name] Exp 7/03/26"
        const polMatch = trimmedLine.match(/Pol\s+(\d+)\s+(.+?)\s+Exp\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
        if (polMatch) {
          const [, policyNum, insuredName, expDate] = polMatch;
          // Parse date (assume MM/DD/YY format, convert to full year)
          const [month, day, year] = expDate.split("/");
          const fullYear = year.length === 2 ? (parseInt(year) < 50 ? `20${year}` : `19${year}`) : year;
          const expirationDate = new Date(`${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
          
          // Validate date
          if (isNaN(expirationDate.getTime())) {
            console.error(`Invalid date: ${expDate}`);
            continue;
          }
          
          currentRenewal = {
            policy_number: policyNum,
            insured_name: insuredName.trim(),
            expiration_date: expirationDate.toISOString(),
            status: "pending", // Default to pending, user can change to quoted or non-renewed
            notes: null,
            producer: null,
            producer_code: null,
            premium: null,
            coverage_type: null,
          };
          console.log("Parsed policy:", policyNum, insuredName.trim(), expDate);
        } else {
          console.error("Failed to match policy line:", trimmedLine);
        }
      }
      // Producer line: " Prod: 72970 HUB International Insurance - Scott" (may have leading space)
      // Also handles " Prod: 10233 Alliant Insurance Services, Inc. -" (with trailing dash)
      else if (trimmedLine.match(/Prod:/i) && currentRenewal) {
        const prodMatch = trimmedLine.match(/Prod:\s*(\d+)?\s*(.+?)(?:\s*-\s*)?$/i);
        if (prodMatch) {
          const [, code, producer] = prodMatch;
          currentRenewal.producer_code = code?.trim() || null;
          const producerName = producer?.trim().replace(/\s*-\s*$/, "").trim(); // Remove trailing dash
          currentRenewal.producer = producerName || null;
          console.log("Parsed producer:", code, producerName);
        }
      }
      // Status/Notes line: "Remarket Quoted Policy" or "Not Renewed - Premium is $9402.00, SL - Building Pkg Policy"
      else if (currentRenewal && (trimmedLine.includes("Renewed") || trimmedLine.includes("Quoted") || trimmedLine.includes("Remarket"))) {
        // Extract premium if present
        const premiumMatch = trimmedLine.match(/\$([\d,]+\.?\d*)/);
        if (premiumMatch) {
          currentRenewal.premium = parseFloat(premiumMatch[1].replace(/,/g, ""));
        }
        
        // Extract coverage type
        const coverageMatch = trimmedLine.match(/(SL\s*-\s*[^,]+|Building\s+[^,]+)/i);
        if (coverageMatch) {
          currentRenewal.coverage_type = coverageMatch[1].trim();
        }
        
        // Determine status (only set if explicitly mentioned)
        // "Not Renewed" in the text means pending (not yet processed)
        // Only explicit "non-renewed" status should be non-renewed
        if (trimmedLine.includes("Quoted") || trimmedLine.includes("Remarket")) {
          currentRenewal.status = "quoted";
        }
        // "Not Renewed" in text means it's pending - don't change from default "pending"
        // If status not explicitly set, keep default "pending"
        
        // Store remaining text as notes
        if (currentRenewal.notes) {
          currentRenewal.notes += "\n" + trimmedLine;
        } else {
          currentRenewal.notes = trimmedLine;
        }
      }
      // Additional notes line (for multi-line notes)
      else if (currentRenewal && trimmedLine && !trimmedLine.match(/^Pol\s+\d+/i)) {
        if (currentRenewal.notes) {
          currentRenewal.notes += "\n" + trimmedLine;
        } else {
          currentRenewal.notes = trimmedLine;
        }
      }
    }
    
    // Add last renewal
    if (currentRenewal && currentRenewal.policy_number) {
      parsed.push(currentRenewal as Renewal);
    }
    
    console.log("Parsed renewals:", parsed);
    return parsed;
  };

  const handlePasteAndImport = async () => {
    if (!pasteText.trim()) {
      alert("Please paste renewal data");
      return;
    }

    try {
      const parsed = parseRenewalText(pasteText);
      if (parsed.length === 0) {
        alert("No valid renewal data found. Please check the format.");
        return;
      }

      // Check for duplicates against existing renewals
      // A duplicate is the same policy_number, insured_name, and expiration_date
      const existingRenewals = renewals;
      const duplicates: string[] = [];
      const toImport: typeof parsed = [];

      for (const renewal of parsed) {
        const isDuplicate = existingRenewals.some((existing) => {
          const samePolicy = existing.policy_number === renewal.policy_number;
          const sameName = existing.insured_name.toLowerCase().trim() === renewal.insured_name.toLowerCase().trim();
          const sameDate = new Date(existing.expiration_date).toISOString().split('T')[0] === 
                          new Date(renewal.expiration_date).toISOString().split('T')[0];
          return samePolicy && sameName && sameDate;
        });

        if (isDuplicate) {
          duplicates.push(`${renewal.policy_number} - ${renewal.insured_name}`);
        } else {
          toImport.push(renewal);
        }
      }

      if (duplicates.length > 0) {
        const duplicateList = duplicates.join('\n');
        if (!confirm(`${duplicates.length} duplicate renewal(s) found and will be skipped:\n\n${duplicateList}\n\nContinue importing ${toImport.length} new renewal(s)?`)) {
          return;
        }
      }

      if (toImport.length === 0) {
        alert("All renewals are duplicates. No new renewals to import.");
        setPasteText("");
        return;
      }

      // Create renewals via bulk endpoint
      console.log("Sending renewals to API:", toImport);
      console.log("Number of renewals to import:", toImport.length);
      const result = await apiPost<Renewal[]>("/renewals/bulk", toImport);
      console.log("Import result:", result);
      console.log("Number of renewals returned:", result?.length || 0);
      
      setPasteText("");
      
      // Reload all renewals from server to get the complete list
      try {
        await loadRenewals();
      } catch (err) {
        console.warn("Failed to reload renewals, but import was successful. Using imported data.");
        // If reload fails, add the imported ones to the list
        if (result && result.length > 0) {
          setRenewals((prev) => {
            const combined = [...prev, ...result];
            // Remove duplicates by ID if any
            const unique = combined.filter((r, index, self) => 
              index === self.findIndex((t) => t.id === r.id)
            );
            return unique;
          });
        }
      }
      
      // Also load contacts due
      await loadContactsDue();
      
      const message = toImport.length > 0 
        ? `Successfully imported ${toImport.length} renewal(s)${duplicates.length > 0 ? ` (${duplicates.length} duplicate(s) skipped)` : ''}`
        : "No new renewals to import.";
      alert(message);
    } catch (err: any) {
      console.error("Failed to import renewals", err);
      alert(`Failed to import renewals: ${err?.message || "Unknown error"}`);
    }
  };

  const handleClearPasteField = () => {
    setPasteText("");
  };

  const handleUpdateNotes = async (id: number) => {
    try {
      const updatePayload: any = {
        status: editStatus,
      };
      if (editNotes.trim()) {
        updatePayload.notes = editNotes.trim();
      } else {
        updatePayload.notes = null;
      }
      
      console.log("Updating renewal with payload:", updatePayload);
      const result = await apiPut<Renewal>(`/renewals/${id}`, updatePayload);
      console.log("Update result:", result);
      setEditingId(null);
      setEditNotes("");
      setEditStatus("quoted");
      await loadRenewals();
    } catch (err: any) {
      console.error("Failed to update renewal", err);
      alert(`Failed to update renewal: ${err?.message || "Unknown error"}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this renewal?")) {
      return;
    }

    try {
      const result = await apiDelete(`/renewals/${id}`);
      console.log("Delete result:", result);
      await loadRenewals();
    } catch (err: any) {
      console.error("Failed to delete renewal", err);
      alert(`Failed to delete renewal: ${err?.message || "Unknown error"}`);
    }
  };

  const handleEdit = (renewal: Renewal) => {
    setEditingId(renewal.id);
    setEditNotes(renewal.notes || "");
    setEditStatus(renewal.status);
  };

  // Combine renewals and contacts due, sorted by date (chronological)
  const sortedWorkflowItems = useMemo(() => {
    const items: Array<{
      type: "renewal" | "contact";
      date: string; // expiration_date for renewals, next_contact_date for contacts
      data: Renewal | ContactDue;
    }> = [];

    // Add renewals
    renewals.forEach((renewal) => {
      items.push({
        type: "renewal",
        date: renewal.expiration_date,
        data: renewal,
      });
    });

    // Add contacts due
    contactsDue.forEach((contact) => {
      items.push({
        type: "contact",
        date: contact.next_contact_date,
        data: contact,
      });
    });

    // Sort by date (chronological)
    return items.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [renewals, contactsDue]);

  // Calculate days until expiration
  const daysUntilExpiration = (expirationDate: string): number => {
    const exp = new Date(expirationDate);
    const now = new Date();
    const diffTime = exp.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Calculate date to address by (90 days before expiration)
  const getAddressByDate = (expirationDate: string): Date => {
    const exp = new Date(expirationDate);
    const addressBy = new Date(exp);
    addressBy.setDate(addressBy.getDate() - 90);
    return addressBy;
  };

  // Determine if renewal should be red
  const shouldBeRed = (renewal: Renewal): boolean => {
    const daysUntil = daysUntilExpiration(renewal.expiration_date);
    
    // Non-renewed never shows red
    if (renewal.status === "non-renewed") {
      return false;
    }
    
    // Pending: red if within 90 days
    if (renewal.status === "pending" && daysUntil <= 90 && daysUntil >= 0) {
      return true;
    }
    
    // Quoted: red if within 60 days
    if (renewal.status === "quoted" && daysUntil <= 60 && daysUntil >= 0) {
      return true;
    }
    
    return false;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  };

  return (
    <div style={cardStyle}>
      <h2 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 600, color: "#111827" }}>
        Workflow Tool
      </h2>

      {/* Paste Area */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Paste Renewal Data</label>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder="Paste renewal data here (e.g., Pol 2952718 DELGADO, LORFY Exp 7/03/26...)"
          style={{
            ...inputStyle,
            minHeight: "120px",
            fontFamily: "monospace",
            fontSize: 12,
          }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            onClick={handlePasteAndImport}
            disabled={!pasteText.trim() || isLoading}
            style={{
              ...primaryButtonStyle,
            }}
          >
            Import Renewals
          </button>
          <button
            onClick={handleClearPasteField}
            disabled={!pasteText.trim() || isLoading}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#374151",
              cursor: pasteText.trim() && !isLoading ? "pointer" : "not-allowed",
              opacity: pasteText.trim() && !isLoading ? 1 : 0.5,
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Workflow Items (Renewals + Contacts Due) */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#111827" }}>
            Workflow Items ({sortedWorkflowItems.length})
          </h3>
          <button
            onClick={async () => {
              setIsLoading(true);
              try {
                await loadRenewals();
                await loadContactsDue();
              } finally {
                setIsLoading(false);
              }
            }}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#374151",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>
            Loading...
          </div>
        ) : sortedWorkflowItems.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>
            No workflow items found. Paste renewal data above or contacts will appear here when due.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sortedWorkflowItems.map((item) => {
              if (item.type === "renewal") {
                const renewal = item.data as Renewal;
                const isRed = shouldBeRed(renewal);
                const isEditing = editingId === renewal.id;
                const addressByDate = getAddressByDate(renewal.expiration_date);
                const daysUntil = daysUntilExpiration(renewal.expiration_date);

                return (
                  <div
                    key={`renewal-${renewal.id}`}
                  style={{
                    border: `2px solid ${isRed ? "#dc2626" : "#e5e7eb"}`,
                    borderRadius: 8,
                    padding: 16,
                    backgroundColor: isRed ? "#fee2e2" : "#ffffff",
                    display: "flex",
                    gap: 16,
                  }}
                >
                  {isEditing ? (
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: 12 }}>
                        <label style={labelStyle}>Status</label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          style={selectStyle}
                        >
                          <option value="pending">Pending</option>
                          <option value="quoted">Quoted</option>
                          <option value="non-renewed">Non-Renewed</option>
                        </select>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <label style={labelStyle}>Notes</label>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          style={{
                            ...inputStyle,
                            minHeight: "80px",
                          }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => handleUpdateNotes(renewal.id)}
                          style={primaryButtonStyle}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{
                            padding: "8px 16px",
                            borderRadius: 6,
                            border: "1px solid #d1d5db",
                            background: "#ffffff",
                            color: "#374151",
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Address By Date - Far Left */}
                      <div style={{ minWidth: "120px", flexShrink: 0 }}>
                        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" }}>
                          Address By
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                          {formatDate(addressByDate.toISOString())}
                        </div>
                      </div>

                      {/* Policy Number and Insured Name */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "baseline", marginBottom: 8 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                            {renewal.policy_number}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                            {renewal.insured_name}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          Exp: {formatDate(renewal.expiration_date)}
                          {daysUntil >= 0 && daysUntil <= 90 && (
                            <span style={{ color: "#ef4444", fontWeight: 600, marginLeft: 8 }}>
                              ({daysUntil} days)
                            </span>
                          )}
                        </div>
                        {renewal.producer && (
                          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                            Producer: {renewal.producer}
                            {renewal.producer_code && ` (${renewal.producer_code})`}
                          </div>
                        )}
                        {renewal.coverage_type && (
                          <div style={{ fontSize: 12, color: "#6b7280" }}>
                            Coverage: {renewal.coverage_type}
                          </div>
                        )}
                        {renewal.premium && (
                          <div style={{ fontSize: 12, color: "#6b7280" }}>
                            Premium: ${renewal.premium.toLocaleString()}
                          </div>
                        )}
                        <div style={{ 
                          fontSize: 12, 
                          marginTop: 4,
                          display: "flex",
                          alignItems: "center",
                          gap: 8
                        }}>
                          <span>Status:</span>
                          <select
                            value={renewal.status}
                            onChange={async (e) => {
                              try {
                                await apiPut<Renewal>(`/renewals/${renewal.id}`, {
                                  status: e.target.value,
                                });
                                await loadRenewals();
                              } catch (err: any) {
                                console.error("Failed to update status", err);
                                alert(`Failed to update status: ${err?.message || "Unknown error"}`);
                              }
                            }}
                            style={{
                              padding: "4px 8px",
                              borderRadius: 4,
                              border: "1px solid #d1d5db",
                              background: "#ffffff",
                              color: "#374151",
                              cursor: "pointer",
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            <option value="pending">Pending</option>
                            <option value="quoted">Quoted</option>
                            <option value="non-renewed">Non-Renewed</option>
                          </select>
                        </div>
                        {renewal.notes && (
                          <div style={{ fontSize: 12, color: "#4b5563", marginTop: 8, padding: 8, background: "#f9fafb", borderRadius: 4 }}>
                            {renewal.notes}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons - Right Side */}
                      <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "flex-start" }}>
                        <button
                          onClick={() => handleEdit(renewal)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 6,
                            border: "1px solid #d1d5db",
                            background: "#ffffff",
                            color: "#374151",
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(renewal.id)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 6,
                            border: "1px solid #ef4444",
                            background: "#ffffff",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                  </div>
                );
              } else {
                // Contact due
                const contact = item.data as ContactDue;
                const contactDate = new Date(contact.next_contact_date);
                const today = new Date();
                const daysUntil = Math.ceil((contactDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const isOverdue = daysUntil < 0;

                return (
                  <div
                    key={`contact-${contact.contact_id}`}
                    style={{
                      border: `2px solid ${isOverdue ? "#ef4444" : "#e5e7eb"}`,
                      borderRadius: 8,
                      padding: 16,
                      backgroundColor: isOverdue ? "#fef2f2" : "#ffffff",
                      display: "flex",
                      gap: 16,
                    }}
                  >
                    {/* Contact By Date - Far Left */}
                    <div style={{ minWidth: "120px", flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" }}>
                        Contact By
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                        {formatDate(contact.next_contact_date)}
                      </div>
                    </div>

                    {/* Contact Name and Agency */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "baseline", marginBottom: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                          {contact.contact_name}
                        </div>
                        {contact.contact_title && (
                          <div style={{ fontSize: 12, color: "#6b7280" }}>
                            {contact.contact_title}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        {contact.agency_name && `Agency: ${contact.agency_name}`}
                        {daysUntil < 0 && (
                          <span style={{ color: "#ef4444", fontWeight: 600, marginLeft: 8 }}>
                            ({Math.abs(daysUntil)} days overdue)
                          </span>
                        )}
                        {daysUntil >= 0 && daysUntil <= 7 && (
                          <span style={{ color: "#f59e0b", fontWeight: 600, marginLeft: 8 }}>
                            ({daysUntil} days)
                          </span>
                        )}
                      </div>
                      {contact.contact_email && (
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                          Email: {contact.contact_email}
                        </div>
                      )}
                      {contact.contact_phone && (
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          Phone: {contact.contact_phone}
                        </div>
                      )}
                      {contact.last_contact_date && (
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                          Last Contact: {formatDate(contact.last_contact_date)}
                        </div>
                      )}
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        Frequency: <strong>Every {contact.contact_frequency_days} days</strong>
                      </div>
                    </div>

                    {/* Action Buttons - Right Side */}
                    <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "flex-start" }}>
                      <button
                        onClick={() => {
                          // Navigate to agency detail page with this contact
                          window.location.href = `/crm/agencies/${contact.agency_id}?contactId=${contact.contact_id}`;
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          border: "1px solid #d1d5db",
                          background: "#ffffff",
                          color: "#374151",
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        View Contact
                      </button>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
};
