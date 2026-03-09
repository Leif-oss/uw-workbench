export interface AIService {
  id: string;
  name: string;
  url: string;
  description: string;
}

export const AI_SERVICES: AIService[] = [
  {
    id: "chatgpt",
    name: "ChatGPT (OpenAI)",
    url: "https://chat.openai.com",
    description: "Best for general research and analysis",
  },
  {
    id: "claude",
    name: "Claude (Anthropic)",
    url: "https://claude.ai",
    description: "Excellent for detailed research and long-form content",
  },
  {
    id: "perplexity",
    name: "Perplexity AI",
    url: "https://www.perplexity.ai",
    description: "Optimized for research with source citations",
  },
  {
    id: "gemini",
    name: "Gemini (Google)",
    url: "https://gemini.google.com",
    description: "Strong for factual research and data analysis",
  },
  {
    id: "copilot",
    name: "Copilot (Microsoft)",
    url: "https://copilot.microsoft.com",
    description: "Good for business research and analysis",
  },
];

export const getAIServiceUrl = (serviceId: string): string => {
  const service = AI_SERVICES.find(s => s.id === serviceId);
  return service?.url || AI_SERVICES[0].url; // Default to ChatGPT
};

export const copyPromptAndOpenAI = async (
  prompt: string,
  serviceId: string = "chatgpt",
  successMessage?: string
): Promise<void> => {
  try {
    await navigator.clipboard.writeText(prompt);
    const url = getAIServiceUrl(serviceId);
    window.open(url, '_blank');
    
    const defaultMessage = `✅ Prompt copied!\n\n1. ${AI_SERVICES.find(s => s.id === serviceId)?.name || 'AI service'} is opening in a new window\n2. Paste (Ctrl+V) into the AI\n3. Hit Enter to get results`;
    alert(successMessage || defaultMessage);
  } catch (err) {
    alert('Failed to copy to clipboard. Please try again.');
    console.error('Clipboard error:', err);
  }
};
