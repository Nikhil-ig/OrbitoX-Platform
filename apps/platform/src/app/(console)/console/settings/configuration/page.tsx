'use client';

import * as React from 'react';
import { ConsoleShell } from '../../components/console-shell';
import ConfigurationPage from '../../../platform/configuration/page';

export default function ConsoleSettingsConfigurationPage() {
  return (
    <ConsoleShell activeId="appearance">
      <ConfigurationPage />
    </ConsoleShell>
  );
}
