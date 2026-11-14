'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Construction, Info, Layers, Clock } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
} from '@orbitox-io/ui';

export interface ConsolePlaceholderProps {
  title: string;
  stageBadge: string;
  stageName: string;
  description: string;
  detailedNotes: string;
  searchParams?: Record<string, string | string[] | undefined>;
  actionType?: 'change-plan' | 'retry-provisioning' | 'none';
  action?: React.ReactNode;
}

export function ConsolePlaceholder({
  title,
  stageBadge,
  stageName,
  description,
  detailedNotes,
  searchParams = {},
  actionType = 'none',
  action,
}: ConsolePlaceholderProps) {
  const paramEntries = Object.entries(searchParams).filter(
    ([_, val]) => val !== undefined && val !== '',
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
        <Link href="/console/overview" className="hover:text-[var(--color-text)] transition-colors">
          Overview
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-[var(--color-text)] font-medium truncate">{title}</span>
      </nav>

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
              {title}
            </h1>
            <Badge
              variant="outline"
              className="rounded-full text-xs font-semibold uppercase tracking-wider border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text)]"
            >
              {stageBadge}
            </Badge>
          </div>
          <p className="text-sm text-[var(--color-text-muted)] mt-1.5">
            {description}
          </p>
        </div>

        {/* Back to Overview Primary Action */}
        <div className="flex items-center gap-3">
          <Link
            href="/console/overview"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-[var(--shadow-accent-glow)] hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Overview</span>
          </Link>
        </div>
      </div>

      {/* Staging Specification Card */}
      <Card className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <CardHeader className="p-0 pb-4">
          <div className="flex items-center gap-2 text-[var(--color-warning)] mb-1">
            <Construction className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {stageName}
            </span>
          </div>
          <CardTitle className="text-base text-[var(--color-text)]">
            Module Architecture & Scope
          </CardTitle>
          <CardDescription className="text-xs text-[var(--color-text-muted)]">
            Planned for subsequent engineering release per the OrbitoX UI master roadmap.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          <p className="text-xs text-[var(--color-text)] leading-relaxed">
            {detailedNotes}
          </p>

          {/* Context Parameters Inspector */}
          {paramEntries.length > 0 && (
            <div className="pt-3 border-t border-[var(--color-border)]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] block mb-2">
                Passed Context Parameters
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {paramEntries.map(([key, val]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-2.5 rounded-[var(--radius-row)] bg-[var(--color-surface-raised)] border border-[var(--color-border)]"
                  >
                    <span className="text-[var(--color-text-muted)] font-mono text-[11px]">{key}</span>
                    <span className="font-mono font-medium text-[var(--color-text)] text-[11px] truncate max-w-[200px]">
                      {Array.isArray(val) ? val.join(', ') : val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disabled Action Slot (if applicable per Section 4) */}
          {(action || actionType === 'change-plan' || actionType === 'retry-provisioning') && (
            <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-muted)]">
                Required action endpoint:
              </span>
              {actionType === 'change-plan' && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="rounded-full text-xs cursor-not-allowed"
                  title="needs C1 API"
                >
                  Change Plan (needs C1 API)
                </Button>
              )}
              {actionType === 'retry-provisioning' && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="rounded-full text-xs cursor-not-allowed"
                  title="placeholder until C4"
                >
                  Retry Provisioning Job (placeholder until C4)
                </Button>
              )}
              {action}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

