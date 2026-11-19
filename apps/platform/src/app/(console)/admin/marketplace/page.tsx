'use client';

import * as React from 'react';
import { ConsoleShell } from '../../console/components/console-shell';
import { Card, Badge, Button } from '@orbitox-io/ui';
import { Package, Check, Star, Download, ExternalLink } from 'lucide-react';

interface MarketplaceItem {
  id: string;
  packageName: string;
  displayName: string;
  description: string;
  category: string;
  author: string;
  latestVersion: string;
  rating: number;
  installs: number;
  installed: boolean;
}

const initialItems: MarketplaceItem[] = [
  {
    id: 'hms',
    packageName: '@orbitox/hms',
    displayName: 'HMS — Healthcare & Patient Clinical EMR',
    description: 'Patient medical records, MRN generator, triage flow state machines, and ward matrices.',
    category: 'Healthcare',
    author: 'OrbitoX Clinical Labs',
    latestVersion: '2.4.0',
    rating: 4.9,
    installs: 410,
    installed: true,
  },
  {
    id: 'restaurant',
    packageName: '@orbitox/restaurant',
    displayName: 'RestaurantOS — Dining, Floor & KDS',
    description: 'Multi-tenant table floor management, QR diner sessions, kitchen display stations, and billing.',
    category: 'Hospitality',
    author: 'OrbitoX Platform Team',
    latestVersion: '2.2.0',
    rating: 4.9,
    installs: 680,
    installed: true,
  },
];

export default function MarketplacePage() {
  const [items, setItems] = React.useState<MarketplaceItem[]>(initialItems);

  const handleToggle = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, installed: !i.installed } : i)),
    );
  };

  return (
    <ConsoleShell activeId="overview">
      <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[11px] font-mono border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-surface-raised)] px-2 py-0.5 rounded-full">
                Stage 7D · Hold
              </Badge>
              <span className="text-xs text-[var(--color-text-muted)]">Replaced in C2/C3</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)] mt-1">
              Plugin Marketplace
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item) => (
            <Card key={item.id} className="p-6 space-y-4 border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[var(--color-primary)]/15 flex items-center justify-center text-[var(--color-primary)]">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[var(--color-text)]">{item.displayName}</h3>
                    <div className="text-xs text-[var(--color-text-muted)] font-mono">{item.packageName}</div>
                  </div>
                </div>
                {item.installed ? (
                  <Badge variant="outline" className="text-[10px] font-medium border-[var(--color-success)] text-[var(--color-success)] bg-[var(--color-success)]/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="h-3 w-3" /> Installed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] font-medium border-[var(--color-border)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full">
                    Available
                  </Badge>
                )}
              </div>

              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{item.description}</p>

              <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] pt-3 border-t border-[var(--color-border)]">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1"><Star className="h-3 w-3 text-[var(--color-warning)]" /> {item.rating}</span>
                  <span className="flex items-center gap-1"><Download className="h-3 w-3" /> {item.installs}</span>
                  <span>v{item.latestVersion}</span>
                </div>
                <Button
                  variant={item.installed ? 'secondary' : 'primary'}
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => handleToggle(item.id)}
                >
                  {item.installed ? 'Uninstall' : 'Install'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </ConsoleShell>
  );
}
