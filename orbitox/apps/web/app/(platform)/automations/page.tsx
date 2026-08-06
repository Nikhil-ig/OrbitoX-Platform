'use client';

import React from 'react';
import { DynamicWorkflowBuilder } from '@orbitox/ui';

export default function AutomationsPage() {
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', color: 'var(--text-primary)' }}>Automations</h1>
        <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)' }}>
          Visually build workflows that orchestrate plugins and act on events in real-time.
        </p>
      </div>

      <DynamicWorkflowBuilder />
    </div>
  );
}
