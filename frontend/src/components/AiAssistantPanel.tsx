import React, { useRef, useEffect } from "react";
import { useAiAssistant, AiMessage } from "../hooks/useAiAssistant";

interface AiAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  context?: any;
  title?: string;
}

export function AiAssistantPanel({
  isOpen,
  onClose,
  context,
  title = "AI Assistant",
}: AiAssistantPanelProps) {
  const { messages, input, setInput, sendMessage, reset, isLoading, error } =
    useAiAssistant();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen) {
      textareaRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = () => {
    sendMessage({ context });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    if (confirm("Clear this conversation?")) {
      reset();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 0,
        top: 0,
        bottom: 0,
        width: "450px",
        background: "#ffffff",
        boxShadow: "-2px 0 8px rgba(0,0,0,0.1)",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
          color: "#fff",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>🤖</span>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h3>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {messages.length > 0 && (
            <button
              onClick={handleReset}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "#fff",
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 12,
                cursor: "pointer",
              }}
              title="Clear conversation"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#fff",
              fontSize: 20,
              cursor: "pointer",
              padding: "0 4px",
            }}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background: "#f9fafb",
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "#6b7280",
              fontSize: 13,
              marginTop: 40,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
            <p style={{ margin: 0 }}>Ask me anything about underwriting!</p>
            <p style={{ margin: "8px 0 0", fontSize: 12 }}>
              I can help with agency info, property questions, and more.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}

        {isLoading && (
          <div style={{ display: "flex", gap: 6, color: "#6b7280" }}>
            <span style={{ animation: "pulse 1.5s ease-in-out infinite" }}>
              ●
            </span>
            <span
              style={{
                animation: "pulse 1.5s ease-in-out 0.2s infinite",
              }}
            >
              ●
            </span>
            <span
              style={{
                animation: "pulse 1.5s ease-in-out 0.4s infinite",
              }}
            >
              ●
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div
          style={{
            background: "#fef2f2",
            color: "#991b1b",
            padding: "10px 16px",
            fontSize: 12,
            borderTop: "1px solid #fecaca",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Input Area */}
      <div
        style={{
          borderTop: "1px solid #e5e7eb",
          padding: "12px 16px",
          background: "#ffffff",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question... (Shift+Enter for new line)"
            disabled={isLoading}
            style={{
              flex: 1,
              border: "1px solid #d1d5db",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 13,
              fontFamily: "inherit",
              resize: "none",
              minHeight: 40,
              maxHeight: 120,
            }}
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={{
              background: input.trim() && !isLoading ? "#2563eb" : "#d1d5db",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "0 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
            }}
          >
            Send
          </button>
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: AiMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
      }}
    >
      <div
        style={{
          maxWidth: "85%",
          background: isUser ? "#2563eb" : "#ffffff",
          color: isUser ? "#ffffff" : "#111827",
          borderRadius: 12,
          padding: "10px 14px",
          fontSize: 13,
          lineHeight: 1.5,
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
        }}
      >
        {message.content}
      </div>
    </div>
  );
}

// Add keyframe animation for loading dots
const style = document.createElement("style");
style.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }
`;
document.head.appendChild(style);

