'use client';

import * as React from 'react';
import { ConsoleShell } from '../../components/console-shell';
import PlatformTestsPage from '../../../platform/tests/page';

export default function ConsoleDeveloperTestsPage() {
  return (
    <ConsoleShell activeId="overview">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <PlatformTestsPage />
      </div>
    </ConsoleShell>
  );
}
