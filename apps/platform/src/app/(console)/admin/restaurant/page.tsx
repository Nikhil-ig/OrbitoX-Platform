'use client';

import * as React from 'react';
import Link from 'next/link';
import { ConsoleShell } from '../../console/components/console-shell';
import { Card, Badge, Button } from '@orbitox-io/ui';
import { ChefHat, ExternalLink, ArrowRight, ShieldCheck } from 'lucide-react';

export default function RestaurantAdminRedirectPage() {
  return (
    <ConsoleShell activeId="tenants">
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-semibold border-[var(--color-warning)] text-[var(--color-warning)] bg-[var(--color-warning)]/10 px-2.5 py-0.5 rounded-full">
            DECOUPLED ARCHITECTURE BOUNDARY
          </Badge>
          <Badge variant="outline" className="text-[11px] font-mono border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-surface-raised)] px-2 py-0.5 rounded-full">
            Stage 7D · Hold
          </Badge>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            RestaurantOS is an Independent Runtime Product
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-2 leading-relaxed">
            Per the OrbitoX zero-trust architecture, restaurant operational workflows (Floor Canvas, Touch KDS, and Diner Mobile PWA) are maintained in the decoupled external project executing independently on port <code className="px-1.5 py-0.5 rounded bg-[var(--color-surface-raised)] font-mono text-xs">4010</code>.
          </p>
        </div>

        <Card className="p-6 space-y-4 border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-[var(--color-warning)]/15 flex items-center justify-center text-[var(--color-warning)] shrink-0">
              <ChefHat className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-[var(--color-text)]">
                Authoritative Control Plane Governance
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                OrbitoX Platform operates purely as the <strong>Authoritative Control Plane</strong>. You can govern desired-state configuration, revisions, plugins, APIs, plans, and commands from the central Console Tenant Fleet Registry.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[var(--color-border)]">
            <Button asChild variant="primary" size="sm" className="rounded-full">
              <Link href="/console/tenants" className="flex items-center gap-1.5">
                <span>Open Tenant Fleet Registry</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm" className="rounded-full">
              <a
                href="http://localhost:4010"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5"
              >
                <span>Launch RestaurantOS (Port 4010)</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </Card>
      </div>
    </ConsoleShell>
  );
}
