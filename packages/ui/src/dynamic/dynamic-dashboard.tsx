'use client';

import React from 'react';
import { Card } from '../components/card';
import { Badge } from '../components/badge';

export interface WidgetData {
  id: string;
  title: string;
  size?: '1x1' | '2x1' | '2x2' | '4x2';
  value?: string | number;
  change?: string;
}

export interface DynamicDashboardProps {
  widgets: WidgetData[];
}

export const DynamicDashboard: React.FC<DynamicDashboardProps> = ({ widgets }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
      }}
    >
      {widgets.map((widget) => (
        <Card key={widget.id} title={widget.title}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '12px' }}>
            <span style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary, #ffffff)' }}>
              {widget.value ?? '1,280'}
            </span>
            {widget.change && <Badge variant="success">{widget.change}</Badge>}
          </div>
        </Card>
      ))}
    </div>
  );
};
