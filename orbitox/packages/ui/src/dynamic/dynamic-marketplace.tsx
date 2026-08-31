'use client';

import React from 'react';
import { Card } from '../components/card';
import { Button } from '../components/button';
import { Badge } from '../components/badge';

export interface MarketplaceItemUI {
  id: string;
  packageName: string;
  displayName: string;
  description: string;
  category: string;
  author: string;
  latestVersion: string;
  rating: number;
  installs: number;
  installed?: boolean;
}

export interface DynamicMarketplaceProps {
  items: MarketplaceItemUI[];
  onInstall?: (item: MarketplaceItemUI) => void;
}

export const DynamicMarketplace: React.FC<DynamicMarketplaceProps> = ({ items, onInstall }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '24px',
      }}
    >
      {items.map((item) => (
        <Card key={item.id} title={item.displayName} subtitle={item.packageName}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              {item.description}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
              <Badge variant="info">{item.category.toUpperCase()}</Badge>
              <span style={{ color: 'var(--text-muted)' }}>⭐ {item.rating} • {item.installs} installs</span>
            </div>

            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>v{item.latestVersion} by {item.author}</span>
              <Button
                variant={item.installed ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => onInstall && onInstall(item)}
              >
                {item.installed ? 'Active' : 'Install'}
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
