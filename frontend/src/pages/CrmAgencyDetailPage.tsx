import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiGet, apiPost, apiPut, apiDelete } from "../api/client";
import { LOG_ACTION_OPTIONS, LogAction } from "../constants/logActions";
import {
  cardStyle,
  panelStyle,
  inputStyle,
  labelStyle,
  tableContainerStyle,
  tableBaseStyle,
  tableHeaderCellStyle,
  tableCellStyle,
  tableHeaderStickyStyle,
  selectStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from "../ui/designSystem";

// Reuse types consistent with other CRM pages
 type Agency = {
  id: number;
  name: string;
  code?: string;
  office_id?: number | null;
  web_address?: string | null;
  notes?: string | null;
  primary_underwriter_id?: number | null;
  primary_underwriter?: string | null;
  active_flag?: string | null;
  dba?: string | null;
  email?: string | null;
};

type Contact = {
  id: number;
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  agency_id: number;
  notes?: string | null;
  linkedin_url?: string | null;
  do_not_contact?: boolean;
  contact_frequency_days?: number | null;
  previous_agencies?: string | null;
  likes_hobbies?: string | null;
  additional_info?: string | null;
};

 type Employee = {
  id: number;
  name: string;
  office_id?: number | null; // Deprecated: kept for backward compatibility
  office_ids?: number[]; // List of office IDs (many-to-many relationship)
};

type Log = {
  id: number;
  user: string;
  datetime: string;
  action: string;
  agency_id?: number | null;
  office?: string | null;
  notes?: string | null;
  contact_id?: number | null;
  contact?: string | null;
 };

type ProductionRecord = {
  id: number;
  office: string;
  agency_code: string;
  agency_name: string;
  month: string;
  all_ytd_wp: number | null;
  pytd_wp: number | null;
  standard_lines_ytd_wp: number | null;
  standard_lines_pytd_wp: number | null;
  surplus_lines_ytd_wp: number | null;
  surplus_lines_pytd_wp: number | null;
  twelve_mo_bound: number | null;
  twelve_mo_quoted: number | null;
  twelve_mo_decline: number | null;
  three_year_plus: number | null;
};


 const CrmAgencyDetailPage: React.FC = () => {
  const { agencyId } = useParams<{ agencyId: string }>();
  const navigate = useNavigate();
  const agencyIdNum = agencyId ? Number(agencyId) : null;

  const [agency, setAgency] = useState<Agency | null>(null);
  const [allAgencies, setAllAgencies] = useState<Agency[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [productionData, setProductionData] = useState<ProductionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contactSearch, setContactSearch] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [primaryContactId, setPrimaryContactId] = useState<number | null>(null);

  const [selectedUnderwriter, setSelectedUnderwriter] = useState<string>("");
  const [logAction, setLogAction] = useState<LogAction>("In Person");
  const [logNotes, setLogNotes] = useState("");
  const [logDate, setLogDate] = useState("");
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [logSuccess, setLogSuccess] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [isDeletingLogId, setIsDeletingLogId] = useState<number | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const isLogFormValid = Boolean(
    selectedContactId && selectedUnderwriter.trim() && logAction.trim() && logDate
  );

  const [newContactName, setNewContactName] = useState("");
  const [newContactTitle, setNewContactTitle] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactLinkedIn, setNewContactLinkedIn] = useState("");
  const [newContactNotes, setNewContactNotes] = useState("");
  const [newContactFrequencyDays, setNewContactFrequencyDays] = useState<number | null>(90);
  const [isAddingContact, setIsAddingContact] = useState(false);

  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editContactName, setEditContactName] = useState("");
  const [editContactTitle, setEditContactTitle] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  const [editContactLinkedIn, setEditContactLinkedIn] = useState("");
  const [editContactNotes, setEditContactNotes] = useState("");
  const [editContactFrequencyDays, setEditContactFrequencyDays] = useState<number | null>(90);

  // Agency details expansion
  const [isAgencyDetailsExpanded, setIsAgencyDetailsExpanded] = useState(false);
  const [agencyRating, setAgencyRating] = useState<string>("");
  const [agencyPlan, setAgencyPlan] = useState<string>("");
  const [agencyHistory, setAgencyHistory] = useState<string>("");
  const [typesOfBusiness, setTypesOfBusiness] = useState<string>("");
  const [agencySpecializations, setAgencySpecializations] = useState<string>("");
  const [agencyVolume, setAgencyVolume] = useState<string>("");
  const [agencyYearsInBusiness, setAgencyYearsInBusiness] = useState<string>("");
  const [agencyLicenses, setAgencyLicenses] = useState<string>("");
  const [agencyMarkets, setAgencyMarkets] = useState<string>("");
  const [editContactAgencyCode, setEditContactAgencyCode] = useState("");
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  
  // Contact details expansion
  const [isContactDetailsExpanded, setIsContactDetailsExpanded] = useState(false);
  const [editContactPreviousAgencies, setEditContactPreviousAgencies] = useState<string>("");
  const [editContactLikesHobbies, setEditContactLikesHobbies] = useState<string>("");
  const [editContactAdditionalInfo, setEditContactAdditionalInfo] = useState<string>("");
  const [contactNewBusinessCount, setContactNewBusinessCount] = useState<number | null>(null);

  const [isEditingAgency, setIsEditingAgency] = useState(false);
  const [editAgencyName, setEditAgencyName] = useState("");
  const [editAgencyDBA, setEditAgencyDBA] = useState("");
  const [editAgencyWebAddress, setEditAgencyWebAddress] = useState("");
  const [editAgencyPrimaryUW, setEditAgencyPrimaryUW] = useState<number | null>(null);

  // Load new business count for selected contact
  const loadNewBusinessCount = async () => {
    if (!selectedContact?.id) {
      setContactNewBusinessCount(null);
      return;
    }
    try {
      const response = await apiGet<{ contact_id: number; count: number; months: number }>(
        `/contacts/${selectedContact.id}/new-business-count?months=12`
      );
      setContactNewBusinessCount(response.count);
    } catch (err) {
      console.error("Failed to load new business count", err);
      setContactNewBusinessCount(0);
    }
  };

  useEffect(() => {
    loadNewBusinessCount();
  }, [selectedContact?.id]);

  // Listen for new business creation events
  useEffect(() => {
    const handleNewBusinessCreated = (event: CustomEvent) => {
      // Refresh counter if the created business is for the currently selected contact
      if (selectedContact?.id && event.detail?.contactId === selectedContact.id) {
        loadNewBusinessCount();
      }
    };

    window.addEventListener('newBusinessCreated', handleNewBusinessCreated as EventListener);
    return () => {
      window.removeEventListener('newBusinessCreated', handleNewBusinessCreated as EventListener);
    };
  }, [selectedContact?.id]);

  useEffect(() => {
    const load = async () => {
      if (!agencyIdNum) return;
      setIsLoading(true);
      setError(null);
      try {
        const [agenciesResp, contactsResp, employeesResp, logsResp, productionResp] = await Promise.all([
          apiGet<Agency[]>("/agencies"),
          apiGet<Contact[]>(`/contacts?agency_id=${agencyIdNum}`),
          apiGet<Employee[]>("/employees"),
          apiGet<Log[]>(`/logs?agency_id=${agencyIdNum}`),
          apiGet<ProductionRecord[]>("/production"),
        ]);
        const found = (agenciesResp || []).find((a) => a.id === agencyIdNum) || null;
        setAgency(found);
        setAllAgencies(agenciesResp || []);
        setContacts(contactsResp || []);
        setEmployees(employeesResp || []);
        setLogs(logsResp || []);
        setProductionData(productionResp || []);
        if (contactsResp && contactsResp.length > 0) {
          const firstContactId = contactsResp[0].id;
          setSelectedContactId(firstContactId);
          setPrimaryContactId(firstContactId);
        }
        if (!found) {
          setError("Agency not found.");
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load agency");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [agencyIdNum]);

  const officeEmployees = useMemo(() => {
    if (!agency || !agency.office_id) return [];
    return employees.filter((e) => 
      (e.office_ids && e.office_ids.includes(agency.office_id!)) || 
      (e.office_id === agency.office_id) // Backward compatibility
    );
  }, [employees, agency]);

  // Get all agencies from the same office
  const officeAgencies = useMemo(() => {
    if (!agency || !agency.office_id) return [];
    return allAgencies.filter((a) => a.office_id === agency.office_id);
  }, [allAgencies, agency]);

  // Calculate production metrics for the agency
  const productionMetrics = useMemo(() => {
    if (!agency || !agency.code) return null;
    
    const agencyProduction = productionData.filter(p => p.agency_code === agency.code);
    if (agencyProduction.length === 0) return null;
    
    const mostRecentMonth = agencyProduction.map(r => r.month).sort().pop();
    if (!mostRecentMonth) return null;
    
    const recentRecord = agencyProduction.find(r => r.month === mostRecentMonth);
    if (!recentRecord) return null;
    
    const currentYTD = recentRecord.all_ytd_wp || 0;
    const priorYTD = recentRecord.pytd_wp || 0;
    const percentChange = priorYTD > 0 
      ? ((currentYTD - priorYTD) / priorYTD) * 100 
      : 0;
    
    const bound = recentRecord.twelve_mo_bound || 0;
    const quoted = recentRecord.twelve_mo_quoted || 0;
    const hitRatio = quoted > 0 ? (bound / quoted) * 100 : 0;
    // three_year_plus is stored as integer percentage (5 = 5%, 488 = 488%)
    // Handle null explicitly - if null, use null; if 0, use 0; otherwise use the value
    const lossRatio = recentRecord.three_year_plus !== null && recentRecord.three_year_plus !== undefined 
      ? recentRecord.three_year_plus 
      : null;
    
    return {
      currentYTD,
      priorYTD,
      percentChange,
      bound,
      quoted,
      hitRatio,
      lossRatio,
    };
  }, [productionData, agency]);

  // Calculate activity metrics for the agency
  const agencyActivityMetrics = useMemo(() => {
    if (!agencyIdNum) return null;

    const now = Date.now();
    const twelveMonthsMs = 12 * 30 * 24 * 60 * 60 * 1000; // Approximate 12 months
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    const agencyLogs = logs.filter(log => log.agency_id === agencyIdNum);

    const logs12Months = agencyLogs.filter((log) => {
      const dt = new Date(log.datetime).getTime();
      if (Number.isNaN(dt)) return false;
      return now - dt <= twelveMonthsMs;
    });

    const logs30Days = agencyLogs.filter((log) => {
      const dt = new Date(log.datetime).getTime();
      if (Number.isNaN(dt)) return false;
      return now - dt <= thirtyDaysMs;
    });

    const inPerson12Mo = logs12Months.filter(log => log.action === "In Person").length;
    const emails12Mo = logs12Months.filter(log => log.action === "Email" || log.action === "Email Sent").length;
    const phone12Mo = logs12Months.filter(log => log.action === "Call / Zoom").length;
    const emailsAndPhone30d = logs30Days.filter(log => 
      log.action === "Email" || log.action === "Email Sent" || log.action === "Call / Zoom"
    ).length;

    return {
      inPerson12Mo,
      emails12Mo,
      phone12Mo,
      emailsAndPhone30d,
    };
  }, [logs, agencyIdNum]);

  const filteredContacts = useMemo(() => {
    const term = contactSearch.trim().toLowerCase();
    if (!term) return contacts;
    return contacts.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const title = (c.title || "").toLowerCase();
      return name.includes(term) || title.includes(term);
    });
  }, [contacts, contactSearch]);

  const selectedContact = useMemo(() => {
    if (primaryContactId) {
      return contacts.find((c) => c.id === primaryContactId) || null;
    }
    return contacts[0] || null;
  }, [contacts, primaryContactId]);

  const logsForAgency = useMemo(() => logs, [logs]);

  const getContactedInfoForContact = (contactId: number) => {
    // Find the contact to get its frequency setting
    const contact = contacts.find(c => c.id === contactId);
    const frequencyDays = contact?.contact_frequency_days ?? 90; // Default to 90 if not set

    if (frequencyDays === null) {
      return { label: "never", isStale: true };
    }

    if (!logsForAgency || logsForAgency.length === 0) {
      return { label: "never", isStale: true };
    }

    const matches = logsForAgency.filter((log) => {
      if (log.contact_id == null) return false;
      // eslint-disable-next-line eqeqeq
      return String(log.contact_id) == String(contactId);
    });

    if (!matches.length) {
      return { label: "never", isStale: true };
    }

    let latest: Date | null = null;
    matches.forEach((log) => {
      const d = new Date(log.datetime);
      if (!Number.isNaN(d.getTime())) {
        if (!latest || d > latest) latest = d;
      }
    });

    if (!latest) {
      return { label: "never", isStale: true };
    }

    const latestDate = latest as Date;
    const now = new Date();
    const diffMs = now.getTime() - latestDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const isStale = diffDays > frequencyDays;

    const label = latestDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return { label, isStale };
  };

  const underwritersForOffice = useMemo(() => {
    if (!agency || !agency.office_id) return [] as Employee[];
    return employees.filter((e) => 
      (e.office_ids && e.office_ids.includes(agency.office_id!)) || 
      (e.office_id === agency.office_id) // Backward compatibility
    );
  }, [agency, employees]);

  const getLastContactInfoForContact = (contactId: number) => {
    // Find the contact to get its frequency setting
    const contact = contacts.find(c => c.id === contactId);
    const frequencyDays = contact?.contact_frequency_days ?? 90; // Default to 90 if not set

    if (frequencyDays === null) {
      return { label: "never", isStale: true };
    }

    if (!logsForAgency || logsForAgency.length === 0) {
      return { label: "Never", isStale: true };
    }

    const logsForContact = logsForAgency
      .filter((log) => log.contact_id === contactId && log.datetime)
      .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

    if (logsForContact.length === 0) {
      return { label: "Never", isStale: true };
    }

    const last = new Date(logsForContact[0].datetime);
    const now = new Date();
    const diffMs = now.getTime() - last.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const isStale = diffDays > frequencyDays;

    const formattedLabel = last.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return { label: formattedLabel, isStale };
  };

  const handleCreateContact = async () => {
    if (!agencyIdNum) return;
    if (!newContactName.trim()) return;
      const payload = {
        name: newContactName.trim(),
        title: newContactTitle.trim() || undefined,
        email: newContactEmail.trim() || undefined,
        phone: newContactPhone.trim() || undefined,
        linkedin_url: newContactLinkedIn.trim() || undefined,
        notes: newContactNotes.trim() || undefined,
        contact_frequency_days: newContactFrequencyDays,
        agency_id: agencyIdNum,
    };
    try {
      await apiPost<Contact, typeof payload>("/contacts", payload);
      setNewContactName("");
      setNewContactTitle("");
      setNewContactEmail("");
      setNewContactPhone("");
      setNewContactLinkedIn("");
      setNewContactNotes("");
      setNewContactFrequencyDays(90);
      setIsAddingContact(false);
      const refreshed = await apiGet<Contact[]>(`/contacts?agency_id=${agencyIdNum}`);
      setContacts(refreshed || []);
      if (refreshed && refreshed.length > 0) {
        const firstContactId = refreshed[0].id;
        setSelectedContactId(firstContactId);
        setPrimaryContactId(firstContactId);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create contact");
    }
  };

  const handleCreateLog = async () => {
    if (!agencyIdNum) return;
    setHasAttemptedSubmit(true);
    
    // Validation
    if (!selectedUnderwriter.trim() || !logAction.trim()) {
      setLogError("Underwriter and action are required.");
      return;
    }
    
    if (!selectedContactId) {
      setLogError("A contact must be selected.");
      return;
    }
    
    if (!logDate) {
      setLogError("Date is required.");
      return;
    }
    
    try {
      setIsSavingLog(true);
      setLogError(null);
      setLogSuccess(null);
      
      const datetimeIso = (() => {
        if (logDate) {
          // Use the selected date at midnight (no time component)
          const dateOnly = new Date(logDate);
          dateOnly.setHours(0, 0, 0, 0);
          return dateOnly.toISOString();
        }
        // Use today's date at midnight (no time component)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today.toISOString();
      })();
      
      const office = agency?.office_id ? String(agency.office_id) : null;
      
      // Get the contact name to freeze in the log
      const contactObj = contacts.find(c => c.id === selectedContactId);
      const contactName = contactObj?.name || null;
      
      // Create single log entry
      const payload = {
        user: selectedUnderwriter.trim(),
        datetime: datetimeIso,
        action: logAction.trim(),
        agency_id: agencyIdNum,
        office,
        notes: logNotes.trim() || null,
        contact_id: selectedContactId,
        contact: contactName,
      };
      
      await apiPost<Log, typeof payload>("/logs", payload);
      
      // Refresh logs
      const refreshed = await apiGet<Log[]>(`/logs?agency_id=${agencyIdNum}`);
      setLogs(refreshed || []);
      
      // Clear form
      setLogNotes("");
      setLogAction("In Person");
      setLogDate("");
      setLogSuccess("Marketing log saved.");
      setHasAttemptedSubmit(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setLogSuccess(null), 3000);
    } catch (err: any) {
      setLogError(err?.message || "Failed to create log");
    } finally {
      setIsSavingLog(false);
    }
  };
  
  const handleDeleteLog = async (logId: number) => {
    if (!agencyIdNum) return;
    setIsDeletingLogId(logId);
    setLogError(null);
    try {
      await apiDelete(`/logs/${logId}`);
      const refreshed = await apiGet<Log[]>(`/logs?agency_id=${agencyIdNum}`);
      setLogs(refreshed || []);
      setLogSuccess("Log deleted.");
      setTimeout(() => setLogSuccess(null), 3000);
    } catch (err: any) {
      setLogError(err?.message || "Failed to delete log");
    } finally {
      setIsDeletingLogId(null);
    }
  };

  const handleEditContact = () => {
    if (!selectedContact || !agency) return;
    setEditContactName(selectedContact.name);
    setEditContactTitle(selectedContact.title || "");
    setEditContactEmail(selectedContact.email || "");
    setEditContactPhone(selectedContact.phone || "");
    setEditContactLinkedIn(selectedContact.linkedin_url || "");
    setEditContactNotes(selectedContact.notes || "");
    // Set frequency: use contact_frequency_days or default to 90
    setEditContactFrequencyDays(selectedContact.contact_frequency_days ?? 90);
    setEditContactPreviousAgencies(selectedContact.previous_agencies || "");
    setEditContactLikesHobbies(selectedContact.likes_hobbies || "");
    setEditContactAdditionalInfo(selectedContact.additional_info || "");
    // Set current agency code
    setEditContactAgencyCode(agency.code || "");
    setIsEditingContact(true);
  };

  const handleSaveContactEdit = async () => {
    if (!agencyIdNum || !selectedContact) return;
    if (!editContactName.trim()) {
      setError("Contact name is required");
      return;
    }
    try {
      setError(null);
      
      // If agency code was changed, look up the new agency
      let newAgencyId = selectedContact.agency_id;
      if (editContactAgencyCode.trim() && editContactAgencyCode.trim() !== (agency?.code || "")) {
        // Fetch all agencies to find the one with matching code
        const allAgencies = await apiGet<Agency[]>("/agencies");
        const targetAgency = allAgencies?.find(a => a.code?.toUpperCase() === editContactAgencyCode.trim().toUpperCase());
        
        if (!targetAgency) {
          setError(`Agency with code "${editContactAgencyCode.trim()}" not found`);
          alert(`Agency with code "${editContactAgencyCode.trim()}" not found. Please check the code and try again.`);
          return;
        }
        
        newAgencyId = targetAgency.id;
      }
      
      // Build payload - use contact_frequency_days
      const payload: any = {
        name: editContactName.trim(),
        title: editContactTitle.trim() || undefined,
        email: editContactEmail.trim() || undefined,
        phone: editContactPhone.trim() || undefined,
        linkedin_url: editContactLinkedIn.trim() || undefined,
        notes: editContactNotes.trim() || undefined,
        contact_frequency_days: editContactFrequencyDays,
        previous_agencies: editContactPreviousAgencies.trim() || undefined,
        likes_hobbies: editContactLikesHobbies.trim() || undefined,
        additional_info: editContactAdditionalInfo.trim() || undefined,
      };
      
      // Only include agency_id if it changed
      if (newAgencyId !== selectedContact.agency_id) {
        payload.agency_id = newAgencyId;
      }
      
      const updated = await apiPut<Contact>(`/contacts/${selectedContact.id}`, payload);
      console.log("Contact update payload:", JSON.stringify(payload, null, 2)); // Debug - show full payload
      console.log("Updated contact response:", JSON.stringify(updated, null, 2)); // Debug - show full response
      console.log("Updated contact response do_not_contact:", updated?.do_not_contact); // Debug
      
      // If agency changed, navigate to the new agency page
      if (newAgencyId !== selectedContact.agency_id) {
        navigate(`/crm/agency/${newAgencyId}`);
        return; // Navigation will reload the page
      }
      
      // Refresh contacts list - selectedContact will update automatically via useMemo
      const refreshed = await apiGet<Contact[]>(`/contacts?agency_id=${agencyIdNum}`);
      if (refreshed) {
        setContacts(refreshed);
      }
      
      // Close edit mode
      setIsEditingContact(false);
      setError(null);
    } catch (err: any) {
      console.error("Error updating contact:", err);
      const errorMessage = err?.response?.data?.detail || err?.message || "Failed to update contact";
      setError(errorMessage);
      alert(`Error updating contact: ${errorMessage}`);
    }
  };

  const handleDeleteContact = async () => {
    if (!agencyIdNum || !selectedContact) return;
    if (!window.confirm(`Are you sure you want to delete contact "${selectedContact.name}"?`)) {
      return;
    }
    try {
      await apiDelete(`/contacts/${selectedContact.id}`);
      const refreshed = await apiGet<Contact[]>(`/contacts?agency_id=${agencyIdNum}`);
      setContacts(refreshed || []);
      if (selectedContact.id === selectedContactId) {
        setSelectedContactId(refreshed && refreshed.length > 0 ? refreshed[0].id : null);
        setPrimaryContactId(refreshed && refreshed.length > 0 ? refreshed[0].id : null);
      }
      if (selectedContact.id === primaryContactId) {
        setPrimaryContactId(refreshed && refreshed.length > 0 ? refreshed[0].id : null);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to delete contact");
    }
  };

  const handleEditAgency = () => {
    if (!agency) return;
    setEditAgencyName(agency.name || "");
    setEditAgencyDBA(agency.dba || "");
    setEditAgencyWebAddress(agency.web_address || "");
    setEditAgencyPrimaryUW(agency.primary_underwriter_id || null);
    setIsEditingAgency(true);
  };

  const handleSaveAgency = async () => {
    if (!agencyIdNum || !agency) return;
    if (!editAgencyName.trim()) {
      alert("Agency name is required.");
      return;
    }
    try {
      // Find the employee name for the selected underwriter ID
      const selectedEmployee = employees.find(e => e.id === editAgencyPrimaryUW);
      const payload = {
        name: editAgencyName.trim(),
        code: agency.code, // Preserve existing code
        office_id: agency.office_id, // Preserve existing office
        dba: editAgencyDBA.trim() || undefined,
        web_address: editAgencyWebAddress.trim() || undefined,
        primary_underwriter_id: editAgencyPrimaryUW || undefined,
        primary_underwriter: selectedEmployee?.name || undefined,
      };
      await apiPut(`/agencies/${agencyIdNum}`, payload);
      const refreshed = await apiGet<Agency[]>("/agencies");
      const updatedAgency = refreshed?.find(a => a.id === agencyIdNum);
      setAgency(updatedAgency || null);
      setIsEditingAgency(false);
    } catch (err: any) {
      setError(err?.message || "Failed to update agency");
    }
  };


  const formatDateTime = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    // Only show date, no time
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <>
      <div
        style={{
          height: 56,
          background: "linear-gradient(90deg, #111827, #1f2933)",
          color: "#f9fafb",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: "0.01em",
        }}
      >
        Agency Contact and Call Tracking
      </div>
      <div
        style={{
          padding: "12px 10px",
          display: "grid",
          gridTemplateColumns: "1.2fr 1.5fr 0.9fr",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        {/* LEFT COLUMN: Contacts */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Contacts</div>
          <button
            type="button"
            onClick={() => setIsAddingContact((v) => !v)}
            style={{
              padding: "6px 8px",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              background: "#f9fafb",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {isAddingContact ? "Close" : "Add Contact"}
          </button>
        </div>

        {isAddingContact && (
          <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            <input
              placeholder="Name*"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Title"
              value={newContactTitle}
              onChange={(e) => setNewContactTitle(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Email"
              value={newContactEmail}
              onChange={(e) => setNewContactEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Phone"
              value={newContactPhone}
              onChange={(e) => setNewContactPhone(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="LinkedIn URL"
              value={newContactLinkedIn}
              onChange={(e) => setNewContactLinkedIn(e.target.value)}
              style={inputStyle}
            />
            <textarea
              placeholder="Notes"
              value={newContactNotes}
              onChange={(e) => setNewContactNotes(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                Contact Frequency (Days Between Contacts)
              </label>
              <select
                value={newContactFrequencyDays === null ? "never" : String(newContactFrequencyDays)}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "never") {
                    setNewContactFrequencyDays(null);
                  } else {
                    setNewContactFrequencyDays(Number(value));
                  }
                }}
                style={{
                  ...inputStyle,
                  padding: "8px",
                  cursor: "pointer",
                }}
              >
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
                <option value="120">120 days</option>
                <option value="never">Never</option>
              </select>
              {newContactFrequencyDays === null && (
                <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>
                  Contact will not appear in "Contacts Needing Attention" list
                </div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
              <button
                type="button"
                onClick={handleCreateContact}
                style={{
                  padding: "7px 10px",
                  borderRadius: 6,
                  border: "1px solid #2563eb",
                  background: "#2563eb",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
                disabled={!newContactName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 8 }}>
          <input
            type="text"
            placeholder="Search contacts-"
            value={contactSearch}
            onChange={(e) => setContactSearch(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {filteredContacts.map((c) => {
            const { label, isStale } = getContactedInfoForContact(c.id);
            const isPrimary = primaryContactId === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setPrimaryContactId(c.id)}
                style={{
                  textAlign: "left",
                  padding: "6px 8px",
                  borderRadius: 6,
                  border: "none",
                  backgroundColor: isPrimary ? "#eff6ff" : "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 12, minWidth: 0, display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                      {(c.contact_frequency_days === null) && (
                        <span style={{ color: "#dc2626", fontSize: 14, fontWeight: 600 }}>⚠️</span>
                      )}
                      <span style={{ fontWeight: isPrimary ? 600 : 500 }}>{c.name}</span>
                      {c.title && (
                        <span style={{ color: "#6b7280" }}>
                          {" / "}
                          {c.title}
                        </span>
                      )}
                      {c.email && (
                        <>
                          {" / "}
                          <a href={`mailto:${c.email}`} style={{ color: "#2563eb", textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>
                            {c.email}
                          </a>
                        </>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        color: (c.contact_frequency_days === null) ? "#dc2626" : (isStale ? "#b91c1c" : "#6b7280"),
                      }}
                    >
                      {(c.contact_frequency_days === null)
                        ? "never"
                        : label === "never"
                        ? `Contacted: never`
                        : `Contacted: ${label}`}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredContacts.length === 0 && (
            <div style={{ fontSize: 12, color: "#6b7280" }}>No contacts found.</div>
          )}
        </div>
      </div>

      {/* MIDDLE COLUMN: Agency info + selected contact detail */}
      <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            marginBottom: 12,
            paddingBottom: 12,
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              {/* Back to Office and Agency Selector */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                {agency?.office_id && (
                  <button
                    type="button"
                    onClick={() => navigate(`/crm/offices/${agency.office_id}`)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1px solid #6b7280",
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
                    ← Back to Office
                  </button>
                )}
                {officeAgencies.length > 1 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>
                      Switch Agency:
                    </label>
                    <select
                      value={agencyIdNum || ""}
                      onChange={(e) => {
                        const newAgencyId = Number(e.target.value);
                        if (newAgencyId && newAgencyId !== agencyIdNum) {
                          navigate(`/crm/agencies/${newAgencyId}`);
                        }
                      }}
                      disabled={isEditingAgency}
                      style={{
                        ...selectStyle,
                        minWidth: 200,
                        padding: "6px 10px",
                        fontSize: 13,
                        opacity: isEditingAgency ? 0.5 : 1,
                        cursor: isEditingAgency ? "not-allowed" : "pointer",
                      }}
                    >
                      {officeAgencies.map((ag) => (
                        <option key={ag.id} value={ag.id}>
                          {ag.code ? `${ag.code} - ${ag.name}` : ag.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                {agency?.name || "Agency"}
              </div>
            </div>
            {!isEditingAgency && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={handleEditAgency}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1px solid #2563eb",
                      background: "#fff",
                      color: "#2563eb",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Edit Agency
                  </button>
                  {agencyIdNum && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const { apiDownloadFile } = await import("../api/client");
                          const filename = agency
                            ? `${agency.code || "AGENCY"}_${agency.name.replace(/[^a-z0-9-_]+/gi, "_")}_contacts_${new Date().toISOString().split("T")[0]}.xlsx`
                            : `agency_${agencyIdNum}_contacts.xlsx`;
                          await apiDownloadFile(`/contacts/export/agency/${agencyIdNum}`, filename);
                        } catch (err: any) {
                          alert(`Failed to export contacts: ${err?.message || "Unknown error"}`);
                        }
                      }}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: "1px solid #2563eb",
                        background: "#2563eb",
                        color: "white",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 500,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#1d4ed8";
                        e.currentTarget.style.borderColor = "#1d4ed8";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#2563eb";
                        e.currentTarget.style.borderColor = "#2563eb";
                      }}
                    >
                      📥 Export Contacts
                    </button>
                  )}
                </div>
                {agency?.active_flag && agency.active_flag.toLowerCase() !== "active" && (
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#dc2626",
                    padding: "4px 8px",
                    background: "#fef2f2",
                    borderRadius: 4,
                    border: "1px solid #fecaca",
                  }}>
                    NOT ACTIVE
                  </div>
                )}
                
                {/* Production Metrics */}
                <div style={{ display: "flex", gap: 12 }}>
                  {productionMetrics && (
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      padding: "12px",
                      background: "#f9fafb",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      minWidth: 200,
                      alignItems: "flex-end",
                    }}>
                      {/* YTD Metrics */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%", alignItems: "flex-end" }}>
                        <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right", width: "100%" }}>
                          Current YTD
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", textAlign: "right", width: "100%" }}>
                          ${(productionMetrics.currentYTD / 1000).toFixed(0)}K
                        </div>
                        <div style={{ 
                          fontSize: 12, 
                          fontWeight: 600,
                          color: productionMetrics.percentChange >= 0 ? "#059669" : "#dc2626",
                          textAlign: "right",
                          width: "100%",
                        }}>
                          {productionMetrics.percentChange >= 0 ? "+" : ""}{productionMetrics.percentChange.toFixed(1)}% Change
                        </div>
                      </div>
                      
                      {/* Underwriting Metrics */}
                      <div style={{ 
                        display: "grid", 
                        gridTemplateColumns: "1fr 1fr", 
                        gap: 8, 
                        width: "100%",
                        paddingTop: 8,
                        borderTop: "1px solid #e5e7eb",
                      }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>12/Mo Bound</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#059669" }}>
                            {productionMetrics.bound.toLocaleString()}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>12/Mo Quoted</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#3b82f6" }}>
                            {productionMetrics.quoted.toLocaleString()}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>12/Mo Hit ratio</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
                            {productionMetrics.hitRatio > 0 ? `${productionMetrics.hitRatio.toFixed(1)}%` : "—"}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>3 Year Loss Ratio</div>
                          <div style={{ 
                            fontSize: 14, 
                            fontWeight: 700, 
                            color: productionMetrics.lossRatio !== null && productionMetrics.lossRatio > 60 ? "#dc2626" 
                              : productionMetrics.lossRatio !== null && productionMetrics.lossRatio > 50 ? "#f59e0b" 
                              : "#059669",
                          }}>
                            {productionMetrics.lossRatio !== null ? `${productionMetrics.lossRatio.toFixed(1)}%` : "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Activity Metrics Box */}
                  {agencyActivityMetrics && (
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      padding: "12px",
                      background: "#f9fafb",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      minWidth: 200,
                      alignItems: "flex-end",
                    }}>
                      {/* Activity Header */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%", alignItems: "flex-end" }}>
                        <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right", width: "100%" }}>
                          Activity
                        </div>
                      </div>
                      
                      {/* Activity Metrics */}
                      <div style={{ 
                        display: "grid", 
                        gridTemplateColumns: "1fr 1fr", 
                        gap: 8, 
                        width: "100%",
                        paddingTop: 8,
                        borderTop: "1px solid #e5e7eb",
                      }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>In Person (12 Mo)</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#1e40af" }}>
                            {agencyActivityMetrics.inPerson12Mo}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>Emails (12 Mo)</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#059669" }}>
                            {agencyActivityMetrics.emails12Mo}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>Phone (12 Mo)</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#7c3aed" }}>
                            {agencyActivityMetrics.phone12Mo}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>Email + Phone (30d)</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#dc2626" }}>
                            {agencyActivityMetrics.emailsAndPhone30d}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {isEditingAgency ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <label style={labelStyle}>Agency Name*</label>
                <input
                  value={editAgencyName}
                  onChange={(e) => setEditAgencyName(e.target.value)}
                  style={inputStyle}
                  placeholder="Agency Name"
                />
              </div>
              <div>
                <label style={labelStyle}>DBA (Doing Business As)</label>
                <input
                  value={editAgencyDBA}
                  onChange={(e) => setEditAgencyDBA(e.target.value)}
                  style={inputStyle}
                  placeholder="Optional DBA name"
                />
              </div>
              <div>
                <label style={labelStyle}>Web Address</label>
                <input
                  type="url"
                  value={editAgencyWebAddress}
                  onChange={(e) => setEditAgencyWebAddress(e.target.value)}
                  style={inputStyle}
                  placeholder="https://www.example.com"
                />
              </div>
              <div>
                <label style={labelStyle}>Primary Underwriter</label>
                <select
                  value={editAgencyPrimaryUW || ""}
                  onChange={(e) => setEditAgencyPrimaryUW(e.target.value ? Number(e.target.value) : null)}
                  style={selectStyle}
                >
                  <option value="">Unassigned</option>
                  {officeEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={handleSaveAgency}
                  style={{
                    ...primaryButtonStyle,
                    padding: "6px 16px",
                    fontSize: 12,
                  }}
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingAgency(false)}
                  style={{
                    ...secondaryButtonStyle,
                    padding: "6px 16px",
                    fontSize: 12,
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {agency?.dba && (
                <div style={{ fontSize: 16, fontWeight: 600, color: "#4b5563", marginTop: 2, marginBottom: 8 }}>
                  {agency.dba}
                </div>
              )}
              <div style={{ fontSize: 14, color: "#4b5563", marginBottom: 4 }}>
                Code: <strong>{agency?.code || "—"}</strong>
                {"  "}·{"  "}
                Primary UW: {agency?.primary_underwriter ? (
                  <strong>
                    <button
                      type="button"
                      onClick={() => {
                        const uw = officeEmployees.find(e => e.name === agency?.primary_underwriter || e.id === agency?.primary_underwriter_id);
                        const params = new URLSearchParams();
                        if (uw?.id) params.set("employeeId", String(uw.id));
                        if (agency?.primary_underwriter) params.set("employeeName", agency.primary_underwriter);
                        navigate(`/crm/employees?${params.toString()}`);
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#2563eb",
                        cursor: "pointer",
                        textDecoration: "underline",
                        padding: 0,
                        fontSize: "inherit",
                        fontWeight: "inherit",
                      }}
                    >
                      {agency.primary_underwriter}
                    </button>
                  </strong>
                ) : (
                  <strong>Unassigned</strong>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                {agency?.web_address && (
                  <div style={{ fontSize: 13 }}>
                    <span style={{ color: "#6b7280", marginRight: 6 }}>Website:</span>
                    <a
                      href={agency.web_address.startsWith('http') ? agency.web_address : `https://${agency.web_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#2563eb", textDecoration: "underline" }}
                    >
                      {agency.web_address}
                    </a>
                  </div>
                )}
                {contacts.filter(c => c.email).length > 0 && (
                  <div style={{ marginTop: 4, display: "flex", gap: 8, alignItems: "center" }}>
                    <a
                      href={`mailto:?bcc=${contacts.filter(c => c.email).map(c => c.email).join(',')}`}
                      style={{
                        color: "#2563eb",
                        textDecoration: "none",
                        fontSize: 12,
                        padding: "4px 8px",
                        border: "1px solid #2563eb",
                        borderRadius: 4,
                        cursor: "pointer",
                        display: "inline-block",
                      }}
                    >
                      Email All Contacts
                    </a>
                    <button
                      type="button"
                      onClick={() => setIsAgencyDetailsExpanded(!isAgencyDetailsExpanded)}
                      style={{
                        color: "#2563eb",
                        fontSize: 12,
                        padding: "4px 8px",
                        border: "1px solid #2563eb",
                        borderRadius: 4,
                        cursor: "pointer",
                        background: isAgencyDetailsExpanded ? "#eff6ff" : "#fff",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {isAgencyDetailsExpanded ? "▼" : "▶"} Agency Details
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Expanded Agency Details Section */}
        {isAgencyDetailsExpanded && (
          <div style={{
            marginTop: 16,
            padding: "20px",
            background: "#f9fafb",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#111827" }}>
              Agency Information
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Left Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Agent Rating</label>
                  <select
                    value={agencyRating}
                    onChange={(e) => setAgencyRating(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">-- Select Rating --</option>
                    <option value="A">A - Excellent</option>
                    <option value="B">B - Good</option>
                    <option value="C">C - Fair</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Agency Plan</label>
                  <textarea
                    value={agencyPlan}
                    onChange={(e) => setAgencyPlan(e.target.value)}
                    placeholder="Enter agency business plan, strategy, or goals..."
                    rows={4}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>History</label>
                  <textarea
                    value={agencyHistory}
                    onChange={(e) => setAgencyHistory(e.target.value)}
                    placeholder="Enter agency history, background, key milestones..."
                    rows={4}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Types of Business</label>
                  <textarea
                    value={typesOfBusiness}
                    onChange={(e) => setTypesOfBusiness(e.target.value)}
                    placeholder="Enter types of business written, industries served, risk classes..."
                    rows={4}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>
              </div>

              {/* Right Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Specializations</label>
                  <textarea
                    value={agencySpecializations}
                    onChange={(e) => setAgencySpecializations(e.target.value)}
                    placeholder="Enter agency specializations, niche markets, expertise areas..."
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Annual Volume</label>
                  <input
                    type="text"
                    value={agencyVolume}
                    onChange={(e) => setAgencyVolume(e.target.value)}
                    placeholder="e.g., $5M, $10-15M"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Years in Business</label>
                  <input
                    type="text"
                    value={agencyYearsInBusiness}
                    onChange={(e) => setAgencyYearsInBusiness(e.target.value)}
                    placeholder="e.g., 15, 20+"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Licenses & Certifications</label>
                  <textarea
                    value={agencyLicenses}
                    onChange={(e) => setAgencyLicenses(e.target.value)}
                    placeholder="Enter licenses, certifications, designations..."
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Markets & Carriers</label>
                  <textarea
                    value={agencyMarkets}
                    onChange={(e) => setAgencyMarkets(e.target.value)}
                    placeholder="Enter markets accessed, carrier relationships, binding authority..."
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  // TODO: Save agency details to backend
                  alert("Save functionality will be implemented when backend fields are added");
                }}
                style={primaryButtonStyle}
              >
                Save Agency Details
              </button>
              <button
                type="button"
                onClick={() => setIsAgencyDetailsExpanded(false)}
                style={secondaryButtonStyle}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {agency?.notes && <div style={{ fontSize: 12 }}>Notes: {agency.notes}</div>}

        {selectedContact && (
          <div 
            style={{ 
              marginTop: 16,
              padding: "20px",
              background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
              borderRadius: 12,
              border: "2px solid #e2e8f0",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Contact Details
              </div>
              {/* All buttons on the right side */}
              <div style={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "flex-end", 
                gap: 8,
              }}>
                {/* Edit and Delete buttons */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleEditContact}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1px solid #2563eb",
                      background: "#eff6ff",
                      color: "#2563eb",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#2563eb";
                      e.currentTarget.style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#eff6ff";
                      e.currentTarget.style.color = "#2563eb";
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteContact}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1px solid #ef4444",
                      background: "#fef2f2",
                      color: "#b91c1c",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#ef4444";
                      e.currentTarget.style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#fef2f2";
                      e.currentTarget.style.color = "#b91c1c";
                    }}
                  >
                    Delete
                  </button>
                </div>
                {/* New Business Button and Counter */}
                {!isEditingContact && selectedContact && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        // Navigate to workflow with contact email pre-filled
                        navigate(`/workbench?contactEmail=${encodeURIComponent(selectedContact.email || "")}&contactId=${selectedContact.id}`);
                      }}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: "1px solid #10b981",
                        background: "#ecfdf5",
                        color: "#059669",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        transition: "all 0.2s",
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#10b981";
                        e.currentTarget.style.color = "#fff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#ecfdf5";
                        e.currentTarget.style.color = "#059669";
                      }}
                    >
                      New Business
                    </button>
                    {contactNewBusinessCount !== null && (
                      <div style={{
                        fontSize: 11,
                        color: "#6b7280",
                        textAlign: "right",
                        padding: "4px 8px",
                        background: "#f9fafb",
                        borderRadius: 4,
                        border: "1px solid #e5e7eb",
                      }}>
                        <div style={{ fontSize: 10, marginBottom: 2 }}>New Business (12mo)</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                          {contactNewBusinessCount}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {isEditingContact ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                <input
                  placeholder="Name*"
                  value={editContactName}
                  onChange={(e) => setEditContactName(e.target.value)}
                  style={inputStyle}
                />
                <input
                  placeholder="Title"
                  value={editContactTitle}
                  onChange={(e) => setEditContactTitle(e.target.value)}
                  style={inputStyle}
                />
                <input
                  placeholder="Email"
                  value={editContactEmail}
                  onChange={(e) => setEditContactEmail(e.target.value)}
                  style={inputStyle}
                />
                <input
                  placeholder="Phone"
                  value={editContactPhone}
                  onChange={(e) => setEditContactPhone(e.target.value)}
                  style={inputStyle}
                />
                <input
                  placeholder="LinkedIn URL"
                  value={editContactLinkedIn}
                  onChange={(e) => setEditContactLinkedIn(e.target.value)}
                  style={inputStyle}
                />
                <textarea
                  placeholder="Notes"
                  value={editContactNotes}
                  onChange={(e) => setEditContactNotes(e.target.value)}
                  rows={4}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                    Agency Code (to move contact to different agency)
                  </label>
                  <input
                    placeholder="Leave blank to keep current agency"
                    value={editContactAgencyCode}
                    onChange={(e) => setEditContactAgencyCode(e.target.value)}
                    style={inputStyle}
                  />
                  {editContactAgencyCode.trim() && editContactAgencyCode.trim() !== (agency?.code || "") && (
                    <div style={{ fontSize: 11, color: "#2563eb", marginTop: 4 }}>
                      Contact will be moved to agency with code "{editContactAgencyCode.trim()}"
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                    Contact Frequency (Days Between Contacts)
                  </label>
                  <select
                    value={editContactFrequencyDays === null ? "never" : String(editContactFrequencyDays)}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "never") {
                        setEditContactFrequencyDays(null);
                      } else {
                        setEditContactFrequencyDays(Number(value));
                      }
                    }}
                    style={{
                      ...inputStyle,
                      padding: "8px",
                      cursor: "pointer",
                    }}
                  >
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                    <option value="120">120 days</option>
                    <option value="never">Never</option>
                  </select>
                  {editContactFrequencyDays === null && (
                    <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>
                      Contact will not appear in "Contacts Needing Attention" list
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingContact(false)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "1px solid #d1d5db",
                      background: "#f9fafb",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveContactEdit}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "1px solid #2563eb",
                      background: "#2563eb",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                    disabled={!editContactName.trim()}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Name and Title */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>
                      {selectedContact.name}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => {
                          const params = new URLSearchParams();
                          if (selectedContact.email) params.set("email", selectedContact.email);
                          if (selectedContact.id) params.set("contactId", String(selectedContact.id));
                          if (agencyIdNum) params.set("agencyId", String(agencyIdNum));
                          navigate(`/crm/email-tools?${params.toString()}`);
                        }}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: "1px solid #2563eb",
                          background: "#eff6ff",
                          color: "#2563eb",
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#2563eb";
                          e.currentTarget.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#eff6ff";
                          e.currentTarget.style.color = "#2563eb";
                        }}
                        title="Open Email Templates for this contact"
                      >
                        📧 Template
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const params = new URLSearchParams();
                          if (selectedContact.email) params.set("email", selectedContact.email);
                          if (selectedContact.id) params.set("contactId", String(selectedContact.id));
                          if (agencyIdNum) params.set("agencyId", String(agencyIdNum));
                          navigate(`/crm/email-builder?${params.toString()}`);
                        }}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: "1px solid #059669",
                          background: "#ecfdf5",
                          color: "#059669",
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#059669";
                          e.currentTarget.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#ecfdf5";
                          e.currentTarget.style.color = "#059669";
                        }}
                        title="Open Email Builder for this contact"
                      >
                        ✉️ Builder
                      </button>
                    </div>
                  </div>
                  {selectedContact.title && (
                    <div style={{ fontSize: 14, color: "#64748b", fontWeight: 500 }}>
                      {selectedContact.title}
                    </div>
                  )}
                </div>

                {/* Contact Information Grid */}
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "auto 1fr", 
                  gap: "12px 16px",
                  marginBottom: 16,
                  padding: "16px",
                  background: "#ffffff",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                }}>
                  {selectedContact.phone && (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>📞</div>
                      <div style={{ fontSize: 13, color: "#111827" }}>
                        <a href={`tel:${selectedContact.phone}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                          {selectedContact.phone}
                        </a>
                      </div>
                    </>
                  )}
                  {selectedContact.email && (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>✉️</div>
                      <div style={{ fontSize: 13, color: "#111827" }}>
                        <a href={`mailto:${selectedContact.email}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                          {selectedContact.email}
                        </a>
                      </div>
                    </>
                  )}
                  {selectedContact.linkedin_url && (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>🔗</div>
                      <div style={{ fontSize: 13, color: "#111827" }}>
                        <a
                          href={selectedContact.linkedin_url.startsWith('http://') || selectedContact.linkedin_url.startsWith('https://') 
                            ? selectedContact.linkedin_url 
                            : `https://${selectedContact.linkedin_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#2563eb", textDecoration: "underline", cursor: "pointer" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Ensure the link opens
                            const url = selectedContact.linkedin_url!.startsWith('http://') || selectedContact.linkedin_url!.startsWith('https://') 
                              ? selectedContact.linkedin_url! 
                              : `https://${selectedContact.linkedin_url}`;
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }}
                        >
                          LinkedIn Profile
                        </a>
                      </div>
                    </>
                  )}
                </div>

                {/* Do Not Contact Flag */}
                {selectedContact.do_not_contact && (
                  <div
                    style={{
                      fontSize: 12,
                      marginBottom: 12,
                      padding: "8px 12px",
                      background: "#fef2f2",
                      borderLeft: "3px solid #dc2626",
                      borderRadius: 6,
                      color: "#991b1b",
                      fontWeight: 600,
                    }}
                  >
                    ⚠️ Do Not Contact
                  </div>
                )}

                {/* Contact Details - Expandable */}
                <div style={{ marginBottom: 16 }}>
                  <button
                    type="button"
                    onClick={() => setIsContactDetailsExpanded(!isContactDetailsExpanded)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 12px",
                      background: isContactDetailsExpanded ? "#eff6ff" : "#fff",
                      border: "1px solid #3b82f6",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#1e40af",
                      width: "100%",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>
                      {isContactDetailsExpanded ? "▼" : "▶"} Contact Details
                    </span>
                  </button>
                  
                  {isContactDetailsExpanded && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: "16px",
                        background: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                      }}
                    >
                      {(() => {
                        const logsForContact = logsForAgency
                          .filter((log) => log.contact_id === selectedContact.id)
                          .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
                        const contactCount = logsForContact.length;
                        const inPersonCount = logsForContact.filter(log => log.action === "In Person").length;
                        const emailCount = logsForContact.filter(log => log.action === "Email" || log.action === "Email Sent").length;
                        const phoneCount = logsForContact.filter(log => log.action === "Call / Zoom").length;
                        
                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {/* Contact Statistics */}
                            <div style={{ 
                              display: "grid", 
                              gridTemplateColumns: "repeat(4, 1fr)", 
                              gap: 8,
                              padding: "12px",
                              background: "#ffffff",
                              borderRadius: 6,
                              border: "1px solid #e5e7eb",
                            }}>
                              <div style={{ textAlign: "center" }}>
                                <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4 }}>Total Contacts</div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{contactCount}</div>
                              </div>
                              <div style={{ textAlign: "center" }}>
                                <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4 }}>In Person</div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: "#1e40af" }}>{inPersonCount}</div>
                              </div>
                              <div style={{ textAlign: "center" }}>
                                <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4 }}>Emails</div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: "#059669" }}>{emailCount}</div>
                              </div>
                              <div style={{ textAlign: "center" }}>
                                <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4 }}>Phone</div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: "#7c3aed" }}>{phoneCount}</div>
                              </div>
                            </div>
                            
                            {isEditingContact ? (
                              <>
                                {/* Previous Agencies */}
                                <div>
                                  <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" }}>
                                    Previous Agencies
                                  </label>
                                  <textarea
                                    value={editContactPreviousAgencies}
                                    onChange={(e) => setEditContactPreviousAgencies(e.target.value)}
                                    placeholder="List previous agencies this contact worked with..."
                                    rows={2}
                                    style={{ ...inputStyle, resize: "vertical", fontSize: 12 }}
                                  />
                                </div>
                                
                                {/* Likes / Hobbies */}
                                <div>
                                  <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" }}>
                                    Likes / Hobbies
                                  </label>
                                  <textarea
                                    value={editContactLikesHobbies}
                                    onChange={(e) => setEditContactLikesHobbies(e.target.value)}
                                    placeholder="Personal interests, hobbies, etc..."
                                    rows={2}
                                    style={{ ...inputStyle, resize: "vertical", fontSize: 12 }}
                                  />
                                </div>
                                
                                {/* Additional Info */}
                                <div>
                                  <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" }}>
                                    Additional Information
                                  </label>
                                  <textarea
                                    value={editContactAdditionalInfo}
                                    onChange={(e) => setEditContactAdditionalInfo(e.target.value)}
                                    placeholder="Any other relevant information about this contact..."
                                    rows={3}
                                    style={{ ...inputStyle, resize: "vertical", fontSize: 12 }}
                                  />
                                </div>
                                
                                {/* Notes */}
                                <div>
                                  <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" }}>
                                    Notes
                                  </label>
                                  <textarea
                                    value={editContactNotes}
                                    onChange={(e) => setEditContactNotes(e.target.value)}
                                    placeholder="Add notes about this contact..."
                                    rows={4}
                                    style={{ ...inputStyle, resize: "vertical", fontSize: 12 }}
                                  />
                                </div>
                              </>
                            ) : (
                              <>
                                {/* Previous Agencies - Always show */}
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>Previous Agencies:</div>
                                  <div style={{ 
                                    fontSize: 12, 
                                    color: selectedContact.previous_agencies ? "#111827" : "#9ca3af", 
                                    fontStyle: selectedContact.previous_agencies ? "normal" : "italic",
                                    whiteSpace: "pre-wrap", 
                                    padding: "8px", 
                                    background: "#ffffff", 
                                    borderRadius: 4,
                                    minHeight: "40px",
                                    border: "1px solid #e5e7eb"
                                  }}>
                                    {selectedContact.previous_agencies || "No previous agencies listed"}
                                  </div>
                                </div>
                                
                                {/* Likes / Hobbies - Always show */}
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>Likes / Hobbies:</div>
                                  <div style={{ 
                                    fontSize: 12, 
                                    color: selectedContact.likes_hobbies ? "#111827" : "#9ca3af", 
                                    fontStyle: selectedContact.likes_hobbies ? "normal" : "italic",
                                    whiteSpace: "pre-wrap", 
                                    padding: "8px", 
                                    background: "#ffffff", 
                                    borderRadius: 4,
                                    minHeight: "40px",
                                    border: "1px solid #e5e7eb"
                                  }}>
                                    {selectedContact.likes_hobbies || "No likes/hobbies listed"}
                                  </div>
                                </div>
                                
                                {/* Additional Info - Always show */}
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>Additional Information:</div>
                                  <div style={{ 
                                    fontSize: 12, 
                                    color: selectedContact.additional_info ? "#111827" : "#9ca3af", 
                                    fontStyle: selectedContact.additional_info ? "normal" : "italic",
                                    whiteSpace: "pre-wrap", 
                                    padding: "8px", 
                                    background: "#ffffff", 
                                    borderRadius: 4,
                                    minHeight: "60px",
                                    border: "1px solid #e5e7eb"
                                  }}>
                                    {selectedContact.additional_info || "No additional information"}
                                  </div>
                                </div>
                                
                                {/* Notes - Always show */}
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>Notes:</div>
                                  <div style={{ 
                                    fontSize: 12, 
                                    color: selectedContact.notes ? "#111827" : "#9ca3af", 
                                    fontStyle: selectedContact.notes ? "normal" : "italic",
                                    whiteSpace: "pre-wrap", 
                                    padding: "8px", 
                                    background: "#ffffff", 
                                    borderRadius: 4,
                                    minHeight: "60px",
                                    border: "1px solid #e5e7eb"
                                  }}>
                                    {selectedContact.notes || "No notes"}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Marketing Calls Section */}
                <div
                  style={{
                    fontSize: 12,
                    paddingTop: 16,
                    borderTop: "2px solid #e2e8f0",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "#111827" }}>
                    📞 Marketing Calls for This Contact
                  </div>
                  {(() => {
                    const logsForContact = logsForAgency
                      .filter((log) => log.contact_id === selectedContact.id)
                      .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
                    
                    if (logsForContact.length === 0) {
                      return (
                        <div style={{ 
                          fontSize: 12, 
                          color: "#94a3b8",
                          padding: "16px",
                          textAlign: "center",
                          background: "#f8fafc",
                          borderRadius: 8,
                          border: "1px dashed #cbd5e1",
                        }}>
                          No marketing calls yet for this contact.
                        </div>
                      );
                    }
                    
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {logsForContact.map((log) => (
                          <div
                            key={log.id}
                            style={{
                              fontSize: 12,
                              padding: "12px",
                              background: "#f8fafc",
                              borderRadius: 8,
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            <div style={{ display: "flex", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 600, color: "#111827" }}>{formatDateTime(log.datetime)}</span>
                              <span style={{ color: "#cbd5e1" }}>•</span>
                              <span style={{ color: "#64748b" }}>{log.user}</span>
                              <span style={{ color: "#cbd5e1" }}>•</span>
                              <span style={{ 
                                padding: "2px 8px",
                                background: "#dbeafe",
                                color: "#1e40af",
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600,
                              }}>
                                {log.action}
                              </span>
                            </div>
                            {log.notes && (
                              <div style={{ color: "#475569", fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
                                {log.notes.length > 80 ? `${log.notes.slice(0, 80)}...` : log.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Log form + history */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0, maxWidth: "100%" }}>
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Log New Marketing Call</div>
          
          {/* Contact Select */}
          <label style={{ fontSize: 11, color: "#374151", display: "block" }}>
            Contact
            <select
              value={selectedContactId || ""}
              onChange={(e) => {
                const contactId = e.target.value ? Number(e.target.value) : null;
                setSelectedContactId(contactId);
                if (contactId) {
                  setPrimaryContactId(contactId);
                }
              }}
              style={{ ...selectStyle, fontSize: 12, padding: "6px 8px" }}
            >
              <option value="">Select a contact...</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.title ? ` - ${c.title}` : ""}
                </option>
              ))}
            </select>
          </label>

          {/* Underwriter Select */}
          <label style={{ fontSize: 11, color: "#374151", display: "block" }}>
            Underwriter
            <select
              value={selectedUnderwriter}
              onChange={(e) => setSelectedUnderwriter(e.target.value)}
              style={{ ...selectStyle, fontSize: 12, padding: "6px 8px" }}
            >
              <option value="">Select an underwriter...</option>
              {underwritersForOffice.map((uw) => (
                <option key={uw.id} value={uw.name}>
                  {uw.name}
                </option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: 11, color: "#374151", display: "block" }}>
            Action
            <select
              value={logAction}
              onChange={(e) => setLogAction(e.target.value as LogAction)}
              style={{ ...inputStyle, fontSize: 12, padding: "6px 8px" }}
            >
              {LOG_ACTION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <label style={{ fontSize: 11, color: "#374151", flex: 1, minWidth: 120 }}>
              Date
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                style={{ ...inputStyle, fontSize: 12, padding: "6px 8px" }}
              />
            </label>
          </div>

          <label style={{ fontSize: 11, color: "#374151", display: "block" }}>
            Notes
            <textarea
              value={logNotes}
              onChange={(e) => setLogNotes(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical", fontSize: 12, padding: "6px 8px" }}
            />
          </label>

          {logError && <div style={{ color: "red", fontSize: 11 }}>{logError}</div>}
          {hasAttemptedSubmit && !isLogFormValid && !logError && (
            <div style={{ color: "#b91c1c", fontSize: 11 }}>
              Contact, underwriter, action, and date are required to save a log.
            </div>
          )}
          {logSuccess && <div style={{ color: "#16a34a", fontSize: 11 }}>{logSuccess}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
            <button
              type="button"
              onClick={handleCreateLog}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid #2563eb",
                background: "#2563eb",
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 12,
              }}
              disabled={isSavingLog || !isLogFormValid}
            >
              {isSavingLog ? "Saving..." : "Save Log"}
            </button>
          </div>
        </div>

        <div style={{ ...cardStyle, padding: "10px 12px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Marketing Log History</div>
          {logsForAgency.length === 0 ? (
            <div style={{ fontSize: 12, color: "#6b7280" }}>No marketing logs yet for this agency.</div>
          ) : (
            <div style={tableContainerStyle}>
              <table style={tableBaseStyle}>
                <thead>
                  <tr>
                    <th style={tableHeaderStickyStyle}>Date</th>
                    <th style={tableHeaderStickyStyle}>Contact</th>
                    <th style={tableHeaderStickyStyle}>User</th>
                    <th style={tableHeaderStickyStyle}>Action</th>
                    <th style={tableHeaderStickyStyle}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {logsForAgency
                    .slice()
                    .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
                    .map((log) => {
                      // Prefer frozen contact name, fall back to current contact lookup
                      const contactName =
                        log.contact ??
                        (log.contact_id
                          ? contacts.find(c => c.id === log.contact_id)?.name || null
                          : null) ??
                        "—";
                      
                      const isExpanded = expandedLogId === log.id;
                      const hasLongNotes = log.notes && log.notes.length > 80;
                      
                      const contact = log.contact_id ? contacts.find(c => c.id === log.contact_id) : null;
                      const logEmployee = officeEmployees.find(e => e.name.toLowerCase() === (log.user || "").toLowerCase());
                      
                      return (
                        <React.Fragment key={log.id}>
                          <tr>
                            <td style={tableCellStyle}>{formatDateTime(log.datetime)}</td>
                            <td style={tableCellStyle}>
                              {contact ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedContactId(contact.id)}
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    color: "#2563eb",
                                    cursor: "pointer",
                                    textDecoration: "underline",
                                    padding: 0,
                                    fontSize: "inherit",
                                  }}
                                >
                                  {contactName}
                                </button>
                              ) : (
                                contactName
                              )}
                            </td>
                            <td style={tableCellStyle}>
                              {logEmployee ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const params = new URLSearchParams();
                                    if (logEmployee.id) params.set("employeeId", String(logEmployee.id));
                                    if (logEmployee.name) params.set("employeeName", logEmployee.name);
                                    navigate(`/crm/employees?${params.toString()}`);
                                  }}
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    color: "#2563eb",
                                    cursor: "pointer",
                                    textDecoration: "underline",
                                    padding: 0,
                                    fontSize: "inherit",
                                  }}
                                >
                                  {log.user}
                                </button>
                              ) : (
                                log.user
                              )}
                            </td>
                            <td style={tableCellStyle}>{log.action}</td>
                            <td style={{ ...tableCellStyle, maxWidth: 300, padding: "8px" }}>
                              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                                <div style={{ 
                                  flex: "1 1 0",
                                  minWidth: 0,
                                  wordBreak: "break-word",
                                  overflowWrap: "break-word",
                                  paddingRight: 8,
                                }}>
                                  {log.notes && log.notes.length > 0 ? (
                                    hasLongNotes && !isExpanded ? (
                                      <div style={{ lineHeight: 1.5 }}>
                                        <span style={{ display: "inline" }}>{log.notes.slice(0, 80)}</span>
                                        <span style={{ color: "#6b7280" }}>...</span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedLogId(log.id);
                                          }}
                                          style={{
                                            marginLeft: 6,
                                            border: "none",
                                            background: "none",
                                            color: "#2563eb",
                                            cursor: "pointer",
                                            fontSize: 11,
                                            fontWeight: 600,
                                            textDecoration: "underline",
                                            padding: 0,
                                            whiteSpace: "nowrap",
                                            display: "inline-block",
                                            verticalAlign: "baseline",
                                          }}
                                        >
                                          [more]
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteLog(log.id)}
                                          style={{
                                            marginLeft: 8,
                                            border: "1px solid #ef4444",
                                            background: "#fff",
                                            color: "#b91c1c",
                                            borderRadius: 4,
                                            padding: "2px 8px",
                                            fontSize: 11,
                                            cursor: "pointer",
                                            whiteSpace: "nowrap",
                                            fontWeight: 500,
                                            display: "inline-block",
                                            verticalAlign: "baseline",
                                          }}
                                          disabled={isDeletingLogId === log.id}
                                        >
                                          {isDeletingLogId === log.id ? "Deleting..." : "Delete"}
                                        </button>
                                      </div>
                                    ) : hasLongNotes && isExpanded ? (
                                      <div style={{ lineHeight: 1.5 }}>
                                        <div style={{ marginBottom: 8, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                          {log.notes}
                                        </div>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedLogId(null);
                                          }}
                                          style={{
                                            border: "none",
                                            background: "none",
                                            color: "#2563eb",
                                            cursor: "pointer",
                                            fontSize: 11,
                                            fontWeight: 600,
                                            textDecoration: "underline",
                                            padding: 0,
                                            whiteSpace: "nowrap",
                                            display: "inline-block",
                                          }}
                                        >
                                          [less]
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteLog(log.id)}
                                          style={{
                                            marginLeft: 8,
                                            border: "1px solid #ef4444",
                                            background: "#fff",
                                            color: "#b91c1c",
                                            borderRadius: 4,
                                            padding: "2px 8px",
                                            fontSize: 11,
                                            cursor: "pointer",
                                            whiteSpace: "nowrap",
                                            fontWeight: 500,
                                            display: "inline-block",
                                            verticalAlign: "baseline",
                                          }}
                                          disabled={isDeletingLogId === log.id}
                                        >
                                          {isDeletingLogId === log.id ? "Deleting..." : "Delete"}
                                        </button>
                                      </div>
                                    ) : (
                                      <span style={{ wordBreak: "break-word", whiteSpace: "pre-wrap", lineHeight: 1.5, display: "inline-block" }}>
                                        {log.notes}
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteLog(log.id)}
                                          style={{
                                            marginLeft: 8,
                                            border: "1px solid #ef4444",
                                            background: "#fff",
                                            color: "#b91c1c",
                                            borderRadius: 4,
                                            padding: "2px 8px",
                                            fontSize: 11,
                                            cursor: "pointer",
                                            whiteSpace: "nowrap",
                                            fontWeight: 500,
                                            display: "inline-block",
                                            verticalAlign: "baseline",
                                          }}
                                          disabled={isDeletingLogId === log.id}
                                        >
                                          {isDeletingLogId === log.id ? "Deleting..." : "Delete"}
                                        </button>
                                      </span>
                                    )
                                  ) : (
                                    <span style={{ color: "#9ca3af" }}>
                                      —
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteLog(log.id)}
                                        style={{
                                          marginLeft: 8,
                                          border: "1px solid #ef4444",
                                          background: "#fff",
                                          color: "#b91c1c",
                                          borderRadius: 4,
                                          padding: "2px 8px",
                                          fontSize: 11,
                                          cursor: "pointer",
                                          whiteSpace: "nowrap",
                                          fontWeight: 500,
                                          display: "inline-block",
                                          verticalAlign: "baseline",
                                        }}
                                        disabled={isDeletingLogId === log.id}
                                      >
                                        {isDeletingLogId === log.id ? "Deleting..." : "Delete"}
                                      </button>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {error && <div style={{ gridColumn: "1 / span 3", color: "red", fontSize: 12 }}>{error}</div>}
      {isLoading && <div style={{ gridColumn: "1 / span 3", fontSize: 12, color: "#6b7280" }}>Loading agency...</div>}
      </div>
    </>
  );
};

export default CrmAgencyDetailPage;
