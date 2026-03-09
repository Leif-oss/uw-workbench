import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiPost } from "../api/client";
import { ChangePasswordModal } from "../components/ChangePasswordModal";

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [storedToken, setStoredToken] = useState<string | null>(null);
  const navigate = useNavigate();

  // Redirect if already logged in and password doesn't need to be changed
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      // Check if user needs to change password
      checkPasswordChangeRequirement(token);
    }
  }, [navigate]);

  // Helper function to get the redirect path (employee page if available, otherwise dashboard)
  const getRedirectPath = (employeeId: string | null, username: string | null): string => {
    if (employeeId && username) {
      return `/crm/employees?employeeId=${employeeId}&employeeName=${encodeURIComponent(username)}`;
    }
    return "/dashboard";
  };

  const checkPasswordChangeRequirement = async (token: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const userInfo = await response.json();
        if (userInfo.must_change_password) {
          setStoredToken(token);
          setShowPasswordChangeModal(true);
        } else {
          const employeeId = localStorage.getItem("employee_id");
          const username = localStorage.getItem("username");
          navigate(getRedirectPath(employeeId, username));
        }
      } else {
        // Token invalid, clear it
        localStorage.removeItem("auth_token");
      }
    } catch (err) {
      // If check fails, assume password change not required
      const employeeId = localStorage.getItem("employee_id");
      const username = localStorage.getItem("username");
      navigate(getRedirectPath(employeeId, username));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await apiPost<{
        access_token: string;
        token_type: string;
        username: string;
        name?: string;  // Employee name (if available)
        employee_id?: number;  // Employee ID (if available)
        is_admin: boolean;
        must_change_password?: boolean;  // Flag indicating password must be changed
      }>("/auth/login", {
        username,
        password,
      });

      // Store token in localStorage
      // Use employee name if available, otherwise use username
      const displayName = response.name || response.username;
      localStorage.setItem("auth_token", response.access_token);
      localStorage.setItem("username", displayName);
      if (response.employee_id) {
        localStorage.setItem("employee_id", String(response.employee_id));
      }
      localStorage.setItem("is_admin", String(response.is_admin || false));

      // Check if password change is required
      if (response.must_change_password) {
        setStoredToken(response.access_token);
        setShowPasswordChangeModal(true);
        // Don't navigate yet - wait for password change
      } else {
        // Redirect to employee page if available, otherwise dashboard
        navigate(getRedirectPath(
          response.employee_id ? String(response.employee_id) : null,
          displayName
        ));
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChangeSuccess = () => {
    // Password changed successfully, redirect to employee page if available, otherwise dashboard
    setShowPasswordChangeModal(false);
    const employeeId = localStorage.getItem("employee_id");
    const username = localStorage.getItem("username");
    navigate(getRedirectPath(employeeId, username));
  };

  return (
    <>
      <ChangePasswordModal
        isOpen={showPasswordChangeModal}
        onClose={() => {}} // Prevent closing on first login
        onSuccess={handlePasswordChangeSuccess}
        requireCurrentPassword={false} // On first login, label is "Temporary Password" instead of "Current Password"
      />
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
      <div
        style={{
          background: "white",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <h1
          style={{
            marginBottom: "1.5rem",
            textAlign: "center",
            color: "#333",
            fontSize: "1.75rem",
          }}
        >
          Underwriter Workbench
        </h1>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="username"
              style={{
                display: "block",
                marginBottom: "0.5rem",
                color: "#555",
                fontWeight: "500",
              }}
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "1rem",
                boxSizing: "border-box",
              }}
              autoFocus
            />
          </div>
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                marginBottom: "0.5rem",
                color: "#555",
                fontWeight: "500",
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "1rem",
                boxSizing: "border-box",
              }}
            />
          </div>
          {error && (
            <div
              style={{
                padding: "0.75rem",
                marginBottom: "1rem",
                background: "#fee",
                color: "#c33",
                borderRadius: "4px",
                fontSize: "0.9rem",
              }}
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "0.75rem",
              background: isLoading ? "#ccc" : "#667eea",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "1rem",
              fontWeight: "500",
              cursor: isLoading ? "not-allowed" : "pointer",
              marginBottom: "1rem",
            }}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <Link
            to="/forgot-password"
            style={{
              color: "#667eea",
              textDecoration: "none",
              fontSize: "0.9rem",
            }}
          >
            Forgot Password?
          </Link>
        </div>
      </div>
    </div>
    </>
  );
};

export default LoginPage;

