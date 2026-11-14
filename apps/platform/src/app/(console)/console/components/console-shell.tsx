'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Boxes,
  Terminal,
  Key,
  CreditCard,
  ShieldAlert,
  FileText,
  Palette,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { AppShell, type NavItem } from '@orbitox-io/ui';
import { Button } from '@orbitox-io/ui';

export interface ConsoleShellProps {
  children: React.ReactNode;
  activeId?:
    | 'overview'
    | 'orgs'
    | 'tenants'
    | 'provisioning'
    | 'security'
    | 'billing'
    | 'data-rights'
    | 'audit'
    | 'appearance';
  operatorEmail?: string;
  operatorRole?: string;
}

export function ConsoleShell({
  children,
  activeId = 'overview',
  operatorEmail = 'operator@orbitox.io',
  operatorRole = 'PLATFORM_OWNER',
}: ConsoleShellProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await fetch('/api/v1/platform/auth/logout', { method: 'POST' });
      router.push('/platform/login');
      router.refresh();
    } catch {
      router.push('/platform/login');
    }
  };

  const navItems: NavItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      href: '/console/overview',
      icon: <LayoutDashboard className="h-4 w-4" />,
      active: activeId === 'overview',
    },
    {
      id: 'orgs',
      label: 'Organizations',
      href: '/console/organizations',
      icon: <Building2 className="h-4 w-4" />,
      active: activeId === 'orgs',
    },
    {
      id: 'tenants',
      label: 'Tenants',
      href: '/console/tenants',
      icon: <Boxes className="h-4 w-4" />,
      active: activeId === 'tenants',
    },
    {
      id: 'provisioning',
      label: 'Provisioning',
      href: '/console/provisioning',
      icon: <Terminal className="h-4 w-4" />,
      badge: <span className="h-2 w-2 rounded-full bg-[var(--color-warning)]" />,
      active: activeId === 'provisioning',
    },
    {
      id: 'security',
      label: 'Security & Keys',
      href: '/console/security',
      icon: <Key className="h-4 w-4" />,
      active: activeId === 'security',
    },
    {
      id: 'billing',
      label: 'Billing',
      href: '/console/billing',
      icon: <CreditCard className="h-4 w-4" />,
      active: activeId === 'billing',
    },
    {
      id: 'data-rights',
      label: 'Data Rights',
      href: '/console/data-rights',
      icon: <ShieldAlert className="h-4 w-4" />,
      active: activeId === 'data-rights',
    },
    {
      id: 'audit',
      label: 'Audit Log',
      href: '/console/audit',
      icon: <FileText className="h-4 w-4" />,
      active: activeId === 'audit',
    },
    {
      id: 'appearance',
      label: 'Appearance',
      href: '/console/settings/appearance',
      icon: <Palette className="h-4 w-4" />,
      active: activeId === 'appearance',
    },
  ];

  const pluginNavItems: NavItem[] = [
    {
      id: 'restaurant-os',
      label: 'RestaurantOS',
      href: '/admin/restaurant',
    },
    {
      id: 'hms',
      label: 'Hospitality HMS',
      href: '/hms',
    },
  ];

  const bottomCard = (
    <div className="rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[var(--color-warning)]">
          {process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'STAGING'}
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)]">v1.4.0</span>
      </div>
      <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Cluster: ap-south-1 (Mumbai)</p>
    </div>
  );

  const userMenu = (
    <div className="flex items-center justify-between p-2 rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="min-w-0 pr-2">
        <div className="text-xs font-semibold text-[var(--color-text)] truncate">{operatorEmail}</div>
        <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">{operatorRole}</div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        disabled={loggingOut}
        className="h-8 w-8 p-0 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        title="Sign out of operator session"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <AppShell
        appName="OrbitoX Operator"
        logo={<Sparkles className="h-5 w-5 text-[var(--color-primary)]" />}
        navItems={navItems}
        pluginNavItems={pluginNavItems}
        pluginSectionTitle="Installed Products"
        bottomCard={bottomCard}
        userMenu={userMenu}
      >
        {children}
      </AppShell>
    </div>
  );
}

