import React, { useEffect, useState } from "react";
import { WorkbenchLayout } from "../components/WorkbenchLayout";
import { cardStyle, sidebarHeadingStyle } from "../ui/designSystem";
import { apiGet, apiPost, apiDelete, apiPut } from "../api/client";

interface Office {
  id: number;
  code: string;
  name: string;
}

interface Employee {
  id: number;
  name: string;
  office_id: number;
  office_name?: string;
}

interface Agency {
  id: number;
  name: string;
  code: string;
  office_id: number;
}

export const AdminPage: React.FC = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [offices, setOffices] = useState<Office[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Employee form state
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeeOfficeId, setNewEmployeeOfficeId] = useState<number | null>(null);
  
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editEmployeeOfficeId, setEditEmployeeOfficeId] = useState<number | null>(null);

  // Production import state
  const [importOffice, setImportOffice] = useState<string>("");
  const [importMonth, setImportMonth] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);

  // Agency deletion state
  const [deleteOfficeFilter, setDeleteOfficeFilter] = useState<number | null>(null);
  const [deleteAgencyId, setDeleteAgencyId] = useState<number | null>(null);

  useEffect(() => {
    if (authenticated) {
      fetchData();
    }
  }, [authenticated]);

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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      await apiPost("/admin/auth", { password });
      setAuthenticated(true);
    } catch (err: any) {
      setAuthError(err.message || "Invalid password");
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeName || !newEmployeeOfficeId) {
      setMessage({ type: "error", text: "Name and office are required" });
      return;
    }
    try {
      await apiPost("/employees", { name: newEmployeeName, office_id: newEmployeeOfficeId });
      setMessage({ type: "success", text: "Employee added successfully" });
      setNewEmployeeName("");
      setNewEmployeeOfficeId(null);
      setShowAddEmployee(false);
      fetchData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to add employee" });
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee || !editEmployeeOfficeId) return;
    try {
      await apiPut(`/employees/${editingEmployee.id}`, {
        name: editingEmployee.name,
        office_id: editEmployeeOfficeId,
      });
      setMessage({ type: "success", text: "Employee updated successfully" });
      setEditingEmployee(null);
      setEditEmployeeOfficeId(null);
      fetchData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update employee" });
    }
  };

  const handleDeleteEmployee = async (employeeId: number) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;
    try {
      await apiDelete(`/admin/employees/${employeeId}`);
      setMessage({ type: "success", text: "Employee deleted successfully" });
      fetchData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to delete employee" });
    }
  };

  const handleImportProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importOffice || !importMonth || !importFile) {
      setMessage({ type: "error", text: "Office, month, and file are required" });
      return;
    }

    const formData = new FormData();
    formData.append("file", importFile);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/admin/production/import?office=${encodeURIComponent(importOffice)}&month=${encodeURIComponent(importMonth)}`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Import failed: ${response.statusText}`);
      }

      const result = await response.json();
      setMessage({
        type: "success",
        text: `Imported ${result.production_rows_imported} rows. Created ${result.new_agencies_created} new agencies.`,
      });
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

  const sidebar = (
    <>
      <h2 style={sidebarHeadingStyle}>Admin Tools</h2>
      <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.5 }}>
        {authenticated
          ? "Manage employees, import production data, and delete agencies."
          : "Enter admin password to access tools."}
      </div>
    </>
  );

  if (!authenticated) {
    return (
      <WorkbenchLayout
        title="Underwriting Workbench – Admin"
        subtitle="Configuration and admin tools"
        rightNote=""
        sidebar={sidebar}
      >
        <div style={{ ...cardStyle, padding: 24, maxWidth: 400, margin: "40px auto" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 600 }}>Admin Authentication</h3>
          <form onSubmit={handleAuth}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4, fontWeight: 500 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                }}
                placeholder="Enter admin password"
              />
            </div>
            {authError && (
              <div style={{ marginBottom: 12, padding: 8, background: "#fee", color: "#c00", fontSize: 13, borderRadius: 4 }}>
                {authError}
              </div>
            )}
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "10px 16px",
                background: "#1e40af",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Unlock Admin Panel
            </button>
          </form>
        </div>
      </WorkbenchLayout>
    );
  }

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

          {!showAddEmployee && !editingEmployee && (
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
              <h4 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600 }}>Add New Employee</h4>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4, fontWeight: 500 }}>Name</label>
                <input
                  type="text"
                  value={newEmployeeName}
                  onChange={(e) => setNewEmployeeName(e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #d1d5db", fontSize: 13 }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4, fontWeight: 500 }}>Office</label>
                <select
                  value={newEmployeeOfficeId || ""}
                  onChange={(e) => setNewEmployeeOfficeId(Number(e.target.value))}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #d1d5db", fontSize: 13 }}
                >
                  <option value="">Select office...</option>
                  {offices.map((office) => (
                    <option key={office.id} value={office.id}>
                      {office.code} - {office.name}
                    </option>
                  ))}
                </select>
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
                    setNewEmployeeOfficeId(null);
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

          {editingEmployee && (
            <form onSubmit={handleUpdateEmployee} style={{ marginBottom: 20, padding: 16, background: "#f9fafb", borderRadius: 8 }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600 }}>Edit Employee</h4>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4, fontWeight: 500 }}>Name</label>
                <input
                  type="text"
                  value={editingEmployee.name}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #d1d5db", fontSize: 13 }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4, fontWeight: 500 }}>Office</label>
                <select
                  value={editEmployeeOfficeId || ""}
                  onChange={(e) => setEditEmployeeOfficeId(Number(e.target.value))}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #d1d5db", fontSize: 13 }}
                >
                  <option value="">Select office...</option>
                  {offices.map((office) => (
                    <option key={office.id} value={office.id}>
                      {office.code} - {office.name}
                    </option>
                  ))}
                </select>
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
                    setEditingEmployee(null);
                    setEditEmployeeOfficeId(null);
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
                  <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>Office</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600, color: "#6b7280" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const office = offices.find((o) => o.id === emp.office_id);
                  return (
                    <tr key={emp.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "8px 12px" }}>{emp.name}</td>
                      <td style={{ padding: "8px 12px" }}>{office ? `${office.code} - ${office.name}` : "—"}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>
                        <button
                          onClick={() => {
                            setEditingEmployee(emp);
                            setEditEmployeeOfficeId(emp.office_id);
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
                          onClick={() => handleDeleteEmployee(emp.id)}
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
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
            Upload an Excel file with monthly production data. The system will auto-create new agencies and update existing ones.
          </p>
          <form onSubmit={handleImportProduction}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12, marginBottom: 12 }}>
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
                <input
                  type="file"
                  accept=".xls,.xlsx"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #d1d5db", fontSize: 13 }}
                />
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
      </div>
    </WorkbenchLayout>
  );
};

export default AdminPage;
