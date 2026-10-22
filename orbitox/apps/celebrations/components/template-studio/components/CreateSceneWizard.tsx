'use client';

import React, { useState } from 'react';
import { Plus, X, LayoutTemplate, Layout } from 'lucide-react';
import { TemplateEditorCommand } from '../engine/TemplateEditorCommands';

interface CreateSceneWizardProps {
  dispatch: (command: TemplateEditorCommand) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function CreateSceneWizard({ dispatch, isOpen: controlledIsOpen, onClose }: CreateSceneWizardProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (val: boolean) => {
    setInternalIsOpen(val);
    if (!val && onClose) onClose();
  };
  const [sceneName, setSceneName] = useState('New Scene');
  const [selectedPreset, setSelectedPreset] = useState<'blank' | 'hero'>('blank');

  if (!isOpen) {
    if (controlledIsOpen !== undefined) return null;
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: 'rgba(223, 186, 107, 0.1)',
          border: '1px solid rgba(223, 186, 107, 0.3)',
          color: '#DFBA6B',
          borderRadius: '8px',
          fontWeight: 600,
          fontSize: '0.85rem',
          cursor: 'pointer',
          transition: 'all 0.2s',
          marginLeft: 'auto'
        }}
      >
        <Plus size={16} />
        Add Scene
      </button>
    );
  }

  const handleCreate = () => {
    dispatch({
      type: 'CREATE_SCENE',
      name: sceneName,
      preset: selectedPreset
    });
    setIsOpen(false);
    setSceneName('New Scene');
    setSelectedPreset('blank');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: '#0D1429',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        width: '500px',
        padding: '24px',
        color: '#fff',
        boxShadow: '0 24px 48px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Create New Scene</h2>
          <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#94A3B8', marginBottom: '8px' }}>Scene Name</label>
          <input 
            type="text"
            value={sceneName}
            onChange={(e) => setSceneName(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#94A3B8', marginBottom: '12px' }}>Starting Blueprint</label>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
            {[
              { id: 'blank', icon: <Layout size={20} />, title: 'Blank Canvas', desc: 'Start from scratch' },
              { id: 'hero', icon: <LayoutTemplate size={20} />, title: 'Hero / Welcome', desc: 'Title & background' },
              { id: 'portraits', icon: <Layout size={20} />, title: 'Astral Portraits', desc: 'Couple profiles' },
              { id: 'story', icon: <Layout size={20} />, title: 'Our Story', desc: 'Timeline or narrative' },
              { id: 'countdown', icon: <Layout size={20} />, title: 'Countdown', desc: 'Event timer & details' },
              { id: 'itinerary', icon: <Layout size={20} />, title: 'Itinerary', desc: 'Schedule of events' },
              { id: 'rsvp', icon: <Layout size={20} />, title: 'RSVP', desc: 'Interactive form' },
              { id: 'gallery', icon: <Layout size={20} />, title: 'Gallery', desc: 'Photo grid' },
              { id: 'wishes', icon: <Layout size={20} />, title: 'Wishes', desc: 'Guestbook wall' },
            ].map(preset => (
              <div 
                key={preset.id}
                onClick={() => setSelectedPreset(preset.id as any)}
                style={{
                  padding: '12px',
                  border: selectedPreset === preset.id ? '2px solid #3B82F6' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: selectedPreset === preset.id ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{ color: selectedPreset === preset.id ? '#3B82F6' : '#94A3B8' }}>
                  {preset.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '2px' }}>{preset.title}</div>
                  <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{preset.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            onClick={() => setIsOpen(false)}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button 
            onClick={handleCreate}
            style={{
              padding: '8px 16px',
              background: '#3B82F6',
              border: 'none',
              color: '#fff',
              fontWeight: 600,
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Create Scene
          </button>
        </div>
      </div>
    </div>
  );
}
