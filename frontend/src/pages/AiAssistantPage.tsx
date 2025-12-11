import React, { useState, useRef, useEffect } from "react";
import { useAiAssistant, AiMessage } from "../hooks/useAiAssistant";

export function AiAssistantPage() {
  const { messages, input, setInput, sendMessage, reset, isLoading, error } =
    useAiAssistant();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = () => {
    sendMessage({ context: { page: "ai-assistant-standalone" } });
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
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#f9fafb",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
          color: "#fff",
          padding: "20px 24px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 32 }}>🤖</span>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
              AI Assistant
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, opacity: 0.9 }}>
              Ask me anything about underwriting, properties, agencies, or
              insurance workflows
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleReset}
            style={{
              marginTop: 12,
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff",
              borderRadius: 6,
              padding: "6px 12px",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            🗑️ Clear Conversation
          </button>
        )}
      </div>

      {/* Main Chat Area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          maxWidth: "1200px",
          width: "100%",
          margin: "0 auto",
          padding: "24px",
          overflow: "hidden",
        }}
      >
        {/* Messages Container */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            background: "#ffffff",
            borderRadius: 12,
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            marginBottom: 16,
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: "#6b7280",
                paddingTop: 60,
              }}
            >
              <div style={{ fontSize: 64, marginBottom: 16 }}>💬</div>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: "#111827",
                  marginBottom: 8,
                }}
              >
                Welcome to your AI Assistant!
              </h2>
              <p style={{ fontSize: 14, marginBottom: 24 }}>
                I can help you with:
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: 16,
                  maxWidth: 800,
                  margin: "0 auto",
                  textAlign: "left",
                }}
              >
                <SuggestionCard
                  icon="🏢"
                  title="Agency Questions"
                  example="What should I consider when underwriting for a large agency?"
                />
                <SuggestionCard
                  icon="🏗️"
                  title="Property Analysis"
                  example="What are key risk factors for commercial properties?"
                />
                <SuggestionCard
                  icon="📊"
                  title="Market Insights"
                  example="What trends should I watch in the current market?"
                />
                <SuggestionCard
                  icon="📋"
                  title="Process Help"
                  example="Walk me through the underwriting workflow"
                />
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <MessageBubble key={idx} message={msg} />
          ))}

          {isLoading && (
            <div
              style={{
                display: "flex",
                gap: 8,
                padding: "16px 0",
                color: "#6b7280",
              }}
            >
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
              padding: "12px 16px",
              fontSize: 13,
              borderRadius: 8,
              marginBottom: 16,
              border: "1px solid #fecaca",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Input Area */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 12,
            padding: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything... (Press Enter to send, Shift+Enter for new line)"
              disabled={isLoading}
              style={{
                flex: 1,
                border: "2px solid #e5e7eb",
                borderRadius: 8,
                padding: "12px 16px",
                fontSize: 14,
                fontFamily: "inherit",
                resize: "none",
                minHeight: 56,
                maxHeight: 200,
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
              onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              style={{
                background:
                  input.trim() && !isLoading ? "#2563eb" : "#d1d5db",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 600,
                cursor:
                  input.trim() && !isLoading ? "pointer" : "not-allowed",
                minHeight: 56,
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => {
                if (input.trim() && !isLoading) {
                  e.currentTarget.style.background = "#1d4ed8";
                }
              }}
              onMouseLeave={(e) => {
                if (input.trim() && !isLoading) {
                  e.currentTarget.style.background = "#2563eb";
                }
              }}
            >
              {isLoading ? "Thinking..." : "Send"}
            </button>
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#9ca3af",
              marginTop: 8,
              textAlign: "center",
            }}
          >
            Press <kbd>Enter</kbd> to send • <kbd>Shift+Enter</kbd> for new
            line
          </div>
        </div>
      </div>
    </div>
  );
}

function SuggestionCard({
  icon,
  title,
  example,
}: {
  icon: string;
  title: string;
  example: string;
}) {
  return (
    <div
      style={{
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div
        style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 4 }}
      >
        {title}
      </div>
      <div style={{ fontSize: 12, color: "#6b7280", fontStyle: "italic" }}>
        "{example}"
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
        marginBottom: 16,
      }}
    >
      <div
        style={{
          maxWidth: "75%",
          background: isUser ? "#2563eb" : "#f3f4f6",
          color: isUser ? "#ffffff" : "#111827",
          borderRadius: 16,
          padding: "12px 16px",
          fontSize: 14,
          lineHeight: 1.6,
          boxShadow: isUser
            ? "0 2px 4px rgba(37, 99, 235, 0.2)"
            : "0 1px 2px rgba(0,0,0,0.05)",
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
  kbd {
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 2px 6px;
    font-family: monospace;
    font-size: 11px;
  }
`;
document.head.appendChild(style);

export default AiAssistantPage;

