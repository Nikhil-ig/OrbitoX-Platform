'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Compass,
  Layers,
  FileCode2,
  Palette,
  Smartphone,
  Sparkles,
  Zap,
  Puzzle,
  ShieldCheck,
  Eye,
  History,
  Rocket,
  Sliders,
  Crop,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { TemplateSchema } from '../types/TemplateSchema';

export type TemplateStudioNavTab =
  | 'overview'
  | 'experience'
  | 'scenes'
  | 'contentSchema'
  | 'mediaSlots'
  | 'designSystem'
  | 'responsive'
  | 'motion'
  | 'interactions'
  | 'modules'
  | 'customization'
  | 'accessibility'
  | 'preview'
  | 'versions'
  | 'publish';

interface TemplateStudioLeftRailProps {
  activeTab: TemplateStudioNavTab;
  onSelectTab: (tab: TemplateStudioNavTab) => void;
  schema: TemplateSchema;
}

export function TemplateStudioLeftRail({
  activeTab,
  onSelectTab,
  schema,
}: TemplateStudioLeftRailProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  interface WorkflowNavTabItem {
    id: TemplateStudioNavTab;
    label: string;
    icon: any;
    badge?: string;
    hasWarning?: boolean;
  }

  interface WorkflowGroup {
    id: string;
    title: string;
    items: WorkflowNavTabItem[];
  }

  // Structured Workflows (Experience → Design → Content → Rules → Release)
  const workflowGroups: WorkflowGroup[] = [
    {
      id: 'experience',
      title: 'EXPERIENCE',
      items: [
        { id: 'scenes' as TemplateStudioNavTab, label: 'Scene Builder', icon: Layers, badge: `${schema.scenes.length}` },
        { id: 'experience' as TemplateStudioNavTab, label: 'Experience Map', icon: Compass },
        { id: 'modules' as TemplateStudioNavTab, label: 'Optional Modules', icon: Puzzle, badge: `${schema.modules.filter(m => m.isEnabled).length}` },
      ],
    },
    {
      id: 'design',
      title: 'DESIGN & PHYSICS',
      items: [
        { id: 'designSystem' as TemplateStudioNavTab, label: 'Design Tokens', icon: Palette },
        {
          id: 'responsive' as TemplateStudioNavTab,
          label: 'Responsive Rules',
          icon: Smartphone,
          hasWarning: schema.healthReport?.warnings.some((w) => w.targetTab === 'responsive'),
        },
        { id: 'motion' as TemplateStudioNavTab, label: 'Motion Studio', icon: Sparkles },
        { id: 'interactions' as TemplateStudioNavTab, label: 'Interactions', icon: Zap },
      ],
    },
    {
      id: 'content',
      title: 'CONTENT CONTRACT',
      items: [
        { id: 'contentSchema' as TemplateStudioNavTab, label: 'Content Schema', icon: FileCode2, badge: `${schema.contentSchema.length}` },
        { id: 'mediaSlots' as TemplateStudioNavTab, label: 'Media Slots & Crops', icon: Crop, badge: `${schema.mediaSlots.length}` },
      ],
    },
    {
      id: 'rules',
      title: 'GOVERNANCE & RULES',
      items: [
        { id: 'customization' as TemplateStudioNavTab, label: 'Customization Matrix', icon: Sliders },
        { id: 'accessibility' as TemplateStudioNavTab, label: 'Accessibility (A11y)', icon: ShieldCheck },
      ],
    },
    {
      id: 'release',
      title: 'RELEASE & AUDIT',
      items: [
        { id: 'preview' as TemplateStudioNavTab, label: 'Preview & Stress Data', icon: Eye },
        { id: 'versions' as TemplateStudioNavTab, label: 'Version History', icon: History, badge: `v${schema.activeVersion}` },
        {
          id: 'publish' as TemplateStudioNavTab,
          label: 'Publish Checklist',
          icon: Rocket,
          badge: schema.healthReport?.isPublishable ? 'Ready' : 'Issues',
          hasWarning: !schema.healthReport?.isPublishable,
        },
      ],
    },
  ];

  if (isCollapsed) {
    return (
      <aside
        style={{
          width: '56px',
          minWidth: '56px',
          background: '#070B16',
          borderRight: '1px solid rgba(223, 186, 107, 0.14)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 0',
          height: 'calc(100vh - 60px)',
          userSelect: 'none',
          zIndex: 30,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => onSelectTab('overview')}
            title="Overview Dashboard"
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'overview' ? 'rgba(223, 186, 107, 0.2)' : 'transparent',
              color: activeTab === 'overview' ? '#DFBA6B' : 'var(--cel-text-muted, #94A3B8)',
              cursor: 'pointer',
            }}
          >
            <LayoutDashboard size={18} />
          </button>

          <div style={{ width: '28px', height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />

          {workflowGroups.flatMap((g) => g.items).slice(0, 8).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={item.label}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? 'rgba(223, 186, 107, 0.2)' : 'transparent',
                  color: isActive ? '#DFBA6B' : 'var(--cel-text-muted, #94A3B8)',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <Icon size={18} />
                {item.hasWarning && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#F59E0B',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setIsCollapsed(false)}
          title="Expand Navigation Rail"
          style={{
            padding: '8px',
            borderRadius: '6px',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--cel-text-muted, #94A3B8)',
            cursor: 'pointer',
          }}
        >
          <PanelLeftOpen size={16} />
        </button>
      </aside>
    );
  }

  return (
    <aside
      style={{
        width: '240px',
        minWidth: '240px',
        background: '#070B16',
        borderRight: '1px solid rgba(223, 186, 107, 0.14)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: 'calc(100vh - 60px)',
        overflowY: 'auto',
        userSelect: 'none',
      }}
    >
      <div style={{ padding: '12px 8px' }}>
        {/* Top: Overview Home Item */}
        <button
          onClick={() => onSelectTab('overview')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '8px 12px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'overview' ? 'rgba(223, 186, 107, 0.18)' : 'transparent',
            color: activeTab === 'overview' ? '#DFBA6B' : '#E2E8F0',
            fontWeight: activeTab === 'overview' ? 700 : 600,
            fontSize: '0.82rem',
            cursor: 'pointer',
            textAlign: 'left',
            marginBottom: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LayoutDashboard size={16} color={activeTab === 'overview' ? '#DFBA6B' : 'var(--cel-text-dim, #64748B)'} />
            <span>Overview & Health</span>
          </div>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: '4px',
              background: schema.healthReport?.isPublishable ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              color: schema.healthReport?.isPublishable ? '#10B981' : '#F59E0B',
            }}
          >
            {schema.healthReport?.score ?? 100}%
          </span>
        </button>

        {/* 5 Grouped Workflow Areas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {workflowGroups.map((group) => {
            const isGroupCollapsed = collapsedGroups[group.id] || false;

            return (
              <div key={group.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div
                  onClick={() => toggleGroup(group.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 10px',
                    fontSize: '0.64rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: 'var(--cel-text-dim, #64748B)',
                    cursor: 'pointer',
                  }}
                >
                  <span>{group.title}</span>
                  {isGroupCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                </div>

                {!isGroupCollapsed && (
                  <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {group.items.map((tab) => {
                      const isActive = activeTab === tab.id;
                      const IconComponent = tab.icon;

                      return (
                        <button
                          key={tab.id}
                          onClick={() => onSelectTab(tab.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            padding: '7px 12px',
                            borderRadius: '7px',
                            border: 'none',
                            background: isActive ? 'rgba(223, 186, 107, 0.16)' : 'transparent',
                            color: isActive ? '#DFBA6B' : 'var(--cel-text-secondary, #CBD5E1)',
                            fontWeight: isActive ? 700 : 500,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.12s ease',
                            position: 'relative',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <IconComponent
                              size={15}
                              color={isActive ? '#DFBA6B' : 'var(--cel-text-dim, #64748B)'}
                            />
                            <span>{tab.label}</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {tab.hasWarning && <AlertCircle size={13} color="#F59E0B" />}
                            {tab.badge && (
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  background: isActive
                                    ? 'rgba(223, 186, 107, 0.25)'
                                    : 'rgba(255, 255, 255, 0.05)',
                                  color: isActive ? '#DFBA6B' : 'var(--cel-text-dim, #64748B)',
                                  fontFamily: 'monospace',
                                  fontWeight: 600,
                                }}
                              >
                                {tab.badge}
                              </span>
                            )}
                          </div>

                          {isActive && (
                            <span
                              style={{
                                position: 'absolute',
                                left: 0,
                                top: '20%',
                                bottom: '20%',
                                width: '3px',
                                background: '#DFBA6B',
                                borderRadius: '0 4px 4px 0',
                              }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </nav>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Footer: Readiness Metric & Rail Collapse */}
      <div
        style={{
          padding: '10px 14px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--cel-text-dim, #64748B)' }}>
          <span>Celestial Odyssey</span>
          <span>•</span>
          <span style={{ fontFamily: 'monospace' }}>v{schema.activeVersion}</span>
        </div>

        <button
          onClick={() => setIsCollapsed(true)}
          title="Collapse Sidebar for Wider Canvas"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--cel-text-dim, #64748B)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <PanelLeftClose size={15} />
        </button>
      </div>
    </aside>
  );
}
