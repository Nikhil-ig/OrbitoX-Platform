import React from 'react';
import { NodeRendererRegistry } from './NodeRendererRegistry';
import { CelestialCountdownClock } from './smart/CelestialCountdownClock';
import { CelestialConstellationMap } from './smart/CelestialConstellationMap';
import { CelestialParallaxPortrait } from './smart/CelestialParallaxPortrait';

// Phase 11: Register Smart Components

NodeRendererRegistry.registerSmart('CelestialCountdownClock', {
  kind: 'smart',
  render: (context) => <CelestialCountdownClock {...context} />
});

NodeRendererRegistry.registerSmart('CelestialConstellationMap', {
  kind: 'smart',
  render: (context) => <CelestialConstellationMap {...context} />
});

NodeRendererRegistry.registerSmart('CelestialParallaxPortrait', {
  kind: 'smart',
  render: (context) => <CelestialParallaxPortrait {...context} />
});
