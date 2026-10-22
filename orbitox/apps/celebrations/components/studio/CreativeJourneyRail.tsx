'use client';

import React from 'react';
import { CelebrationState } from './StudioData';
import {
  Sparkles,
  Palette,
  Users,
  Calendar,
  Feather,
  MapPin,
  HeartHandshake,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Rocket,
  SlidersHorizontal,
} from 'lucide-react';

export type JourneyStepId =
  | 'beginning'
  | 'style'
  | 'people'
  | 'moments'
  | 'story'
  | 'experience'
  | 'guests';

interface JourneyStep {
  id: JourneyStepId;
  stepNumber: string;
  label: string;
  description: string;
  icon: React.ElementType;
  isComplete: boolean;
  sectionTarget: string;
}

interface CreativeJourneyRailProps {
  activeStep: JourneyStepId;
  onSelectStep: (stepId: JourneyStepId, openSheet?: boolean) => void;
  state: CelebrationState;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenPreview: () => void;
  onOpenPublish: () => void;
}

export function CreativeJourneyRail({
  activeStep,
  onSelectStep,
  state,
  isCollapsed,
  onToggleCollapse,
  onOpenPreview,
  onOpenPublish,
}: CreativeJourneyRailProps) {
  const steps: JourneyStep[] = [
    {
      id: 'beginning',
      stepNumber: '01',
      label: 'Celebration Type',
      description: 'Occasion & concept',
      icon: Sparkles,
      isComplete: Boolean(state.occasion),
      sectionTarget: 'hero',
    },
    {
      id: 'style',
      stepNumber: '02',
      label: 'Visual Mood',
      description: 'Style & atmosphere',
      icon: Palette,
      isComplete: Boolean(state.theme),
      sectionTarget: 'hero',
    },
    {
      id: 'people',
      stepNumber: '03',
      label: 'People',
      description: 'Who is honored',
      icon: Users,
      isComplete: Boolean(state.protagonist1),
      sectionTarget: 'couple',
    },
    {
      id: 'moments',
      stepNumber: '04',
      label: 'Moments',
      description: 'Ceremony schedule',
      icon: Calendar,
      isComplete: Boolean(state.itinerary && state.itinerary.length > 0),
      sectionTarget: 'itinerary',
    },
    {
      id: 'story',
      stepNumber: '05',
      label: 'Your Story',
      description: 'Narrative & words',
      icon: Feather,
      isComplete: Boolean(state.storyBody || state.storyQuote),
      sectionTarget: 'story',
    },
    {
      id: 'experience',
      stepNumber: '06',
      label: 'Event Details',
      description: 'Venue & wayfinding',
      icon: MapPin,
      isComplete: Boolean(state.venueName && state.date),
      sectionTarget: 'venue',
    },
    {
      id: 'guests',
      stepNumber: '07',
      label: 'Guest Response',
      description: 'RSVP & gifts',
      icon: HeartHandshake,
      isComplete: Boolean(state.enableRsvp || state.enableShagun),
      sectionTarget: 'rsvp',
    },
  ];

  if (isCollapsed) {
    return (
      <aside
        style={{
          width: 52,
          minWidth: 52,
          background: '#09090c',
          borderRight: '1px solid rgba(255, 255, 255, 0.07)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 0',
          zIndex: 20,
          transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#a1a1aa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          title="Expand Creative Journey (F)"
        >
          <ChevronRight size={16} />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onSelectStep(step.id)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
                  color: isActive ? '#fbbf24' : '#71717a',
                  border: isActive ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid transparent',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s',
                }}
                title={`${step.stepNumber} ${step.label}`}
              >
                <Icon size={16} />
                {step.isComplete && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: '#10b981',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onOpenPublish}
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
            border: 'none',
            color: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="Publish Celebration"
        >
          <Rocket size={16} />
        </button>
      </aside>
    );
  }

  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        background: '#09090c',
        borderRight: '1px solid rgba(255, 255, 255, 0.07)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        userSelect: 'none',
        zIndex: 20,
        boxSizing: 'border-box',
        transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Rail Header */}
      <div
        style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <span
            style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#a1a1aa',
            }}
          >
            Your Celebration
          </span>
          <span style={{ fontSize: 11, color: '#52525b', fontWeight: 500 }}>Creative Journey</span>
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#71717a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          title="Collapse Sidebar (Focus Mode)"
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#71717a';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
          }}
        >
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* Steps List */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = activeStep === step.id;

          return (
            <div
              key={step.id}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                borderRadius: 8,
                background: isActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                border: isActive ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              {isActive && (
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 8,
                    bottom: 8,
                    width: 3,
                    background: '#fbbf24',
                    borderRadius: '0 2px 2px 0',
                  }}
                />
              )}

              <button
                type="button"
                onClick={() => onSelectStep(step.id, false)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 10px',
                  background: 'transparent',
                  border: 'none',
                  color: isActive ? '#ffffff' : '#a1a1aa',
                  cursor: 'pointer',
                  textAlign: 'left',
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isActive ? 'rgba(251, 191, 36, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                    color: isActive ? '#fbbf24' : '#71717a',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={14} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 10,
                        color: isActive ? '#fbbf24' : '#52525b',
                        fontWeight: 600,
                      }}
                    >
                      {step.stepNumber}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: isActive ? 600 : 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 10,
                      color: '#71717a',
                      marginTop: 1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {step.description}
                  </span>
                </div>

                {step.isComplete ? (
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                    title="Section configured"
                  >
                    <Check size={9} strokeWidth={2.5} />
                  </div>
                ) : (
                  <div
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.15)',
                      flexShrink: 0,
                      marginRight: 5,
                    }}
                  />
                )}
              </button>

              {/* On-demand customization trigger button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectStep(step.id, true);
                }}
                style={{
                  padding: '6px 8px',
                  background: 'transparent',
                  border: 'none',
                  color: isActive ? '#a1a1aa' : '#52525b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isActive ? 1 : 0.6,
                  transition: 'all 0.15s',
                }}
                title={`Open ${step.label} customization sheet`}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#fbbf24';
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = isActive ? '#a1a1aa' : '#52525b';
                  e.currentTarget.style.opacity = isActive ? '1' : '0.6';
                }}
              >
                <SlidersHorizontal size={13} />
              </button>
            </div>
          );
        })}
      </nav>

      {/* Rail Footer */}
      <div
        style={{
          padding: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(9, 9, 12, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={onOpenPreview}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            padding: '7px 12px',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 600,
            color: '#d4d4d8',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.09)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
            e.currentTarget.style.color = '#d4d4d8';
          }}
        >
          <Eye size={13} />
          <span>Guest View</span>
        </button>

        <button
          type="button"
          onClick={onOpenPublish}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            color: '#000000',
            background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(217, 119, 6, 0.25)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
          }}
        >
          <Rocket size={13} />
          <span>Publish Celebration</span>
        </button>
      </div>
    </aside>
  );
}
