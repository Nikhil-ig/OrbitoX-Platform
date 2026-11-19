'use client';

import * as React from 'react';
import { ConsoleShell } from '../../components/console-shell';
import ProjectDetailPage from '../../../platform/projects/[projectId]/page';

export default function ConsoleProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = React.use(params);
  const mappedParams = React.useMemo(
    () => Promise.resolve({ projectId: resolvedParams.id }),
    [resolvedParams.id]
  );

  return (
    <ConsoleShell activeId="projects">
      <ProjectDetailPage params={mappedParams} />
    </ConsoleShell>
  );
}
