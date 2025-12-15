import React, { useEffect, useState } from "react";
import { WorkbenchLayout } from "../components/WorkbenchLayout";
import { cardStyle, sidebarHeadingStyle } from "../ui/designSystem";
import { apiGet, apiPost, apiDelete, apiPut, apiPatch } from "../api/client";

interface Office {
  id: number;
  code: string;
  name: string;
}

interface Employee {
  id: number;
  name: string;
  email?: string | null;
  office_id: number;
  office_name?: string;
  website?: string | null;
}

interface Agency {
  id: number;
  name: string;
  code: string;
  office_id: number;
}

export const AdminPage: React.FC = () => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Employee form state
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeeEmail, setNewEmployeeEmail] = useState("");
  const [newEmployeeOfficeIds, setNewEmployeeOfficeIds] = useState<number[]>([]);
  
  const [editingEmployeeName, setEditingEmployeeName] = useState<string | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [editEmployeeEmail, setEditEmployeeEmail] = useState("");
  const [editEmployeeOfficeIds, setEditEmployeeOfficeIds] = useState<number[]>([]);

  // Production import state
  const [importOffice, setImportOffice] = useState<string>("");
  const [importMonth, setImportMonth] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [useMultiOfficeImport, setUseMultiOfficeImport] = useState(true); // New: multi-office import toggle

  // Agency deletion state
  const [deleteOfficeFilter, setDeleteOfficeFilter] = useState<number | null>(null);
  const [deleteAgencyId, setDeleteAgencyId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [officesData, employeesData, agenciesData] = await Promise.all([
        apiGet<Office[]>("/offices"),
        apiGet<Employee[]>("/employees"),
        apiGet<Agency[]>("/agencies"),
      ]);
      setOffices(officesData);
      setEmployees(employeesData);
      setAgencies(agenciesData);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };


  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeName || newEmployeeOfficeIds.length === 0) {
      setMessage({ type: "error", text: "Name and at least one office are required" });
      return;
    }
    try {
      // Create one employee record per office
      for (const officeId of newEmployeeOfficeIds) {
        await apiPost("/employees", {
          name: newEmployeeName,
          email: newEmployeeEmail,
          office_id: officeId
        });
      }
      setMessage({ type: "success", text: "Employee added successfully" });
      setNewEmployeeName("");
      setNewEmployeeEmail("");
      setNewEmployeeOfficeIds([]);
      setShowAddEmployee(false);
      fetchData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to add employee" });
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployeeName || editEmployeeOfficeIds.length === 0) {
      setMessage({ type: "error", text: "Name and at least one office are required" });
      return;
    }
    
    try {
      // Find all employee records for this name
      const existingEmployees = employees.filter((emp) => emp.name === editingEmployeeName);
      const existingOfficeIds = existingEmployees.map((e) => e.office_id).filter(Boolean);
      
      // Delete offices that were removed
      const officesToRemove = existingOfficeIds.filter((id) => !editEmployeeOfficeIds.includes(id));
      for (const officeId of officesToRemove) {
        const empToDelete = existingEmployees.find((e) => e.office_id === officeId);
        if (empToDelete) {
          await apiDelete(`/admin/employees/${empToDelete.id}`);
        }
      }
      
      // Update the first employee record with email
      const employeeIdToUpdate = editingEmployeeId || (existingEmployees.length > 0 ? existingEmployees[0].id : null);
      if (employeeIdToUpdate) {
        const updateData: any = {
          email: editEmployeeEmail || null,
        };
        try {
          await apiPatch(`/employees/${employeeIdToUpdate}`, updateData);
        } catch (patchError: any) {
          console.error("Error updating employee:", patchError);
          throw new Error(`Failed to update employee: ${patchError.message || patchError}`);
        }
      }
      
      // Add new offices (create new employee records for offices that don't exist)
      const officesToAdd = editEmployeeOfficeIds.filter((id) => !existingOfficeIds.includes(id));
      for (const officeId of officesToAdd) {
        await apiPost("/employees", { 
          name: editingEmployeeName,
          email: editEmployeeEmail || null,
          office_id: officeId 
        });
      }
      
      setMessage({ type: "success", text: "Employee updated successfully" });
      setEditingEmployeeName(null);
      setEditingEmployeeId(null);
      setEditEmployeeEmail("");
      setEditEmployeeOfficeIds([]);
      fetchData();
    } catch (err: any) {
      console.error("Error in handleUpdateEmployee:", err);
      const errorMessage = err.message || err.toString() || "Failed to update employee";
      setMessage({ type: "error", text: errorMessage });
    }
  };

  const handleDeleteEmployee = async (employeeGroup: GroupedEmployee) => {
    if (!confirm(`Are you sure you want to delete ${employeeGroup.name} from all offices?`)) return;
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
      let url: string;
      if (useMultiOfficeImport) {
        url = `http://127.0.0.1:8000/admin/production/import-multi?month=${encodeURIComponent(importMonth)}`;
      } else {
        url = `http://127.0.0.1:8000/admin/production/import?office=${encodeURIComponent(importOffice)}&month=${encodeURIComponent(importMonth)}`;
      }

      const response = await fetch(url, {
        method: "POST",
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

  // Group employees by name with all their offices
  interface GroupedEmployee {
    name: string;
    employeeIds: number[];
    officeIds: number[];
  }

  const groupedEmployees: GroupedEmployee[] = React.useMemo(() => {
    const groups = new Map<string, GroupedEmployee>();
    
    employees.forEach((emp) => {
      if (!groups.has(emp.name)) {
        groups.set(emp.name, {
          name: emp.name,
          employeeIds: [],
          officeIds: [],
        });
      }
      const group = groups.get(emp.name)!;
      group.employeeIds.push(emp.id);
      group.officeIds.push(emp.office_id);
    });
    
    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [employees]);

  const sidebar = (
    <>
      <h2 style={sidebarHeadingStyle}>Admin Tools</h2>
      <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.5 }}>
        Manage employees, import production data, and delete agencies.
      </div>
    </>
  );

  return (
    <WorkbenchLayout
      title="Underwriting Workbench – Admin"
      subtitle="Configuration and admin tools"
      rightNote=""
      sidebar={sidebar}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
                <label style={{ display: "block", fontSize: 12, marginBottom: 4, fontWeight: 500 }}>Offices (select all that apply) *</label>
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
                <label style={{ display: "block", fontSize: 12, marginBottom: 4, fontWeight: 500 }}>Offices (select all that apply) *</label>
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
                  <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>Offices</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedEmployees.map((group) => {
                  const officeNames = group.officeIds
                    .map((officeId) => {
                      const office = offices.find((o) => o.id === officeId);
                      return office ? office.code : null;
                    })
                    .filter(Boolean)
                    .join(", ");
                  
                  return (
                    <tr key={group.name} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "8px 12px" }}>{group.name}</td>
                      <td style={{ padding: "8px 12px" }}>{officeNames || "—"}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>
                        <button
                          onClick={() => {
                            const employeesForName = employees.filter(e => e.name === group.name);
                            const firstEmployee = employeesForName[0];
                            // Find the first employee with an email, or use the first one
                            const employeeWithEmail = employeesForName.find(e => e.email) || firstEmployee;
                            setEditingEmployeeName(group.name);
                            setEditingEmployeeId(firstEmployee?.id || null);
                            setEditEmployeeEmail(employeeWithEmail?.email || "");
                            setEditEmployeeOfficeIds([...group.officeIds]);
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
                            marginRight: 8,
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(group)}
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
  );
};

export default AdminPage;
