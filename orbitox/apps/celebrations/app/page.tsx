'use client';

import React from 'react';
import { HeroSection } from '@/components/home/HeroSection';
import { PersonaCards } from '@/components/home/PersonaCards';
import { HowItWorks } from '@/components/home/HowItWorks';
import { ThemeShowcase } from '@/components/home/ThemeShowcase';
import { CapabilitiesGrid } from '@/components/home/CapabilitiesGrid';
import { PricingPreview } from '@/components/home/PricingPreview';
import { Footer } from '@/components/home/Footer';

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <HeroSection />
      <PersonaCards />
      <HowItWorks />
      <ThemeShowcase />
      <CapabilitiesGrid />
      <PricingPreview />
      <Footer />
    </div>
  );
}
