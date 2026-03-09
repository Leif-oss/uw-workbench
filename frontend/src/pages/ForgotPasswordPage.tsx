import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiPost } from "../api/client";

const ForgotPasswordPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await apiPost("/auth/request-password-reset", { username });
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
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
            Check Your Email
          </h1>
          <div
            style={{
              padding: "1rem",
              marginBottom: "1.5rem",
              background: "#e8f5e9",
              color: "#2e7d32",
              borderRadius: "4px",
              fontSize: "0.95rem",
            }}
          >
            If an account exists with that username or email, a password reset link has been sent.
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
              Back to Login
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
          Forgot Password
        </h1>
        <p
          style={{
            marginBottom: "1.5rem",
            textAlign: "center",
            color: "#666",
            fontSize: "0.95rem",
          }}
        >
          Enter your username or email address and we'll send you a link to reset your password.
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="username"
              style={{
                display: "block",
                marginBottom: "0.5rem",
                color: "#555",
                fontWeight: "500",
              }}
            >
              Username or Email
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
            {isLoading ? "Sending..." : "Send Reset Link"}
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

export default ForgotPasswordPage;



