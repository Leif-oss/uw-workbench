import { useState, useCallback } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

interface SendMessageOptions {
  context?: any;
}

export function useAiAssistant() {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (options?: SendMessageOptions) => {
      if (!input.trim()) return;

      const userMessage: AiMessage = {
        role: "user",
        content: input,
      };

      // Add user message immediately
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/ai/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: input,
            context: options?.context || null,
            history: messages,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        // Add assistant response
        const assistantMessage: AiMessage = {
          role: "assistant",
          content: data.answer,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "AI service is currently unavailable. Please try again later.";
        setError(errorMessage);

        // Remove the user message since we failed
        setMessages((prev) => prev.slice(0, -1));
        setInput(userMessage.content); // Restore input
      } finally {
        setIsLoading(false);
      }
    },
    [input, messages]
  );

  const reset = useCallback(() => {
    setMessages([]);
    setInput("");
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    messages,
    input,
    setInput,
    sendMessage,
    reset,
    isLoading,
    error,
  };
}

