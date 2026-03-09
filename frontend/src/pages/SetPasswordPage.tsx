import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { apiPost } from "../api/client";

const SetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid link. Please request a new set-password link from your administrator.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid link");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setIsLoading(true);
    try {
      // Use the reset-password endpoint (same mechanism)
      await apiPost("/auth/reset-password", {
        token,
        new_password: password,
      });
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to set password");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
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
            Password Set Successfully!
          </h1>
          <div
            style={{
              padding: "1rem",
              marginBottom: "1.5rem",
              background: "#e8f5e9",
              color: "#2e7d32",
              borderRadius: "4px",
              fontSize: "0.95rem",
              textAlign: "center",
            }}
          >
            Your password has been set successfully. Redirecting to login...
          </div>
          <div style={{ textAlign: "center" }}>
            <Link
              to="/login"
              style={{
                color: "#667eea",
                textDecoration: "none",
                fontSize: "0.9rem",
              }}
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
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
          Set Your Password
        </h1>
        <p
          style={{
            marginBottom: "1.5rem",
            textAlign: "center",
            color: "#666",
            fontSize: "0.9rem",
          }}
        >
          Welcome! Please set your password to get started. It must be at least 8 characters and include uppercase, lowercase, and a number.
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
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
              autoFocus
            />
          </div>
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="confirmPassword"
              style={{
                display: "block",
                marginBottom: "0.5rem",
                color: "#555",
                fontWeight: "500",
              }}
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            disabled={isLoading || !token}
            style={{
              width: "100%",
              padding: "0.75rem",
              background: isLoading || !token ? "#ccc" : "#667eea",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "1rem",
              fontWeight: "500",
              cursor: isLoading || !token ? "not-allowed" : "pointer",
              marginBottom: "1rem",
            }}
          >
            {isLoading ? "Setting Password..." : "Set Password"}
          </button>
        </form>
        <div style={{ textAlign: "center" }}>
          <Link
            to="/login"
            style={{
              color: "#667eea",
              textDecoration: "none",
              fontSize: "0.9rem",
            }}
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SetPasswordPage;



