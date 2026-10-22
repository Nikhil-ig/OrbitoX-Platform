'use client';

import React, { useState } from 'react';
import {
  Sparkles, Layers, Box, Globe, Briefcase, ShoppingBag,
  Utensils, Hotel, HeartHandshake, Calendar, FileCode, Check, X, ArrowRight
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (type: 'blank' | 'template' | 'ai', category: string, universeId?: string) => void;
}

export function OrbitoXNewProjectModal({ isOpen, onClose, onSelectProject }: Props) {
  const [activeTab, setActiveTab] = useState<'templates' | 'blank' | 'ai'>('templates');
  const [selectedCategory, setSelectedCategory] = useState<string>('saas');
  const [aiPrompt, setAiPrompt] = useState<string>('Build a sleek, high-conversion SaaS landing page with dark obsidian styling and starlight gold accents.');

  if (!isOpen) return null;

  const categories = [
    { id: 'saas', name: 'SaaS & Tech', icon: Box, desc: 'High-conversion software platforms, APIs & developer tools', defaultUniverse: 'minimal' },
    { id: 'business', name: 'Enterprise Business', icon: Briefcase, desc: 'Corporate consulting, finance & modern venture agencies', defaultUniverse: 'editorial' },
    { id: 'portfolio', name: 'Portfolio & Agency', icon: Globe, desc: 'Creative studio showcases, architectural & photography portfolios', defaultUniverse: 'editorial' },
    { id: 'ecommerce', name: 'Ecommerce Store', icon: ShoppingBag, desc: 'Luxury products, apparel, merchandise & direct checkout', defaultUniverse: 'luxury' },
    { id: 'restaurant', name: 'Restaurant & Culinary', icon: Utensils, desc: 'Fine dining menus, reservations & culinary experience stories', defaultUniverse: 'botanical' },
    { id: 'hotel', name: 'Boutique Hotel & Travel', icon: Hotel, desc: 'Luxury hospitality suites, destination villas & bookings', defaultUniverse: 'amalfi' },
    { id: 'celebration', name: 'Weddings & Celebrations', icon: HeartHandshake, desc: 'Celestial wedding decrees, RSVP passes & family stardust', defaultUniverse: 'celestial' },
    { id: 'event', name: 'Events & Festivals', icon: Calendar, desc: 'Conferences, summits, speaker lineups & VIP tickets', defaultUniverse: 'noir' },
    { id: 'custom', name: 'Custom Blank Canvas', icon: FileCode, desc: 'Clean slate with zero preconceived layouts', defaultUniverse: 'minimal' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(20px)',
        zIndex: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '840px',
          maxHeight: '90vh',
          background: '#090D1A',
          border: '1px solid rgba(223, 186, 107, 0.4)',
          borderRadius: '20px',
          boxShadow: '0 30px 100px rgba(0, 0, 0, 0.9), 0 0 50px rgba(223, 186, 107, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 28px 18px 28px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #DFBA6B 0%, #B08D4C 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#060B1A',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                }}
              >
                🪐
              </div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                Create New Website
              </h2>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)' }}>
              Start with a battle-tested industry template, an AI prompt, or a clean canvas.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.4)',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Method Switcher Tabs */}
        <div
          style={{
            display: 'flex',
            padding: '12px 28px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            gap: '8px',
          }}
        >
          {[
            { id: 'templates' as const, label: 'Curated Templates', icon: Layers },
            { id: 'ai' as const, label: '✦ AI Generator', icon: Sparkles },
            { id: 'blank' as const, label: 'Blank Canvas', icon: FileCode },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: isActive ? 'rgba(223, 186, 107, 0.15)' : 'transparent',
                  border: isActive ? '1px solid rgba(223, 186, 107, 0.4)' : '1px solid transparent',
                  borderRadius: '8px',
                  color: isActive ? '#DFBA6B' : 'rgba(255, 255, 255, 0.6)',
                  padding: '8px 16px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {activeTab === 'templates' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{
                      background: isSelected ? 'rgba(223, 186, 107, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1.5px solid #DFBA6B' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '16px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: isSelected ? 'rgba(223, 186, 107, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isSelected ? '#DFBA6B' : 'rgba(255, 255, 255, 0.7)',
                        }}
                      >
                        <Icon size={16} />
                      </div>
                      {isSelected && <Check size={16} color="#DFBA6B" />}
                    </div>

                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF' }}>{cat.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.5)', lineHeight: 1.4 }}>
                      {cat.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.5 }}>
                Describe your desired website vision. OrbitoX AI will construct full SceneGraph hierarchies, configure typography pairings, and assemble cohesive sections.
              </div>

              <textarea
                rows={4}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. Build a high-end luxury watch showcase with cinematic video hero and pricing..."
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(223, 186, 107, 0.3)',
                  borderRadius: '12px',
                  padding: '14px',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                  outline: 'none',
                  resize: 'none',
                }}
              />

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.4)', alignSelf: 'center' }}>
                  Quick Suggestions:
                </span>
                {[
                  'B2B SaaS Developer Platform',
                  'High-Fashion Editorial Lookbook',
                  'Minimalist Architectural Studio',
                  'Cyberpunk Music Festival',
                ].map((sugg) => (
                  <button
                    key={sugg}
                    onClick={() => setAiPrompt(`Build a world-class website for: ${sugg}. Include hero, features, and pricing.`)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '9999px',
                      padding: '4px 10px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                    }}
                  >
                    + {sugg}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'blank' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'rgba(223, 186, 107, 0.1)',
                  border: '1px solid rgba(223, 186, 107, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#DFBA6B',
                }}
              >
                <FileCode size={30} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>
                Clean Slate Canvas
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', maxWidth: '420px', lineHeight: 1.5 }}>
                Initialize an empty website with your chosen Design Universe. You can drag and drop sections or build elements from scratch.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0, 0, 0, 0.3)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
            All templates produce 100% editable SceneGraph nodes.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: 'rgba(255, 255, 255, 0.7)',
                padding: '8px 16px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              onClick={() => {
                const categoryDef = categories.find((c) => c.id === selectedCategory);
                onSelectProject(activeTab === 'templates' ? 'template' : activeTab, selectedCategory, categoryDef?.defaultUniverse);
                onClose();
              }}
              style={{
                background: 'linear-gradient(135deg, #DFBA6B 0%, #B08D4C 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#060B1A',
                padding: '8px 20px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 18px rgba(223, 186, 107, 0.25)',
              }}
            >
              <span>{activeTab === 'ai' ? 'Generate Website ✦' : 'Create Website'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
