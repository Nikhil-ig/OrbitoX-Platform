'use client';

import React from 'react';
import { WelcomeEntryDoor } from '../WelcomeEntryDoor';
import { GlasshouseWelcomeDoor } from './GlasshouseWelcomeDoor';
import { AmalfiVillaWelcomeDoor } from './AmalfiVillaWelcomeDoor';
import { CelestialChronosWelcomeDoor } from './CelestialChronosWelcomeDoor';

interface WelcomeDoorDispatcherProps {
  templateSlug?: string;
  themeSlug?: string;
  title: string;
  subtitle?: string;
  date?: string;
  venue?: string;
  primaryColor?: string;
  monogramImage?: string;
  monogramInitials?: string;
  onFinish: () => void;
}

export function WelcomeDoorDispatcher({
  templateSlug,
  themeSlug,
  title,
  subtitle,
  date,
  venue,
  primaryColor,
  monogramImage,
  monogramInitials,
  onFinish,
}: WelcomeDoorDispatcherProps) {
  // If the template has a native in-page 3D portico (like romantic-doors), bypass modal door
  if (templateSlug === 'romantic-doors') {
    return null;
  }

  // 1. Crystal Glasshouse Bespoke Conservatory Doors
  if (templateSlug === 'enchanted-glasshouse' || themeSlug === 'enchanted-glasshouse') {
    return (
      <GlasshouseWelcomeDoor
        title={title}
        subtitle={subtitle || 'The Starlight Union in the Crystal Conservatory'}
        date={date}
        venue={venue}
        primaryColor={primaryColor || '#E2C889'}
        onFinish={onFinish}
      />
    );
  }

  // 2. Amalfi Villa Bespoke Italian Wrought-Iron Gates
  if (templateSlug === 'amalfi-riviera' || themeSlug === 'amalfi-riviera') {
    return (
      <AmalfiVillaWelcomeDoor
        title={title}
        subtitle={subtitle || 'A Sunset Romance on the Clifftops of Ravello'}
        date={date}
        venue={venue}
        primaryColor={primaryColor || '#E8B86D'}
        onFinish={onFinish}
      />
    );
  }

  // 3. Celestial Parallax Aerospace Chronos & Rose-Gold Gates
  if (templateSlug === 'celestial-parallax' || themeSlug === 'celestial-rose-gold') {
    return (
      <CelestialChronosWelcomeDoor
        title={title}
        subtitle={subtitle || 'The Celestial Convergence Under the Midnight Stars'}
        date={date}
        venue={venue}
        primaryColor={primaryColor || '#E8A598'}
        onFinish={onFinish}
      />
    );
  }

  // 4. Royal Regalia & Standard Grand Palace Entrance
  return (
    <WelcomeEntryDoor
      title={title}
      subtitle={subtitle}
      date={date}
      venue={venue}
      primaryColor={primaryColor}
      monogramImage={monogramImage}
      monogramInitials={monogramInitials}
      onFinish={onFinish}
    />
  );
}

