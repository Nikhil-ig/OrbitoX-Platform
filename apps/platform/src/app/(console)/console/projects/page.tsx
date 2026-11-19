'use client';

import * as React from 'react';
import { ConsoleShell } from '../components/console-shell';
import FleetPage from '../../platform/fleet/page';

export default function ConsoleProjectsPage() {
  return (
    <ConsoleShell activeId="projects">
      <FleetPage />
    </ConsoleShell>
  );
}
