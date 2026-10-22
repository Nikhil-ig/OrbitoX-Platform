'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Heart, Clock, Star, Calendar, MapPin, Send } from 'lucide-react';

interface CelestialNavDockProps {
  primaryAccent?: string;
}

export function CelestialNavDock({ primaryAccent = '#E5C07B' }: CelestialNavDockProps) {
  const [activeId, setActiveId] = useState('celestial-hero-scene');

  const navItems = [
    { id: 'celestial-hero-scene', label: 'Prelude', icon: Sparkles },
    { id: 'celestial-celebrants-scene', label: 'Souls', icon: Heart },
    { id: 'celestial-clock-scene', label: 'Clock', icon: Clock },
    { id: 'celestial-constellation-scene', label: 'Stars', icon: Star },
    { id: 'celestial-itinerary-scene', label: 'Schedule', icon: Calendar },
    { id: 'celestial-sanctuary-scene', label: 'Sanctuary', icon: MapPin },
    { id: 'celestial-rsvp-scene', label: 'RSVP', icon: Send },
  ];

  const handleScrollTo = (id: string) => {
    setActiveId(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + window.innerHeight * 0.4;
      for (const item of navItems) {
        const el = document.getElementById(item.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveId(item.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      aria-label="Celestial Scene Navigation Dock"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 10px',
        borderRadius: '9999px',
        background: 'rgba(10, 13, 24, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(229, 192, 123, 0.25)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(229, 192, 123, 0.1)',
        maxWidth: 'calc(100vw - 32px)',
        overflowX: 'auto',
      }}
    >
      {navItems.map((item) => {
        const isActive = activeId === item.id;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleScrollTo(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '9999px',
              background: isActive
                ? `linear-gradient(135deg, ${primaryAccent}25 0%, ${primaryAccent}45 100%)`
                : 'transparent',
              border: isActive ? `1px solid ${primaryAccent}66` : '1px solid transparent',
              color: isActive ? primaryAccent : 'rgba(255, 255, 255, 0.65)',
              fontSize: '0.78rem',
              fontWeight: isActive ? 600 : 400,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.25s ease',
              minHeight: '40px',
            }}
            aria-label={`Jump to ${item.label}`}
          >
            <Icon size={14} style={{ flexShrink: 0 }} />
            <span style={{ display: isActive ? 'inline' : 'none' }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
