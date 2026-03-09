import React, { useState } from "react";
import { apiPost } from "../api/client";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  requireCurrentPassword: boolean;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  requireCurrentPassword,
}) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    // On first login (requireCurrentPassword=false), we still need the temp password
    // The field will be labeled as "Temporary Password" in that case
    if (!currentPassword) {
      setError(requireCurrentPassword ? "Current password is required" : "Temporary password is required");
      return;
    }

    if (!newPassword) {
      setError("New password is required");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setError("Password must contain at least one uppercase letter");
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      setError("Password must contain at least one lowercase letter");
      return;
    }

    if (!/\d/.test(newPassword)) {
      setError("Password must contain at least one number");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Prevent using the same password
    if (currentPassword === newPassword) {
      setError("New password must be different from your current password");
      return;
    }

    setIsLoading(true);
    try {
      // Use change-password endpoint which handles must_change_password flag
      await apiPost("/auth/change-password", {
        current_password: currentPassword, // Always use current password (temp password on first login)
        new_password: newPassword,
      });

      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");

      // Call success callback (will redirect to dashboard)
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to change password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!requireCurrentPassword) {
      // On first login, don't allow closing without changing password
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "white",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
          width: "100%",
          maxWidth: "450px",
          position: "relative",
        }}
      >
        {requireCurrentPassword && (
          <button
            onClick={handleClose}
            style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "#666",
            }}
          >
            ×
          </button>
        )}

        <h2
          style={{
            marginBottom: "1rem",
            color: "#333",
            fontSize: "1.5rem",
          }}
        >
          {requireCurrentPassword ? "Change Password" : "Set Your Password"}
        </h2>

        {!requireCurrentPassword && (
          <p
            style={{
              marginBottom: "1.5rem",
              color: "#666",
              fontSize: "0.95rem",
            }}
          >
            You must change your temporary password before continuing. Please set a new secure password.
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="currentPassword"
              style={{
                display: "block",
                marginBottom: "0.5rem",
                color: "#555",
                fontWeight: "500",
              }}
            >
              {requireCurrentPassword ? "Current Password" : "Temporary Password"}
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
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
              placeholder={requireCurrentPassword ? "Enter your current password" : "Enter your temporary password"}
            />
            {!requireCurrentPassword && (
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "#666",
                  marginTop: "0.25rem",
                }}
              >
                Use the temporary password provided by your administrator
              </div>
            )}
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="newPassword"
              style={{
                display: "block",
                marginBottom: "0.5rem",
                color: "#555",
                fontWeight: "500",
              }}
            >
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "1rem",
                boxSizing: "border-box",
              }}
              autoFocus={!requireCurrentPassword}
            />
            <div
              style={{
                fontSize: "0.85rem",
                color: "#666",
                marginTop: "0.25rem",
              }}
            >
              Must be at least 8 characters with uppercase, lowercase, and a number
            </div>
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
              Confirm New Password
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
            }}
          >
            {isLoading ? "Changing Password..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

