'use client';

import * as React from 'react';
import { ConsoleShell } from '../../components/console-shell';
import ProjectCreationWizardPage from '../../../admin/projects/create/page';

export default function ConsoleProjectCreatePage() {
  return (
    <ConsoleShell activeId="projects">
      <ProjectCreationWizardPage />
    </ConsoleShell>
  );
}
