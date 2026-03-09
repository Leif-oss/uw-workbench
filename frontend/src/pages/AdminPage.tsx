import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WorkbenchLayout } from "../components/WorkbenchLayout";
import { cardStyle, sidebarHeadingStyle } from "../ui/designSystem";
import { apiGet, apiPost, apiDelete, apiPut, apiPatch, API_BASE_URL, getAuthHeaders } from "../api/client";

interface Office {
  id: number;
  code: string;
  name: string;
}

interface Employee {
  id: number;
  name: string;
  email?: string | null;
  office_id?: number | null; // Deprecated: kept for backward compatibility
  office_ids?: number[]; // List of office IDs (many-to-many relationship)
  office_name?: string;
  website?: string | null;
  role?: string | null;
}

interface UserInfo {
  has_account: boolean;
  is_admin: boolean;
  role: string | null;
  username: string | null;
  email: string | null;
}

interface Agency {
  id: number;
  name: string;
  code: string;
  office_id: number;
}

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [offices, setOffices] = useState<Office[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [userInfoMap, setUserInfoMap] = useState<Record<number, UserInfo>>({});
  const [resettingPassword, setResettingPassword] = useState<number | null>(null);
  
  // User accounts state (for displaying all users including orphaned ones)
  const [allUserAccounts, setAllUserAccounts] = useState<any[]>([]);
  const [showUserAccounts, setShowUserAccounts] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Temporary password modal state
  const [tempPasswordModal, setTempPasswordModal] = useState<{
    show: boolean;
    username: string;
    password: string;
    employeeName: string;
  } | null>(null);
  
  // Password reset link modal state
  const [passwordResetModal, setPasswordResetModal] = useState<{
    show: boolean;
    username: string;
    email: string;
    resetLink: string;
    employeeName: string;
    emailSent: boolean;
  } | null>(null);

  // Employee form state
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeeEmail, setNewEmployeeEmail] = useState("");
  const [newEmployeeOfficeIds, setNewEmployeeOfficeIds] = useState<number[]>([]);
  const [newEmployeeRole, setNewEmployeeRole] = useState<string>("");
  
  const [editingEmployeeName, setEditingEmployeeName] = useState<string | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [editEmployeeEmail, setEditEmployeeEmail] = useState("");
  const [editEmployeeOfficeIds, setEditEmployeeOfficeIds] = useState<number[]>([]);
  const [editEmployeeRole, setEditEmployeeRole] = useState<string>("");

  // Production import state
  const [importOffice, setImportOffice] = useState<string>("");
  const [importMonth, setImportMonth] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [useMultiOfficeImport, setUseMultiOfficeImport] = useState(true); // New: multi-office import toggle

  // Agency deletion state
  const [deleteOfficeFilter, setDeleteOfficeFilter] = useState<number | null>(null);
  const [deleteAgencyId, setDeleteAgencyId] = useState<number | null>(null);

  // Office management state
  const [showAddOffice, setShowAddOffice] = useState(false);
  const [newOfficeCode, setNewOfficeCode] = useState("");
  const [newOfficeName, setNewOfficeName] = useState("");
  const [deletingOfficeId, setDeletingOfficeId] = useState<number | null>(null);

  useEffect(() => {
    // TEMPORARY: Allow access without admin check for initial setup
    // TODO: Remove this after creating first admin user
    const TEMP_ALLOW_ADMIN_WITHOUT_AUTH = true; // Set to false after setup
    
    const isAdmin = localStorage.getItem("is_admin") === "true";
    if (!isAdmin && !TEMP_ALLOW_ADMIN_WITHOUT_AUTH) {
      // Redirect non-admin users to dashboard
      navigate("/dashboard", { replace: true });
      return;
    }
    
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // NOTE: We fetch EMPLOYEES (not Users). 
      // Employees are the people in the system (name, email, office, role).
      // Users are login accounts (username, password) that can be linked to Employees.
      // An Employee can exist without a User account, and vice versa.
      // The admin panel shows ALL Employees, regardless of whether they have User accounts.
      const [officesData, employeesData, agenciesData] = await Promise.all([
        apiGet<Office[]>("/offices"),
        apiGet<Employee[]>("/employees"),  // This returns ALL employees from the employees table
        apiGet<Agency[]>("/agencies"),
      ]);
      
      console.log("Fetched data:", { 
        officesCount: officesData?.length || 0, 
        employeesCount: employeesData?.length || 0,
        agenciesCount: agenciesData?.length || 0,
        employees: employeesData 
      });
      
      // Debug: Log employee names to help find "leif"
      if (employeesData && employeesData.length > 0) {
        const employeeDetails = employeesData.map(e => ({ id: e.id, name: e.name, email: e.email, office_id: e.office_id, office_ids: e.office_ids, role: e.role }));
        console.log("Employee details:", employeeDetails);
        console.log("Employee names (all):", employeeDetails.map(e => e.name));
      } else {
        console.warn("No employees found in API response");
      }
      
      setOffices(officesData || []);
      setEmployees(employeesData || []);
      setAgencies(agenciesData || []);
      
      // Fetch user info for each employee
      if (employeesData && employeesData.length > 0) {
        const userInfoPromises = employeesData.map(async (emp) => {
          try {
            const userInfo = await apiGet<UserInfo>(`/admin/employees/${emp.id}/user-info`);
            return { employeeId: emp.id, userInfo };
          } catch (err) {
            console.error(`Failed to fetch user info for employee ${emp.id}:`, err);
            return { employeeId: emp.id, userInfo: { has_account: false, is_admin: false, role: null, username: null, email: null } };
          }
        });
        
        const userInfoResults = await Promise.all(userInfoPromises);
        const userInfoMapResult: Record<number, UserInfo> = {};
        userInfoResults.forEach(({ employeeId, userInfo }) => {
          userInfoMapResult[employeeId] = userInfo;
        });
        setUserInfoMap(userInfoMapResult);
      } else {
        console.warn("No employees found in response");
        setUserInfoMap({});
      }
      
      // Fetch all user accounts (including orphaned ones) for visibility
      try {
        const userAccountsResponse = await apiGet<{
          total_users: number;
          orphaned_users: any[];
          unlinked_users: any[];
          all_users: any[];
        }>("/admin/users/debug");
        setAllUserAccounts(userAccountsResponse.all_users || []);
      } catch (err) {
        console.error("Failed to fetch user accounts:", err);
        // Don't show error - this is optional debug info
      }
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      const errorMessage = err?.message || err?.toString() || "Failed to fetch data";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteUserAccount = async (userId: number, username: string, linkedEmployeeName: string | null) => {
    // Warn if user is linked to an employee
    if (linkedEmployeeName) {
      const confirmed = confirm(
        `⚠️ WARNING: This user account is linked to employee "${linkedEmployeeName}".\n\n` +
        `Deleting this user account will remove login access for that employee.\n\n` +
        `If you want to completely remove the employee, you should delete the employee instead (which will automatically delete the user account).\n\n` +
        `Do you want to proceed with deleting just the user account?`
      );
      if (!confirmed) return;
    } else {
      // For orphaned/unlinked users, simpler confirmation
      if (!confirm(`Are you sure you want to delete user account "${username}"?\n\nThis action cannot be undone.`)) {
        return;
      }
    }
    
    setDeletingUserId(userId);
    try {
      await apiDelete(`/users/${userId}`);
      setMessage({ type: "success", text: `User account "${username}" deleted successfully` });
      // Refresh user accounts list
      const userAccountsResponse = await apiGet<{
        total_users: number;
        orphaned_users: any[];
        unlinked_users: any[];
        all_users: any[];
      }>("/admin/users/debug");
      setAllUserAccounts(userAccountsResponse.all_users || []);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to delete user account" });
    } finally {
      setDeletingUserId(null);
    }
  };
  
  const handleResetPassword = async (employeeId: number) => {
    if (!confirm("Are you sure you want to generate a password reset link for this user?")) {
      return;
    }
    
    setResettingPassword(employeeId);
    try {
      const result = await apiPost<{ 
        message: string; 
        set_password_link?: string;
        username?: string;
        email?: string;
        employee_name?: string;
        email_sent?: boolean;
      }>(`/admin/employees/${employeeId}/reset-password`, {});
      
      // Show modal with password reset link
      if (result.set_password_link && result.username) {
        setPasswordResetModal({
          show: true,
          username: result.username || "",
          email: result.email || "",
          resetLink: result.set_password_link,
          employeeName: result.employee_name || "",
          emailSent: result.email_sent || false,
        });
        setMessage({ type: "success", text: "Password reset link generated! Check the modal for the link." });
      } else {
        setMessage({ type: "success", text: result.message });
      }
      
      // Refresh user info
      const userInfo = await apiGet<UserInfo>(`/admin/employees/${employeeId}/user-info`);
      setUserInfoMap(prev => ({ ...prev, [employeeId]: userInfo }));
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to reset password" });
    } finally {
      setResettingPassword(null);
    }
  };


  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeName) {
      setMessage({ type: "error", text: "Name is required" });
      return;
    }
    if (!newEmployeeEmail) {
      setMessage({ type: "error", text: "Email is required to create a user account" });
      return;
    }
    try {
      // Create a single employee with multiple office assignments (many-to-many relationship)
      const employeeData: any = {
        name: newEmployeeName,
        email: newEmployeeEmail,
        role: newEmployeeRole && newEmployeeRole.trim() ? newEmployeeRole.trim() : null,
        office_ids: newEmployeeOfficeIds.length > 0 ? newEmployeeOfficeIds : undefined, // Use office_ids for multiple offices
      };
      
      const response = await apiPost<any>("/employees", employeeData);
      
      // Debug: Log full response to console for troubleshooting
      console.log("=== EMPLOYEE CREATION RESPONSE ===");
      console.log("Full response:", JSON.stringify(response, null, 2));
      console.log("Response type:", typeof response);
      console.log("Response keys:", response ? Object.keys(response) : "null");
      console.log("Has temporary_password?", response?.temporary_password);
      console.log("Has username?", response?.username);
      console.log("Has _message?", response?._message);
      console.log("Office IDs assigned:", response?.office_ids);
      
      // Check if response includes temporary password (new user created)
      // The backend returns: { temporary_password: "...", username: "...", ... }
      const hasTempPassword = response && (
        (response.temporary_password && response.username) ||
        (response.password && response.username) || // Fallback: check for 'password' field
        (typeof response === 'object' && 'temporary_password' in response)
      );
      
      if (hasTempPassword) {
        const username = response.username || response.user || "";
        const password = response.temporary_password || response.password || "";
        
        if (username && password) {
          // Show modal with temporary password - cannot be missed
          console.log("✓ Showing temporary password modal:", { username, password, employeeName: newEmployeeName });
          setTempPasswordModal({
            show: true,
            username: username,
            password: password,
            employeeName: newEmployeeName,
          });
          setMessage({ type: "success", text: "Employee added successfully! IMPORTANT: Save the credentials shown in the modal!" });
        } else {
          console.error("⚠️ Missing username or password in response:", { username, password });
          setMessage({ type: "success", text: "Employee added successfully" });
        }
      } else {
        // No new user created (existing user linked) or error
        console.log("ℹ️ No temporary password in response - user account may already exist");
        console.log("Response _message:", response?._message);
        console.log("Existing user linked:", response?._existing_user_linked);
        
        // Show informative message about existing user link
        if (response?._existing_user_linked) {
          const detailedMessage = response._message || 
            `Employee added and linked to existing user account '${response.username || 'unknown'}'. No temporary password needed - the user account already exists.`;
          setMessage({ 
            type: "success", 
            text: detailedMessage 
          });
          
          // Also show an info alert to make sure user sees the explanation
          setTimeout(() => {
            alert(`ℹ️ Existing User Account Linked\n\n${detailedMessage}\n\nThe employee can login with the existing user account credentials.`);
          }, 500);
        } else {
          setMessage({ type: "success", text: response?._message || "Employee added successfully" });
        }
      }
      
      setNewEmployeeName("");
      setNewEmployeeEmail("");
      setNewEmployeeOfficeIds([]);
      setNewEmployeeRole("");
      setShowAddEmployee(false);
      fetchData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to add employee" });
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployeeName) {
      setMessage({ type: "error", text: "Name is required" });
      return;
    }
    
    try {
      // Find the employee to update by ID (now we have one employee per email, not per office)
      if (!editingEmployeeId) {
        throw new Error(`Employee ID is required for update`);
      }
      
      const employeeToUpdate = employees.find((emp) => emp.id === editingEmployeeId);
      if (!employeeToUpdate) {
        throw new Error(`Employee with ID ${editingEmployeeId} not found`);
      }
      
      // Get existing office IDs from the employee (now using office_ids array)
      const existingOfficeIds = employeeToUpdate.office_ids || [];
      
      // Update the employee record with email, role, and office assignments
      // Convert empty string to null for email
      const updateData: any = {
        email: editEmployeeEmail && editEmployeeEmail.trim() ? editEmployeeEmail.trim() : null,
        office_ids: editEmployeeOfficeIds.length > 0 ? editEmployeeOfficeIds : [], // Use office_ids for multiple offices
      };
      
      // Always include role in update (even if empty/null) so it gets saved
      // Use empty string instead of null to ensure Pydantic includes it
      if (editEmployeeRole && editEmployeeRole.trim()) {
        updateData.role = editEmployeeRole.trim();
      } else {
        // Explicitly set to null to clear the role
        updateData.role = null;
      }
      
      try {
        await apiPatch(`/employees/${editingEmployeeId}`, updateData);
      } catch (patchError: any) {
        console.error("Error updating employee:", patchError);
        // Extract error message from response
        let errorMessage = "Failed to update employee";
        if (patchError.message) {
          errorMessage = patchError.message;
        } else if (typeof patchError === 'string') {
          errorMessage = patchError;
        }
        throw new Error(errorMessage);
      }
      
      setMessage({ type: "success", text: "Employee updated successfully" });
      setEditingEmployeeName(null);
      setEditingEmployeeId(null);
      setEditEmployeeEmail("");
      setEditEmployeeOfficeIds([]);
      setEditEmployeeRole("");
      fetchData(); // Refresh to get updated role info
    } catch (err: any) {
      console.error("Error in handleUpdateEmployee:", err);
      const errorMessage = err.message || err.toString() || "Failed to update employee";
      setMessage({ type: "error", text: errorMessage });
    }
  };

  const handleDeleteEmployee = async (employeeGroup: { name: string; employeeIds: number[]; officeIds: number[] }) => {
    const employee = employees.find(e => e.id === employeeGroup.employeeIds[0]);
    const employeeName = employee?.name || employeeGroup.name;
    if (!confirm(`Are you sure you want to delete ${employeeName}?`)) return;
    try {
      // Delete all employee records for this person
      for (const employeeId of employeeGroup.employeeIds) {
        await apiDelete(`/admin/employees/${employeeId}`);
      }
      setMessage({ type: "success", text: "Employee deleted successfully" });
      fetchData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to delete employee" });
    }
  };

  const handleImportProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (useMultiOfficeImport) {
      // Multi-office import - only needs month and file
      if (!importMonth || !importFile) {
        setMessage({ type: "error", text: "Month and file are required for multi-office import" });
        return;
      }
    } else {
      // Single office import - needs office, month, and file
      if (!importOffice || !importMonth || !importFile) {
        setMessage({ type: "error", text: "Office, month, and file are required" });
        return;
      }
    }

    const formData = new FormData();
    formData.append("file", importFile);

    try {
      // Use the API client's base URL instead of hardcoded localhost
      const apiBaseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      let url: string;
      if (useMultiOfficeImport) {
        url = `${apiBaseUrl}/admin/production/import-multi?month=${encodeURIComponent(importMonth)}`;
      } else {
        url = `${apiBaseUrl}/admin/production/import?office=${encodeURIComponent(importOffice)}&month=${encodeURIComponent(importMonth)}`;
      }

      // Use the API client's auth headers
      const authToken = localStorage.getItem("auth_token");
      const headers: HeadersInit = {};
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Import failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (useMultiOfficeImport) {
        // Multi-office result format
        const officesList = result.offices_processed.map((o: any) => 
          `${o.office} (${o.rows_imported} rows)`
        ).join(", ");
        setMessage({
          type: "success",
          text: `Imported ${result.total_production_rows} rows across ${result.offices_processed.length} offices. Created ${result.total_new_agencies} new agencies. Offices: ${officesList}`,
        });
        if (result.errors && result.errors.length > 0) {
          setMessage({
            type: "error",
            text: `Import completed with errors: ${result.errors.join("; ")}`,
          });
        }
      } else {
        // Single office result format
        setMessage({
          type: "success",
          text: `Imported ${result.production_rows_imported} rows. Created ${result.new_agencies_created} new agencies.`,
        });
      }
      
      setImportFile(null);
      setImportOffice("");
      setImportMonth("");
      fetchData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to import production" });
    }
  };

  const handleDeleteAgency = async () => {
    if (!deleteAgencyId) {
      setMessage({ type: "error", text: "Please select an agency to delete" });
      return;
    }
    if (!confirm("Are you sure you want to delete this agency? All contacts, logs, and tasks will also be deleted.")) {
      return;
    }
    try {
      await apiDelete(`/admin/agencies/${deleteAgencyId}`);
      setMessage({ type: "success", text: "Agency and related data deleted successfully" });
      setDeleteAgencyId(null);
      fetchData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to delete agency" });
    }
  };

  const filteredAgenciesForDelete = deleteOfficeFilter
    ? agencies.filter((a) => a.office_id === deleteOfficeFilter)
    : agencies;

  const handleAddOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfficeCode || !newOfficeName) {
      setMessage({ type: "error", text: "Office code and name are required" });
      return;
    }
    try {
      await apiPost("/offices", {
        code: newOfficeCode.trim().toUpperCase(),
        name: newOfficeName.trim(),
      });
      setMessage({ type: "success", text: "Office added successfully" });
      setNewOfficeCode("");
      setNewOfficeName("");
      setShowAddOffice(false);
      fetchData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to add office" });
    }
  };

  const handleDeleteOffice = async (officeId: number) => {
    const office = offices.find((o) => o.id === officeId);
    if (!office) return;

    // Check if office has employees or agencies
    const officeEmployees = employees.filter((e) => 
      (e.office_ids && e.office_ids.includes(officeId)) || 
      (e.office_id === officeId) // Backward compatibility
    );
    const officeAgencies = agencies.filter((a) => a.office_id === officeId);

    if (officeEmployees.length > 0 || officeAgencies.length > 0) {
      setMessage({
        type: "error",
        text: `Cannot delete office: ${officeEmployees.length} employee(s) and ${officeAgencies.length} agency/agencies are associated with this office. Please reassign or delete them first.`,
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete office "${office.code} - ${office.name}"?`)) {
      return;
    }

    setDeletingOfficeId(officeId);
    try {
      await apiDelete(`/offices/${officeId}`);
      setMessage({ type: "success", text: "Office deleted successfully" });
      fetchData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to delete office" });
    } finally {
      setDeletingOfficeId(null);
    }
  };

  // Group employees by name with all their offices
  interface GroupedEmployee {
    name: string;
    employeeIds: number[];
    officeIds: number[];
  }

  // Show all employees individually (not grouped by name)
  // This ensures employees with the same name but different emails/offices are all visible
  const sortedEmployees = React.useMemo(() => {
    return [...employees].sort((a, b) => {
      // Sort by name first, then by email, then by office_id
      if (a.name !== b.name) {
        return a.name.localeCompare(b.name);
      }
      if (a.email !== b.email) {
        return (a.email || "").localeCompare(b.email || "");
      }
      return (a.office_id || 0) - (b.office_id || 0);
    });
  }, [employees]);

  const sidebar = (
    <>
      <h2 style={sidebarHeadingStyle}>Admin Tools</h2>
      <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.5 }}>
        Manage employees, import production data, and delete agencies.
      </div>
    </>
  );

  // Function to copy text to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setMessage({ type: "success", text: `${label} copied to clipboard!` });
    }).catch((err) => {
      console.error("Failed to copy:", err);
      setMessage({ type: "error", text: "Failed to copy to clipboard" });
    });
  };

  return (
    <>
      {/* Temporary Password Modal - Cannot be missed! */}
      {tempPasswordModal && tempPasswordModal.show && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: 20,
          }}
          onClick={(e) => {
            // Don't close on backdrop click - user must click "I've Saved This"
            e.stopPropagation();
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 12,
              padding: 32,
              maxWidth: 600,
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              border: "3px solid #ef4444",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 48,
                  marginBottom: 16,
                }}
              >
                🔐
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 8,
                }}
              >
                IMPORTANT: Save These Credentials
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "#6b7280",
                }}
              >
                A new user account has been created for{" "}
                <strong>{tempPasswordModal.employeeName}</strong>
              </p>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 13,
                  color: "#dc2626",
                  fontWeight: 600,
                }}
              >
                ⚠️ You will NOT be able to see this password again after closing this dialog!
              </p>
            </div>

            <div
              style={{
                backgroundColor: "#f9fafb",
                borderRadius: 8,
                padding: 20,
                marginBottom: 24,
                border: "2px solid #e5e7eb",
              }}
            >
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Username
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    readOnly
                    value={tempPasswordModal.username}
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      fontSize: 16,
                      fontFamily: "monospace",
                      backgroundColor: "#ffffff",
                      border: "2px solid #d1d5db",
                      borderRadius: 6,
                      color: "#111827",
                      fontWeight: 600,
                      cursor: "text",
                    }}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(tempPasswordModal.username, "Username")}
                    style={{
                      padding: "12px 20px",
                      backgroundColor: "#3b82f6",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Temporary Password
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    readOnly
                    value={tempPasswordModal.password}
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      fontSize: 18,
                      fontFamily: "monospace",
                      backgroundColor: "#ffffff",
                      border: "2px solid #ef4444",
                      borderRadius: 6,
                      color: "#dc2626",
                      fontWeight: 700,
                      cursor: "text",
                    }}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(tempPasswordModal.password, "Password")}
                    style={{
                      padding: "12px 20px",
                      backgroundColor: "#ef4444",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#fef3c7",
                border: "1px solid #fbbf24",
                borderRadius: 8,
                padding: 16,
                marginBottom: 24,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "#92400e",
                  lineHeight: 1.6,
                }}
              >
                <strong>Instructions:</strong> Share these credentials with{" "}
                <strong>{tempPasswordModal.employeeName}</strong>. They will be
                required to change their password on first login. Store these
                credentials securely - you cannot retrieve them later.
              </p>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  // Copy both to clipboard
                  const credentials = `Username: ${tempPasswordModal.username}\nPassword: ${tempPasswordModal.password}`;
                  copyToClipboard(credentials, "Credentials");
                }}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#6b7280",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Copy Both
              </button>
              <button
                type="button"
                onClick={() => {
                  setTempPasswordModal(null);
                  setNewEmployeeName("");
                  setNewEmployeeEmail("");
                  setNewEmployeeOfficeIds([]);
                  setNewEmployeeRole("");
                  setShowAddEmployee(false);
                  fetchData();
                }}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#10b981",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ✓ I've Saved This
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Link Modal - Cannot be missed! */}
      {passwordResetModal && passwordResetModal.show && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: 20,
          }}
          onClick={(e) => {
            // Don't close on backdrop click - user must click "I've Saved This"
            e.stopPropagation();
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 12,
              padding: 32,
              maxWidth: 600,
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              border: "3px solid #f59e0b",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 48,
                  marginBottom: 16,
                }}
              >
                🔑
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 8,
                }}
              >
                Password Reset Link Generated
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "#6b7280",
                }}
              >
                A password reset link has been generated for{" "}
                <strong>{passwordResetModal.employeeName}</strong>
              </p>
              {passwordResetModal.emailSent ? (
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: 13,
                    color: "#10b981",
                    fontWeight: 600,
                  }}
                >
                  ✓ Email sent to {passwordResetModal.email}
                </p>
              ) : (
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: 13,
                    color: "#dc2626",
                    fontWeight: 600,
                  }}
                >
                  ⚠️ Email failed to send. Please share the link manually.
                </p>
              )}
            </div>

            <div
              style={{
                backgroundColor: "#f9fafb",
                borderRadius: 8,
                padding: 20,
                marginBottom: 24,
                border: "2px solid #e5e7eb",
              }}
            >
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Username
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    readOnly
                    value={passwordResetModal.username}
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      fontSize: 16,
                      fontFamily: "monospace",
                      backgroundColor: "#ffffff",
                      border: "2px solid #d1d5db",
                      borderRadius: 6,
                      color: "#111827",
                      fontWeight: 600,
                      cursor: "text",
                    }}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(passwordResetModal.username, "Username")}
                    style={{
                      padding: "12px 20px",
                      backgroundColor: "#3b82f6",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Password Reset Link
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    readOnly
                    value={passwordResetModal.resetLink}
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      fontSize: 14,
                      fontFamily: "monospace",
                      backgroundColor: "#ffffff",
                      border: "2px solid #f59e0b",
                      borderRadius: 6,
                      color: "#92400e",
                      fontWeight: 600,
                      cursor: "text",
                      wordBreak: "break-all",
                    }}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(passwordResetModal.resetLink, "Reset Link")}
                    style={{
                      padding: "12px 20px",
                      backgroundColor: "#f59e0b",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#fef3c7",
                border: "1px solid #fbbf24",
                borderRadius: 8,
                padding: 16,
                marginBottom: 24,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "#92400e",
                  lineHeight: 1.6,
                }}
              >
                <strong>Instructions:</strong> Share this password reset link with{" "}
                <strong>{passwordResetModal.employeeName}</strong>. They can use it to set a new password.
                The link expires in 24 hours. Store this link securely if email was not sent.
              </p>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  // Copy both to clipboard
                  const info = `Username: ${passwordResetModal.username}\nPassword Reset Link: ${passwordResetModal.resetLink}`;
                  copyToClipboard(info, "Reset Information");
                }}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#6b7280",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Copy Both
              </button>
              <button
                type="button"
                onClick={() => {
                  setPasswordResetModal(null);
                  fetchData();
                }}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#10b981",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ✓ I've Saved This
              </button>
            </div>
          </div>
        </div>
      )}

    <WorkbenchLayout
      title="Underwriting Workbench – Admin"
      subtitle="Configuration and admin tools"
      rightNote=""
      sidebar={sidebar}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* TEMPORARY: Warning banner when accessing without authentication */}
        {!localStorage.getItem("auth_token") && (
          <div
            style={{
              padding: "16px",
              background: "#fef3c7",
              border: "2px solid #f59e0b",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              color: "#92400e",
            }}
          >
            ⚠️ <strong>TEMPORARY SETUP MODE:</strong> Login requirement is disabled for initial admin setup. 
            After creating your first admin user, set <code style={{background: "#fde68a", padding: "2px 6px", borderRadius: 3}}>TEMP_ALLOW_ADMIN_WITHOUT_AUTH = false</code> in App.tsx and AdminPage.tsx to re-enable authentication.
          </div>
        )}
        {message && (
          <div
            style={{
              padding: "12px 16px",
              background: message.type === "success" ? "#d1fae5" : "#fee",
              color: message.type === "success" ? "#065f46" : "#c00",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {message.text}
            <button
              onClick={() => setMessage(null)}
              style={{
                float: "right",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Employee Management */}
        <div style={{ ...cardStyle, padding: 20 }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600 }}>Employee Management</h3>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16, padding: 8, background: "#f3f4f6", borderRadius: 4 }}>
            <strong>Note:</strong> This shows <strong>Employees</strong> (people in the system). 
            Every Employee automatically has a User account (login credentials) created when they are added. 
            This is a 1:1 relationship - every Employee must have a User account, and every User must be linked to an Employee.
          </div>

          {!showAddEmployee && !editingEmployeeName && (
            <button
              onClick={() => setShowAddEmployee(true)}
              style={{
                padding: "8px 16px",
                background: "#1e40af",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                marginBottom: 16,
              }}
            >
              + Add New Employee
            </button>
          )}

          {showAddEmployee && (
            <form onSubmit={handleAddEmployee} style={{ marginBottom: 20, padding: 16, background: "#f9fafb", borderRadius: 8 }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600 }}>Add New Employee (User)</h4>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4, fontWeight: 500 }}>Name *</label>
                <input
                  type="text"
                  value={newEmployeeName}
                  onChange={(e) => setNewEmployeeName(e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #d1d5db", fontSize: 13 }}
                  required
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4, fontWeight: 500 }}>Email *</label>
                <input
                  type="email"
                  value={newEmployeeEmail}
                  onChange={(e) => setNewEmployeeEmail(e.target.value)}
                  placeholder="user@company.com"
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #d1d5db", fontSize: 13 }}
                  required
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4, fontWeight: 500 }}>Role</label>
                <select
                  value={newEmployeeRole}
                  onChange={(e) => setNewEmployeeRole(e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #d1d5db", fontSize: 13 }}
                >
                  <option value="">Select a role (optional)</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="underwriter">Underwriter</option>
                  <option value="partner">Partner</option>
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4, fontWeight: 500 }}>Offices (select all that apply, optional)</label>
                {offices.length === 0 ? (
                  <div style={{ padding: 8, color: "#6b7280", fontSize: 12 }}>
                    No offices available. Please add offices first.
                  </div>
                ) : (
                  <div style={{ border: "1px solid #d1d5db", borderRadius: 4, padding: 8, maxHeight: 200, overflowY: "auto", background: "#fff" }}>
                    {offices.map((office) => (
                      <label key={office.id} style={{ display: "block", marginBottom: 6, fontSize: 13, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={newEmployeeOfficeIds.includes(office.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewEmployeeOfficeIds([...newEmployeeOfficeIds, office.id]);
                            } else {
                              setNewEmployeeOfficeIds(newEmployeeOfficeIds.filter((id) => id !== office.id));
                            }
                          }}
                          style={{ marginRight: 8 }}
                        />
                        {office.code} - {office.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="submit"
                  style={{
                    padding: "6px 12px",
                    background: "#1e40af",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddEmployee(false);
                    setNewEmployeeName("");
                    setNewEmployeeEmail("");
                    setNewEmployeeOfficeIds([]);
                    setNewEmployeeRole("");
                  }}
                  style={{
                    padding: "6px 12px",
                    background: "#e5e7eb",
                    color: "#374151",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {editingEmployeeName && (
            <form onSubmit={handleUpdateEmployee} style={{ marginBottom: 20, padding: 16, background: "#f9fafb", borderRadius: 8 }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600 }}>Edit Employee: {editingEmployeeName}</h4>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4, fontWeight: 500 }}>Email</label>
                <input
                  type="email"
                  value={editEmployeeEmail}
                  onChange={(e) => setEditEmployeeEmail(e.target.value)}
                  placeholder="user@company.com"
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #d1d5db", fontSize: 13 }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4, fontWeight: 500 }}>Role</label>
                <select
                  value={editEmployeeRole}
                  onChange={(e) => setEditEmployeeRole(e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #d1d5db", fontSize: 13 }}
                >
                  <option value="">Select a role</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="underwriter">Underwriter</option>
                  <option value="partner">Partner</option>
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4, fontWeight: 500 }}>Offices (select all that apply, optional)</label>
                {offices.length === 0 ? (
                  <div style={{ padding: 8, color: "#6b7280", fontSize: 12 }}>
                    No offices available. Please add offices first.
                  </div>
                ) : (
                  <div style={{ border: "1px solid #d1d5db", borderRadius: 4, padding: 8, maxHeight: 200, overflowY: "auto", background: "#fff" }}>
                    {offices.map((office) => (
                      <label key={office.id} style={{ display: "block", marginBottom: 6, fontSize: 13, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={editEmployeeOfficeIds.includes(office.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditEmployeeOfficeIds([...editEmployeeOfficeIds, office.id]);
                            } else {
                              setEditEmployeeOfficeIds(editEmployeeOfficeIds.filter((id) => id !== office.id));
                            }
                          }}
                          style={{ marginRight: 8 }}
                        />
                        {office.code} - {office.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="submit"
                  style={{
                    padding: "6px 12px",
                    background: "#1e40af",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingEmployeeName(null);
                    setEditingEmployeeId(null);
                    setEditEmployeeEmail("");
                    setEditEmployeeOfficeIds([]);
                    setEditEmployeeRole("");
                  }}
                  style={{
                    padding: "6px 12px",
                    background: "#e5e7eb",
                    color: "#374151",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>Name</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>Email</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>Role</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>Office</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "16px", textAlign: "center", color: "#6b7280", fontSize: 13 }}>
                      No employees found. Try adding an employee.
                    </td>
                  </tr>
                ) : (
                  sortedEmployees.map((emp) => {
                    // Display all offices assigned to employee (many-to-many)
                    const officeIds = emp.office_ids || (emp.office_id ? [emp.office_id] : []);
                    const assignedOffices = officeIds.map(id => offices.find(o => o.id === id)).filter(Boolean);
                    const officeName = assignedOffices.length > 0 
                      ? assignedOffices.map(o => `${o.code} - ${o.name}`).join(", ")
                      : "No office";
                    const userInfo = userInfoMap[emp.id] || null;
                    const role = userInfo?.role || emp.role || null;
                    const hasAccount = userInfo?.has_account || false;
                    
                    return (
                      <tr key={emp.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "8px 12px" }}>{emp.name}</td>
                        <td style={{ padding: "8px 12px", fontSize: 12, color: "#6b7280" }}>{emp.email || "No email"}</td>
                        <td style={{ padding: "8px 12px" }}>
                          {role ? (
                            <span style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              background: role === "admin" ? "#dc2626" : "#6b7280",
                              color: "#fff",
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 600,
                              textTransform: "capitalize",
                            }}>
                              {role}
                            </span>
                          ) : (
                            <span style={{ color: "#9ca3af", fontSize: 12 }}>No role</span>
                          )}
                        </td>
                        <td style={{ padding: "8px 12px" }}>{officeName}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                            {hasAccount && (
                              <button
                                onClick={() => handleResetPassword(emp.id)}
                                disabled={resettingPassword === emp.id}
                                style={{
                                  padding: "4px 10px",
                                  background: resettingPassword === emp.id ? "#e5e7eb" : "#fef3c7",
                                  color: resettingPassword === emp.id ? "#9ca3af" : "#92400e",
                                  border: "1px solid #fde68a",
                                  borderRadius: 4,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: resettingPassword === emp.id ? "not-allowed" : "pointer",
                                }}
                              >
                                {resettingPassword === emp.id ? "Sending..." : "Reset Password"}
                              </button>
                            )}
                            <button
                              onClick={() => {
                              if (!emp || !emp.id) {
                                setMessage({ type: "error", text: `Invalid employee data` });
                                return;
                              }
                              const userInfo = userInfoMap[emp.id] || null;
                              setEditingEmployeeName(emp.name);
                              setEditingEmployeeId(emp.id);
                              setEditEmployeeEmail(emp.email || "");
                              setEditEmployeeOfficeIds(emp.office_ids || []);
                              setEditEmployeeRole(userInfo?.role || emp.role || "");
                              setShowAddEmployee(false);
                              }}
                              style={{
                                padding: "4px 10px",
                                background: "#eff6ff",
                                color: "#1e40af",
                                border: "1px solid #bfdbfe",
                                borderRadius: 4,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteEmployee({ name: emp.name, employeeIds: [emp.id], officeIds: emp.office_ids || [] })}
                              style={{
                                padding: "4px 10px",
                                background: "#fee",
                                color: "#dc2626",
                                border: "1px solid #fecaca",
                                borderRadius: 4,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Accounts (All Users - Including Orphaned) */}
        <div style={{ ...cardStyle, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>User Accounts (Login Credentials)</h3>
            <button
              onClick={() => setShowUserAccounts(!showUserAccounts)}
              style={{
                padding: "6px 12px",
                background: showUserAccounts ? "#dc2626" : "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {showUserAccounts ? "Hide" : "Show"} User Accounts
            </button>
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16, padding: 8, background: "#fef3c7", borderRadius: 4 }}>
            <strong>Important:</strong> This shows all <strong>User accounts</strong> (login credentials) in the system, including orphaned users (users not linked to any employee). 
            If you see an "orphaned" user when creating a new employee with the same email, this is why.
          </div>
          
          {showUserAccounts && (
            <div style={{ marginTop: 16 }}>
              {allUserAccounts.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "#6b7280", fontSize: 13 }}>
                  No user accounts found.
                </div>
              ) : (
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>ID</th>
                      <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>Username</th>
                      <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>Email</th>
                      <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>Linked Employee</th>
                      <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>Status</th>
                      <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>Admin</th>
                      <th style={{ textAlign: "center", padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUserAccounts.map((user) => {
                      const isOrphaned = user.is_orphaned;
                      const isUnlinked = user.is_unlinked;
                      const statusBadge = isOrphaned ? "🔴 Orphaned" : isUnlinked ? "🟡 Unlinked" : "🟢 Linked";
                      const statusColor = isOrphaned ? "#dc2626" : isUnlinked ? "#f59e0b" : "#10b981";
                      
                      return (
                        <tr key={user.user_id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                          <td style={{ padding: "8px 12px" }}>{user.user_id}</td>
                          <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 600 }}>{user.username}</td>
                          <td style={{ padding: "8px 12px" }}>{user.email || "—"}</td>
                          <td style={{ padding: "8px 12px" }}>
                            {user.linked_employee_name ? (
                              <span>
                                {user.linked_employee_name}
                                {user.linked_employee_email && (
                                  <span style={{ color: "#6b7280", fontSize: 11 }}> ({user.linked_employee_email})</span>
                                )}
                              </span>
                            ) : (
                              <span style={{ color: "#9ca3af", fontStyle: "italic" }}>No employee linked</span>
                            )}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <span style={{ color: statusColor, fontWeight: 600, fontSize: 12 }}>{statusBadge}</span>
                            {(isOrphaned || isUnlinked) && (
                              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                                {isOrphaned ? "Employee was deleted" : "No employee assigned"}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            {user.is_admin ? (
                              <span style={{ color: "#dc2626", fontWeight: 600 }}>Yes</span>
                            ) : (
                              <span style={{ color: "#9ca3af" }}>No</span>
                            )}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            <button
                              onClick={() => handleDeleteUserAccount(user.user_id, user.username, user.linked_employee_name)}
                              disabled={deletingUserId === user.user_id}
                              style={{
                                padding: "4px 10px",
                                background: deletingUserId === user.user_id ? "#e5e7eb" : "#fee",
                                color: deletingUserId === user.user_id ? "#9ca3af" : "#dc2626",
                                border: "1px solid #fecaca",
                                borderRadius: 4,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: deletingUserId === user.user_id ? "not-allowed" : "pointer",
                                opacity: deletingUserId === user.user_id ? 0.6 : 1,
                              }}
                              title={user.linked_employee_name ? `Delete user account (employee "${user.linked_employee_name}" will lose login access)` : "Delete user account"}
                            >
                              {deletingUserId === user.user_id ? "Deleting..." : "Delete"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Production Import */}
        <div style={{ ...cardStyle, padding: 20 }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600 }}>Production Import</h3>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
            {useMultiOfficeImport 
              ? "Upload an Excel file with multiple office tabs. Each tab should be named with the office code (e.g., BRA, FNO, LAF). The system will process all offices automatically."
              : "Upload an Excel file with monthly production data for a single office. The system will auto-create new agencies and update existing ones."}
          </p>
          <div style={{ marginBottom: 16, padding: 12, background: "#f9fafb", borderRadius: 6, border: "1px solid #e5e7eb" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={useMultiOfficeImport}
                onChange={(e) => setUseMultiOfficeImport(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              <span style={{ fontWeight: 500 }}>Multi-Office Import</span>
              <span style={{ color: "#6b7280", fontSize: 12 }}>(Process all office tabs from one file)</span>
            </label>
          </div>
          <form onSubmit={handleImportProduction}>
            <div style={{ display: "grid", gridTemplateColumns: useMultiOfficeImport ? "1fr 2fr" : "1fr 1fr 2fr", gap: 12, marginBottom: 12 }}>
              {!useMultiOfficeImport && (
                <div>
                  <label style={{ display: "block", fontSize: 12, marginBottom: 4, fontWeight: 500 }}>Office Code</label>
                  <select
                    value={importOffice}
                    onChange={(e) => setImportOffice(e.target.value)}
                    style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #d1d5db", fontSize: 13 }}
                  >
                    <option value="">Select...</option>
                    {offices.map((office) => (
                      <option key={office.id} value={office.code}>
                        {office.code}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4, fontWeight: 500 }}>Month (YYYY-MM)</label>
                <input
                  type="text"
                  value={importMonth}
                  onChange={(e) => setImportMonth(e.target.value)}
                  placeholder="2025-01"
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #d1d5db", fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4, fontWeight: 500 }}>Excel File</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xls,.xlsx,.xlsm"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    style={{ display: "none" }}
                    id="file-upload-input"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: "6px 12px",
                      background: "#f3f4f6",
                      color: "#111827",
                      border: "1px solid #d1d5db",
                      borderRadius: 4,
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Choose File
                  </button>
                  <span style={{ fontSize: 12, color: "#6b7280", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {importFile ? importFile.name : "No file chosen"}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="submit"
              style={{
                padding: "8px 16px",
                background: "#1e40af",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Import Production
            </button>
          </form>
        </div>

        {/* Agency Deletion */}
        <div style={{ ...cardStyle, padding: 20 }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600 }}>Delete Agency</h3>
          <p style={{ fontSize: 13, color: "#dc2626", marginBottom: 16, fontWeight: 500 }}>
            ⚠️ Warning: This will permanently delete the agency and all related contacts, logs, and tasks.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 12, alignItems: "end" }}>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4, fontWeight: 500 }}>Filter by Office</label>
              <select
                value={deleteOfficeFilter || ""}
                onChange={(e) => {
                  setDeleteOfficeFilter(e.target.value ? Number(e.target.value) : null);
                  setDeleteAgencyId(null);
                }}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #d1d5db", fontSize: 13 }}
              >
                <option value="">All offices</option>
                {offices.map((office) => (
                  <option key={office.id} value={office.id}>
                    {office.code} - {office.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4, fontWeight: 500 }}>Select Agency</label>
              <select
                value={deleteAgencyId || ""}
                onChange={(e) => setDeleteAgencyId(e.target.value ? Number(e.target.value) : null)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #d1d5db", fontSize: 13 }}
              >
                <option value="">Choose agency...</option>
                {filteredAgenciesForDelete.map((agency) => (
                  <option key={agency.id} value={agency.id}>
                    {agency.name} (Code: {agency.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <button
                onClick={handleDeleteAgency}
                disabled={!deleteAgencyId}
                style={{
                  padding: "8px 16px",
                  background: deleteAgencyId ? "#dc2626" : "#e5e7eb",
                  color: deleteAgencyId ? "#fff" : "#9ca3af",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: deleteAgencyId ? "pointer" : "not-allowed",
                }}
              >
                Delete Agency
              </button>
            </div>
          </div>
        </div>

        {/* Office Management */}
        <div style={{ ...cardStyle, padding: 20 }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600 }}>Office Management</h3>
          
          {!showAddOffice && (
            <button
              onClick={() => setShowAddOffice(true)}
              style={{
                padding: "8px 16px",
                background: "#1e40af",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                marginBottom: 16,
              }}
            >
              + Add New Office
            </button>
          )}

          {showAddOffice && (
            <form onSubmit={handleAddOffice} style={{ marginBottom: 20, padding: 16, background: "#f9fafb", borderRadius: 8 }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600 }}>Add New Office</h4>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4, fontWeight: 500 }}>Office Code *</label>
                <input
                  type="text"
                  value={newOfficeCode}
                  onChange={(e) => setNewOfficeCode(e.target.value.toUpperCase())}
                  placeholder="e.g., NYC"
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #d1d5db", fontSize: 13 }}
                  required
                  maxLength={10}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4, fontWeight: 500 }}>Office Name *</label>
                <input
                  type="text"
                  value={newOfficeName}
                  onChange={(e) => setNewOfficeName(e.target.value)}
                  placeholder="e.g., New York City"
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #d1d5db", fontSize: 13 }}
                  required
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="submit"
                  style={{
                    padding: "6px 12px",
                    background: "#1e40af",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddOffice(false);
                    setNewOfficeCode("");
                    setNewOfficeName("");
                  }}
                  style={{
                    padding: "6px 12px",
                    background: "#e5e7eb",
                    color: "#374151",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>Code</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>Name</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>Employees</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>Agencies</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {offices.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "16px", textAlign: "center", color: "#6b7280", fontSize: 13 }}>
                      No offices found. Add an office to get started.
                    </td>
                  </tr>
                ) : (
                  offices
                    .sort((a, b) => a.code.localeCompare(b.code))
                    .map((office) => {
                      const officeEmployees = employees.filter((e) => 
                        (e.office_ids && e.office_ids.includes(office.id)) || 
                        (e.office_id === office.id) // Backward compatibility
                      );
                      const officeAgencies = agencies.filter((a) => a.office_id === office.id);
                      const canDelete = officeEmployees.length === 0 && officeAgencies.length === 0;

                      return (
                        <tr key={office.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 600 }}>{office.code}</td>
                          <td style={{ padding: "8px 12px" }}>{office.name}</td>
                          <td style={{ padding: "8px 12px" }}>{officeEmployees.length}</td>
                          <td style={{ padding: "8px 12px" }}>{officeAgencies.length}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>
                            <button
                              onClick={() => handleDeleteOffice(office.id)}
                              disabled={!canDelete || deletingOfficeId === office.id}
                              style={{
                                padding: "4px 10px",
                                background: canDelete && deletingOfficeId !== office.id ? "#fee" : "#e5e7eb",
                                color: canDelete && deletingOfficeId !== office.id ? "#dc2626" : "#9ca3af",
                                border: canDelete && deletingOfficeId !== office.id ? "1px solid #fecaca" : "1px solid #d1d5db",
                                borderRadius: 4,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: canDelete && deletingOfficeId !== office.id ? "pointer" : "not-allowed",
                              }}
                              title={
                                !canDelete
                                  ? `Cannot delete: ${officeEmployees.length} employee(s) and ${officeAgencies.length} agency/agencies are associated with this office`
                                  : "Delete office"
                              }
                            >
                              {deletingOfficeId === office.id ? "Deleting..." : "Delete"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Clear All Data - Danger Zone */}
        <div style={{ ...cardStyle, border: "2px solid #dc2626", background: "#fef2f2" }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 600, color: "#dc2626" }}>
            ⚠️ Danger Zone: Clear All Agency & Production Data
          </h3>
          <div style={{ fontSize: 12, color: "#991b1b", marginBottom: 16, lineHeight: 1.6 }}>
            <strong>WARNING:</strong> This will permanently delete:
            <ul style={{ margin: "8px 0", paddingLeft: 20 }}>
              <li>All Production records</li>
              <li>All Agency records</li>
              <li>All Contact records</li>
              <li>All Log records</li>
              <li>All Task records</li>
            </ul>
            <strong>This will NOT delete:</strong> Offices, Employees, or Submissions.
            <br />
            <strong>Use this to start fresh with new imports.</strong>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={async () => {
                try {
                  setLoading(true);
                  const result = await apiPost("/admin/data-status", {});
                  const statusMsg = `Current Data Status:
- Production: ${result.counts.production} records
- Agencies: ${result.counts.agencies} records
- Contacts: ${result.counts.contacts} records
- Logs: ${result.counts.logs} records
- Tasks: ${result.counts.tasks} records

Production by Office:
${Object.entries(result.production_by_office || {}).map(([office, count]) => `  ${office}: ${count} records`).join('\n') || '  None'}

${result.samples.production.length > 0 ? `Sample Production Records:\n${result.samples.production.map((p: any) => `  - ${p.office} / ${p.agency_code} (${p.agency_name}) / ${p.month} / WP: ${p.all_ytd_wp}`).join('\n')}` : ''}
${result.samples.logs.length > 0 ? `\nSample Logs:\n${result.samples.logs.map((l: any) => `  - ${l.user} / ${l.action} / ${l.datetime}`).join('\n')}` : ''}`;
                  alert(statusMsg);
                } catch (err: any) {
                  setMessage({ type: "error", text: err.message || "Failed to check data status" });
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              style={{
                padding: "8px 16px",
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              🔍 Check Data Status
            </button>
            <button
              onClick={async () => {
                if (!confirm("⚠️ FINAL WARNING: This will delete ALL agency and production data. This cannot be undone!\n\nType 'yes' in the next prompt to confirm.")) {
                  return;
                }
                const confirmText = prompt("Type 'DELETE ALL' to confirm:");
                if (confirmText !== "DELETE ALL") {
                  setMessage({ type: "error", text: "Operation cancelled. You must type 'DELETE ALL' exactly." });
                  return;
                }
                try {
                  setLoading(true);
                  const result = await apiPost("/admin/clear-all-data", {});
                  if (result.success === false) {
                    setMessage({
                      type: "error",
                      text: `Clear completed but some records remain: ${JSON.stringify(result.remaining)}. Please try again.`,
                    });
                  } else {
                    setMessage({
                      type: "success",
                      text: `All data cleared successfully! Deleted: ${result.deleted.total} records (${result.deleted.production_records} production, ${result.deleted.agency_records} agencies, ${result.deleted.contact_records} contacts, ${result.deleted.log_records} logs, ${result.deleted.task_records} tasks)`,
                    });
                  }
                  fetchData();
                } catch (err: any) {
                  setMessage({ type: "error", text: err.message || "Failed to clear data" });
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              style={{
                padding: "10px 20px",
                background: "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "Clearing..." : "🗑️ Clear All Agency & Production Data"}
            </button>
          </div>
        </div>
      </div>
    </WorkbenchLayout>
    </>
  );
};

export default AdminPage;
