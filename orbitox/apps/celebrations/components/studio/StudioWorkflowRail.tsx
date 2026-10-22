'use client';

import React from 'react';
import { WorkflowArea, CelebrationState } from './StudioData';
import {
  Sparkles,
  Palette,
  Users,
  Calendar,
  Feather,
  LayoutGrid,
  HeartHandshake,
  CheckCircle2,
  Eye,
  Rocket,
  Compass,
} from 'lucide-react';

interface StudioWorkflowRailProps {
  activeArea: WorkflowArea;
  onSelectArea: (area: WorkflowArea) => void;
  state: CelebrationState;
  onOpenPreview: () => void;
  onOpenPublish: () => void;
}

export function StudioWorkflowRail({
  activeArea,
  onSelectArea,
  state,
  onOpenPreview,
  onOpenPublish,
}: StudioWorkflowRailProps) {
  const workflowItems: {
    id: WorkflowArea;
    label: string;
    description: string;
    icon: React.ElementType;
    isComplete: boolean;
  }[] = [
    {
      id: 'overview',
      label: 'Overview',
      description: 'Studio summary & health',
      icon: Compass,
      isComplete: true,
    },
    {
      id: 'occasion',
      label: 'Occasion',
      description: 'Occasion mood & concept',
      icon: Sparkles,
      isComplete: Boolean(state.occasion),
    },
    {
      id: 'style',
      label: 'Style & Theme',
      description: 'Editorial art direction',
      icon: Palette,
      isComplete: Boolean(state.theme),
    },
    {
      id: 'people',
      label: 'People',
      description: 'Honored protagonists',
      icon: Users,
      isComplete: Boolean(state.protagonist1),
    },
    {
      id: 'event',
      label: 'Event Details',
      description: 'Palace venue, date & city',
      icon: Calendar,
      isComplete: Boolean(state.date && state.venueName),
    },
    {
      id: 'story',
      label: 'Story & Narrative',
      description: 'Personal love story & quotes',
      icon: Feather,
      isComplete: Boolean(state.storyBody || state.storyQuote),
    },
    {
      id: 'content',
      label: 'Content Modules',
      description: 'Schedule, dress code, gallery',
      icon: LayoutGrid,
      isComplete: state.enableItinerary || state.enableGallery,
    },
    {
      id: 'guests',
      label: 'Guest Experience',
      description: 'RSVP, plus-ones & UPI Shagun',
      icon: HeartHandshake,
      isComplete: state.enableRsvp || state.enableShagun,
    },
  ];

  return (
    <aside className="cs-rail">
      {/* Top Header Label */}
      <div className="cs-rail-header">
        <span className="cs-rail-header-label">Studio Journey</span>
        <span className="cs-rail-header-badge">Non-linear</span>
      </div>

      {/* Workflow Navigation Links */}
      <nav className="cs-rail-nav">
        {workflowItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeArea === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectArea(item.id)}
              className={`cs-rail-item ${isActive ? 'active' : ''}`}
            >
              {isActive && <span className="cs-rail-active-indicator" />}

              <div className="cs-rail-icon-wrapper">
                <Icon size={15} />
              </div>

              <div className="cs-rail-text-col">
                <div className="cs-rail-row-top">
                  <span className="cs-rail-item-title">{item.label}</span>
                  {item.isComplete && (
                    <CheckCircle2 size={13} style={{ color: '#10b981', opacity: 0.9 }} />
                  )}
                </div>
                <p className="cs-rail-item-desc">{item.description}</p>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions Bar */}
      <div className="cs-rail-footer">
        <button
          type="button"
          onClick={onOpenPreview}
          className="cs-rail-btn-preview"
        >
          <Eye size={13} />
          <span>Full Preview</span>
        </button>

        <button
          type="button"
          onClick={onOpenPublish}
          className="cs-rail-btn-publish"
        >
          <Rocket size={13} />
          <span>Publish Celebration</span>
        </button>
      </div>
    </aside>
  );
}
