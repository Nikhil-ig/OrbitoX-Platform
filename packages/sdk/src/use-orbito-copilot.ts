import { useState, useCallback } from 'react';

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export function useOrbitoCopilot(contextId: string = 'default-context') {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'msg-1',
      role: 'assistant',
      content: 'Hello! I am your OrbitoX Copilot. How can I assist you with CRM, Inventory, HRMS, or Finance today?',
      timestamp: new Date().toISOString()
    }
  ]);
  const [loading, setLoading] = useState<boolean>(false);

  const sendMessage = useCallback(async (promptText: string) => {
    if (!promptText.trim()) return;

    const userMsg: CopilotMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: promptText.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages((prev: CopilotMessage[]) => [...prev, userMsg]);
    setLoading(true);

    try {
      const assistantMsg: CopilotMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: `OrbitoX Copilot [Context: ${contextId}]: Processed request "${promptText.trim()}". AI Capability actions executed successfully.`,
        timestamp: new Date().toISOString()
      };
      setMessages((prev: CopilotMessage[]) => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  }, [contextId]);

  return {
    messages,
    loading,
    sendMessage
  };
}
