# -*- coding: utf-8 -*-
from pathlib import Path
path = Path('src/pages/AgenciesPage.tsx')
text = path.read_text()
start = text.index('  const sidebar = (')
new_tail = '''  const sidebar = (
    <>
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: "#111827",
            marginBottom: 8,
          }}
        >
          Agency Filters
        </h2>

        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 4,
            }}
          >
            Search (Name or Code)
          </div>
          <input
            style={{
              width: "100%",
              padding: "7px 9px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              fontSize: 13,
              outline: "none",
              backgroundColor: "#f9fafb",
            }}
            placeholder="e.g. Snapp, C3, Fresno"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 4,
            }}
          >
            Office
          </div>
          <select
            style={{
              width: "100%",
              padding: "7px 9px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              fontSize: 13,
              outline: "none",
              backgroundColor: "#f9fafb",
            }}
            value={officeFilter}
            onChange={(e) => setOfficeFilter(e.target.value)}
          >
            <option value="all">All offices</option>
            {offices.map((o) => (
              <option key={o.id} value={String(o.id)}>
                {o.code} - {o.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 4,
            }}
          >
            Primary Underwriter
          </div>
          <select
            style={{
              width: "100%",
              padding: "7px 9px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              fontSize: 13,
              outline: "none",
              backgroundColor: "#f9fafb",
            }}
            value={underwriterFilter}
            onChange={(e) => setUnderwriterFilter(e.target.value)}
          >
            <option value="all">All underwriters</option>
            {employees.map((emp) => (
              <option key={emp.id} value={String(emp.id)}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          paddingTop: 8,
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: 4,
          }}
        >
          Agencies ({filteredAgencies.length})
        </div>

        <div
          style={{
            maxHeight: 380,
            overflow: "auto",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 11,
            }}
          >
            <thead
              style={{
                position: "sticky",
                top: 0,
                background: "#f9fafb",
                zIndex: 1,
              }}
            >
              <tr>
                <th
                  style={{
                    padding: "4px 6px",
                    textAlign: "left",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  Name
                </th>
                <th
                  style={{
                    padding: "4px 6px",
                    textAlign: "left",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  Code
                </th>
                <th
                  style={{
                    padding: "4px 6px",
                    textAlign: "left",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  Primary UW
                </th>
                <th
                  style={{
                    padding: "4px 6px",
                    textAlign: "left",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAgencies.map((ag) => {
                const isSelected = selectedAgency && ag.id === selectedAgency.id;
                const primaryName = (ag.primary_underwriter || "").trim() || "-";

                return (
                  <tr
                    key={ag.id}
                    style={{
                      backgroundColor: isSelected ? "#dbeafe" : "transparent",
                      cursor: "pointer",
                    }}
                    onClick={() => loadContactsAndLogs(ag)}
                  >
                    <td
                      style={{
                        padding: "4px 6px",
                        borderBottom: "1px solid #e5e7eb",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {ag.name}
                    </td>
                    <td
                      style={{
                        padding: "4px 6px",
                        borderBottom: "1px solid #e5e7eb",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {ag.code}
                    </td>
                    <td
                      style={{
                        padding: "4px 6px",
                        borderBottom: "1px solid #e5e7eb",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {primaryName === "-" ? (
                        "-"
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            goToEmployee(
                              ag.primary_underwriter_id ?? null,
                              ag.primary_underwriter || null
                            );
                          }}
                          style={{
                            border: "none",
                            padding: "2px 6px",
                            borderRadius: 999,
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            cursor: "pointer",
                            fontSize: 11,
                          }}
                        >
                          {primaryName}
                        </button>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "4px 6px",
                        borderBottom: "1px solid #e5e7eb",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          loadContactsAndLogs(ag);
                        }}
                        style={{
                          marginRight: 6,
                          padding: "2px 6px",
                          borderRadius: 6,
                          border: "1px solid #d1d5db",
                          background: "#f9fafb",
                          cursor: "pointer",
                        }}
                      >
                        Select
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAgency(ag.id);
                        }}
                        style={{
                          padding: "2px 6px",
                          borderRadius: 6,
                          border: "1px solid #f87171",
                          background: "#fef2f2",
                          color: "#b91c1c",
                          cursor: "pointer",
                        }}
                        disabled={loading || secondaryLoading}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredAgencies.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: "6px 6px",
                      textAlign: "center",
                      fontSize: 11,
                      color: "#9ca3af",
                    }}
                  >
                    No agencies match current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid #e5e7eb",
          paddingTop: 10,
          marginTop: 6,
          fontSize: 11,
          color: "#4b5563",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: 4,
          }}
        >
          Notes
        </div>
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          <li>Filters update the list and KPI counts.</li>
          <li>Use search for code or name; Office narrows by office assignment.</li>
          <li>This page is the main agency workbench.</li>
        </ul>
      </div>
    </>
  );

  const kpiCards = (
    <div
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 8,
      }}
    >
      <div style={cardStyle}>
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            color: "#6b7280",
            letterSpacing: "0.05em",
            marginBottom: 6,
          }}
        >
          Total Agencies
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>
          {totalAgencies}
        </div>
        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
          In the database
        </div>
      </div>

      <div style={cardStyle}>
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            color: "#6b7280",
            letterSpacing: "0.05em",
            marginBottom: 6,
          }}
        >
          Agencies In View
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>
          {agenciesInView}
        </div>
        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
          Matching current filters
        </div>
      </div>

      <div style={cardStyle}>
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            color: "#6b7280",
            letterSpacing: "0.05em",
            marginBottom: 6,
          }}
        >
          Selected Agency
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>
          {selectedAgencyName}
        </div>
        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
          Click an agency row to select
        </div>
      </div>
    </div>
  );
  return (
    <WorkbenchLayout
      title="Underwriting Workbench - Agencies"
      subtitle="Agency-level view of contacts, logs, and ownership"
      rightNote="Agency workbench - baseline layout"
      sidebar={sidebar}
    >
      <>
        {kpiCards}

        <section
          style={{
            background: "#ffffff",
            borderRadius: 12,
            padding: "10px 12px",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 4,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                Agencies Workbench
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>
                Load, select, and work an agency with contacts and marketing logs.
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <button onClick={loadAgencies} disabled={loading || secondaryLoading}>
              {loading ? "Working..." : "Refresh"}
            </button>

            <input
              type="text"
              placeholder="New agency name"
              value={newAgencyName}
              onChange={(e) => setNewAgencyName(e.target.value)}
              style={{ padding: "0.25rem 0.5rem", minWidth: "200px" }}
            />

            <button onClick={handleCreateAgency} disabled={loading || secondaryLoading}>
              {loading ? "Working..." : "Create agency"}
            </button>

            {status && (
              <span style={{ fontSize: 12, color: "#374151" }}>
                {status}
              </span>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              minHeight: 360,
            }}
          >
            <section
              style={{
                flex: 1.6,
                display: "flex",
                flexDirection: "column",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                padding: "8px 10px",
                background: "#ffffff",
                gap: 10,
              }}
            >
              {!selectedAgency ? (
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
                  Select an agency from the sidebar list to view contacts and marketing logs.
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 4,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                        {selectedAgency.name}
                      </div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>
                        {selectedAgency.code ? `Code: ${selectedAgency.code}` : "Agency selected"}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      fontSize: 11,
                    }}
                  >
                    {selectedAgency.primary_underwriter && (
                      <button
                        type="button"
                        onClick={() =>
                          goToEmployee(
                            selectedAgency.primary_underwriter_id ?? null,
                            selectedAgency.primary_underwriter || null
                          )
                        }
                        style={{
                          border: "none",
                          padding: "4px 8px",
                          borderRadius: 999,
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          cursor: "pointer",
                        }}
                      >
                        View underwriter in Employees
                      </button>
                    )}
                    {selectedAgency.office_id && (
                      <button
                        type="button"
                        onClick={() => goToOffice(selectedAgency.office_id)}
                        style={{
                          border: "none",
                          padding: "4px 8px",
                          borderRadius: 999,
                          background: "#ecfdf3",
                          color: "#15803d",
                          cursor: "pointer",
                        }}
                      >
                        View office in Offices
                      </button>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: "1rem",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "1.5rem",
                    }}
                  >
                    {/* Contacts section */}
                    <div>
                      <h2>Contacts for: {selectedAgency.name}</h2>
                      {contacts.length === 0 ? (
                        <p>No contacts found for this agency.</p>
                      ) : (
                        <table
                          style={{
                            marginTop: "0.5rem",
                            borderCollapse: "collapse",
                            width: "100%",
                          }}
                        >
                          <thead>
                            <tr>
                              <th
                                style={{
                                  borderBottom: "1px solid #ccc",
                                  textAlign: "left",
                                  padding: "0.25rem 0.5rem",
                                }}
                              >
                                Name
                              </th>
                              <th
                                style={{
                                  borderBottom: "1px solid #ccc",
                                  textAlign: "left",
                                  padding: "0.25rem 0.5rem",
                                }}
                              >
                                Title
                              </th>
                              <th
                                style={{
                                  borderBottom: "1px solid #ccc",
                                  textAlign: "left",
                                  padding: "0.25rem 0.5rem",
                                }}
                              >
                                Email
                              </th>
                              <th
                                style={{
                                  borderBottom: "1px solid #ccc",
                                  textAlign: "left",
                                  padding: "0.25rem 0.5rem",
                                }}
                              >
                                Phone
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {contacts.map((c) => (
                              <tr key={c.id}>
                                <td
                                  style={{
                                    borderBottom: "1px solid #eee",
                                    padding: "0.25rem 0.5rem",
                                  }}
                                >
                                  {c.name}
                                </td>
                                <td
                                  style={{
                                    borderBottom: "1px solid #eee",
                                    padding: "0.25rem 0.5rem",
                                  }}
                                >
                                  {c.title || ""}
                                </td>
                                <td
                                  style={{
                                    borderBottom: "1px solid " + "#eee",
                                    padding: "0.25rem 0.5rem",
                                  }}
                                >
                                  {c.email || ""}
                                </td>
                                <td
                                  style={{
                                    borderBottom: "1px solid #eee",
                                    padding: "0.25rem 0.5rem",
                                  }}
                                >
                                  {c.phone || ""}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Logs section */}
                    <div>
                      <h2>Marketing Logs for: {selectedAgency.name}</h2>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.5rem",
                          alignItems: "center",
                          marginBottom: "0.5rem",
                          marginTop: "0.25rem",
                        }}
                      >
                        <div>
                          <label>
                            Filter by user:
                            <input
                              type="text"
                              value={logFilterUser}
                              onChange={(e) => setLogFilterUser(e.target.value)}
                              style={{ marginLeft: "0.5rem" }}
                              placeholder="e.g. Allan, Daly"
                            />
                          </label>
                        </div>

                        <div>
                          <label>
                            Action:
                            <select
                              value={logFilterAction}
                              onChange={(e) => setLogFilterAction(e.target.value)}
                              style={{ marginLeft: "0.5rem" }}
                            >
                              <option value="all">All</option>
                              <option value="phone">Phone</option>
                              <option value="email">Email</option>
                              <option value="zoom">Zoom</option>
                              <option value="visit">Visit</option>
                            </select>
                          </label>
                        </div>

                        <div>
                          <span style={{ marginRight: "0.5rem" }}>Range:</span>
                          <label style={{ marginRight: "0.5rem" }}>
                            <input
                              type="radio"
                              name="log-range"
                              value="all"
                              checked={logFilterRange === "all"}
                              onChange={() => setLogFilterRange("all")}
                            />{" "}
                            All
                          </label>
                          <label>
                            <input
                              type="radio"
                              name="log-range"
                              value="30d"
                              checked={logFilterRange === "30d"}
                              onChange={() => setLogFilterRange("30d")}
                            />{" "}
                            Last 30 days
                          </label>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setLogFilterUser("");
                            setLogFilterRange("all");
                            setLogFilterAction("all");
                          }}
                        >
                          Clear filters
                        </button>

                        <button
                          type="button"
                          onClick={handleExportLogsCsv}
                          disabled={!selectedAgency || !hasAnyLogs || filteredLogs.length === 0}
                          title="Export the currently visible logs to CSV"
                        >
                          Export CSV
                        </button>
                      </div>

                      {selectedAgency && hasAnyLogs && (
                        <div
                          style={{
                            marginBottom: "0.5rem",
                            fontSize: "0.9rem",
                          }}
                        >
                          <span style={{ marginRight: "1rem" }}>
                            <strong>Total logs:</strong> {totalLogsCount}
                          </span>
                          <span style={{ marginRight: "1rem" }}>
                            <strong>Last 30 days:</strong> {logsLast30Count}
                          </span>
                          <span>
                            <strong>Distinct users:</strong> {distinctUsersCount}
                          </span>
                        </div>
                      )}

                      {selectedAgency && hasAnyLogs && (logFilterUser or logFilterRange != "all" or logFilterAction != "all")
'''
path.write_text(text[:start] + new_tail)


