'use client';

import React, { useState } from 'react';
import { Button } from '../components/button';

export function DynamicCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string, tools?: string[] }[]>([]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    
    // Simulate AI Agentic response
    setTimeout(() => {
      let aiResponse = "I've analyzed your request.";
      let tools: string[] = [];

      if (input.toLowerCase().includes('lead')) {
        aiResponse = "I see you're talking about a lead. I am executing the 'convert_lead' action via the ActionRegistry.";
        tools = ['crm.convertLead'];
      } else {
        aiResponse = "I've searched the ActionRegistry, but I couldn't find a federated action that perfectly matches your request.";
      }

      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse, tools }]);
    }, 800);

    setInput('');
  };

  return (
    <>
      {/* Floating Action Button */}
      <div 
        style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 100 }}
      >
        <button 
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-primary)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
      </div>

      {/* Copilot Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          right: '24px',
          width: '380px',
          height: '500px',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 12px 24px rgba(0,0,0,0.4)',
          border: '1px solid var(--border-glass)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 100,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px',
            backgroundColor: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border-glass)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>Agentic Copilot</h3>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.length === 0 && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', marginTop: '20px' }}>
                How can I help you orchestrate plugins today?
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: m.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-primary)',
                color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
                padding: '10px 14px',
                borderRadius: '8px',
                maxWidth: '85%',
                fontSize: '14px',
                lineHeight: '1.4'
              }}>
                {m.content}
                
                {m.tools && m.tools.length > 0 && (
                  <div style={{ 
                    marginTop: '8px', 
                    paddingTop: '8px', 
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    fontSize: '12px',
                    color: 'var(--success)'
                  }}>
                    ✓ Tools Invoked: {m.tools.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: '16px', borderTop: '1px solid var(--border-glass)', display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              value={input}
              onChange={(e: any) => setInput(e.target.value)}
              onKeyDown={(e: any) => e.key === 'Enter' && handleSend()}
              placeholder="e.g. Convert this lead..."
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-glass)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
            <Button variant="primary" onClick={handleSend}>Send</Button>
          </div>
        </div>
      )}
    </>
  );
}
