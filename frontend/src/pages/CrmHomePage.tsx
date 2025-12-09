import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api/client";

type Office = {
  id: number;
  code: string;
  name: string;
};

type Employee = {
  id: number;
  name: string;
  office_id: number | null;
};

type Log = {
  id: number;
  user: string;
  datetime: string;
  action: string;
  agency_id: number | null;
  office: string | null;
  notes: string | null;
};

type UnderwriterStats = {
  user: string;
  inPersonLast90: number;
  totalYtd: number;
};

const CrmHomePage: React.FC = () => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [officesResp, employeesResp, logsResp] = await Promise.all([
          apiGet<Office[]>("/offices"),
          apiGet<Employee[]>("/employees"),
          apiGet<Log[]>("/logs"),
        ]);
        setOffices(officesResp || []);
        setEmployees(employeesResp || []);
        setLogs(logsResp || []);
        if (!selectedOfficeId && officesResp && officesResp.length > 0) {
          setSelectedOfficeId(officesResp[0].id);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load CRM data");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [selectedOfficeId]);

  const underwriterStats = useMemo(() => {
    const now = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(now.getDate() - 90);
    const currentYear = now.getFullYear();

    const statsMap = new Map<string, UnderwriterStats>();

    logs.forEach((log) => {
      const user = (log.user || "").trim();
      if (!user) return;
      const logDate = new Date(log.datetime);
      if (Number.isNaN(logDate.getTime())) return;
      const action = (log.action || "").toLowerCase();

      const current = statsMap.get(user) || {
        user,
        inPersonLast90: 0,
        totalYtd: 0,
      };

      if (logDate.getFullYear() === currentYear) {
        current.totalYtd += 1;
      }

      const isInPerson = action.includes("in person");
      if (isInPerson && logDate >= ninetyDaysAgo) {
        current.inPersonLast90 += 1;
      }

      statsMap.set(user, current);
    });

    let result = Array.from(statsMap.values());

    if (selectedOfficeId) {
      const allowedUsers = new Set(
        employees
          .filter((emp) => emp.office_id === selectedOfficeId)
          .map((emp) => (emp.name || "").trim())
      );
      result = result.filter((s) => allowedUsers.has((s.user || "").trim()));
    }

    result.sort((a, b) => {
      if (b.inPersonLast90 !== a.inPersonLast90) {
        return b.inPersonLast90 - a.inPersonLast90;
      }
      return b.totalYtd - a.totalYtd;
    });

    return result;
  }, [logs, employees, selectedOfficeId]);

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        minHeight: "calc(100vh - 56px)",
        background: "#f5f7fb",
      }}
    >
      <div
        style={{
          width: 260,
          borderRight: "1px solid #e5e7eb",
          padding: 12,
          backgroundColor: "#f9fafb",
        }}
      >
        <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13, color: "#111827" }}>Offices</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {offices.map((office) => {
            const isActive = office.id === selectedOfficeId;
            return (
              <div
                key={office.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 6,
                  padding: "6px 8px",
                  borderRadius: 6,
                  backgroundColor: isActive ? "#eff6ff" : "transparent",
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedOfficeId(office.id)}
                  style={{
                    textAlign: "left",
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    color: isActive ? "#1d4ed8" : "#374151",
                    cursor: "pointer",
                    fontSize: 13,
                    flex: 1,
                  }}
                >
                  {office.code} – {office.name}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/crm/offices/${office.id}`)}
                  style={{
                    fontSize: 11,
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "1px solid #d1d5db",
                    backgroundColor: "#ffffff",
                    color: "#1f2937",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  View
                </button>
              </div>
            );
          })}
          {offices.length === 0 && <div style={{ fontSize: 12, color: "#6b7280" }}>No offices found.</div>}
        </div>
      </div>

      <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            width: "75%",
            maxWidth: "75%",
            padding: "8px 12px",
            borderRadius: 8,
            background: "#1f2937",
            color: "#f9fafb",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          CRM – Agency & Marketing Overview
        </div>

        {error && <div style={{ color: "red", fontSize: 12 }}>{error}</div>}
        {isLoading && <div style={{ fontSize: 12, color: "#6b7280" }}>Loading CRM data…</div>}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              backgroundColor: "#ffffff",
              minWidth: 180,
            }}
          >
            <div style={{ fontSize: 11, textTransform: "uppercase", color: "#6b7280", marginBottom: 4 }}>
              YTD New Business Premium
            </div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>$1,234,567</div>
          </div>
          <div
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              backgroundColor: "#ffffff",
              minWidth: 180,
            }}
          >
            <div style={{ fontSize: 11, textTransform: "uppercase", color: "#6b7280", marginBottom: 4 }}>
              YTD New Business Count
            </div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>123</div>
          </div>
          <div
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              backgroundColor: "#ffffff",
              minWidth: 180,
            }}
          >
            <div style={{ fontSize: 11, textTransform: "uppercase", color: "#6b7280", marginBottom: 4 }}>
              % Up vs Prior Year
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#16a34a" }}>+8.4%</div>
          </div>
        </div>

        <div
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            backgroundColor: "#ffffff",
            flex: 1,
            minHeight: 280,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Underwriter Marketing Activity</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "4px 8px" }}>Underwriter</th>
                <th style={{ padding: "4px 8px" }}>In-person calls (last 90 days)</th>
                <th style={{ padding: "4px 8px" }}>Total marketing calls (YTD)</th>
              </tr>
            </thead>
            <tbody>
              {underwriterStats.map((uw) => (
                <tr key={uw.user} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "4px 8px" }}>{uw.user}</td>
                  <td style={{ padding: "4px 8px" }}>{uw.inPersonLast90}</td>
                  <td style={{ padding: "4px 8px" }}>{uw.totalYtd}</td>
                </tr>
              ))}
              {underwriterStats.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: "6px 8px", fontSize: 12, color: "#6b7280" }}>
                    No marketing logs found for the selected office yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CrmHomePage;
