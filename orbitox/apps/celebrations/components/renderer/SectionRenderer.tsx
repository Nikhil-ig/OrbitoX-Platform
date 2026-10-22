'use client';

import React from 'react';
import { ExperienceSection, Theme } from '@orbitox-io/celebrations';
import { HeroSection } from './sections/HeroSection';
import { CountdownSection } from './sections/CountdownSection';
import { CoupleProfileSection } from './sections/CoupleProfileSection';
import { StorySection } from './sections/StorySection';
import { EventsScheduleSection } from './sections/EventsScheduleSection';
import { VenueMapSection } from './sections/VenueMapSection';
import { GallerySection } from './sections/GallerySection';
import { RsvpSection } from './sections/RsvpSection';
import { WishesGuestbookSection } from './sections/WishesGuestbookSection';
import { DressCodeSection } from './sections/DressCodeSection';
import { GiftRegistrySection } from './sections/GiftRegistrySection';
import { LivePollSection } from './sections/LivePollSection';

interface Props {
  section: ExperienceSection;
  theme: Theme;
  experienceId?: string;
  tenantId?: string;
}

export function SectionRenderer({ section, theme, experienceId, tenantId }: Props) {
  if (!section.isEnabled) return null;

  switch (section.sectionType) {
    case 'hero':
      return <HeroSection section={section} theme={theme} />;
    case 'countdown':
      return <CountdownSection section={section} theme={theme} />;
    case 'couple_profile':
    case 'person_profile':
      return <CoupleProfileSection section={section} theme={theme} />;
    case 'story':
      return <StorySection section={section} theme={theme} />;
    case 'events_schedule':
      return <EventsScheduleSection section={section} theme={theme} />;
    case 'venue_map':
      return <VenueMapSection section={section} theme={theme} />;
    case 'gallery':
      return <GallerySection section={section} theme={theme} />;
    case 'gift_registry':
      return <GiftRegistrySection section={section} theme={theme} experienceId={experienceId} tenantId={tenantId} />;
    case 'live_poll':
      return <LivePollSection section={section} theme={theme} experienceId={experienceId} tenantId={tenantId} />;
    case 'rsvp':
      return <RsvpSection section={section} theme={theme} experienceId={experienceId} tenantId={tenantId} />;
    case 'wishes_guestbook':
      return <WishesGuestbookSection section={section} theme={theme} experienceId={experienceId} tenantId={tenantId} />;
    case 'dress_code':
      return <DressCodeSection section={section} theme={theme} />;
    default:
      return null;
  }
}
