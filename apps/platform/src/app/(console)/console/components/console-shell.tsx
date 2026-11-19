'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Boxes,
  FolderKanban,
  Terminal,
  Package,
  CreditCard,
  CheckSquare,
  Key,
  FileText,
  ShieldAlert,
  Palette,
  LogOut,
  Sparkles,
  Layers,
  Lock,
} from 'lucide-react';
import { ResponsiveShell, type NavItem, Button } from '@orbitox-io/ui';

export interface ConsoleShellProps {
  children: React.ReactNode;
  activeId?: string;
  operatorEmail?: string;
  operatorRole?: string;
  breadcrumbs?: React.ReactNode;
}

export function ConsoleShell({
  children,
  activeId = 'overview',
  operatorEmail = 'operator@orbitox.io',
  operatorRole = 'PLATFORM_OWNER',
  breadcrumbs,
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

  const isProduction = process.env.NODE_ENV === 'production';
  const envLabel = isProduction ? 'PRODUCTION' : 'DEVELOPMENT';

  // 12 Authoritative Primary Navigation Items
  const navItems: NavItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      href: '/console/overview',
      icon: <LayoutDashboard className="h-4 w-4" />,
      active: activeId === 'overview',
    },
    {
      id: 'organizations',
      label: 'Organizations',
      href: '/console/organizations',
      icon: <Building2 className="h-4 w-4" />,
      active: activeId === 'orgs' || activeId === 'organizations',
    },
    {
      id: 'tenants',
      label: 'Tenants',
      href: '/console/tenants',
      icon: <Boxes className="h-4 w-4" />,
      active: activeId === 'tenants',
    },
    {
      id: 'projects',
      label: 'Projects',
      href: '/console/projects',
      icon: <FolderKanban className="h-4 w-4" />,
      active: activeId === 'projects',
    },
    {
      id: 'provisioning',
      label: 'Provisioning',
      href: '/console/provisioning',
      icon: <Terminal className="h-4 w-4" />,
      active: activeId === 'provisioning',
    },
    {
      id: 'packages',
      label: 'Packages & Plugins',
      href: '/console/packages',
      icon: <Package className="h-4 w-4" />,
      active: activeId === 'packages',
    },
    {
      id: 'billing',
      label: 'Billing',
      href: '/console/billing',
      icon: <CreditCard className="h-4 w-4" />,
      active: activeId === 'billing',
    },
    {
      id: 'approvals',
      label: 'Approvals',
      href: '/console/approvals',
      icon: <CheckSquare className="h-4 w-4" />,
      active: activeId === 'approvals',
    },
    {
      id: 'security',
      label: 'Security & Keys',
      href: '/console/security',
      icon: <Key className="h-4 w-4" />,
      active: activeId === 'security',
    },
    {
      id: 'audit',
      label: 'Audit Log',
      href: '/console/audit',
      icon: <FileText className="h-4 w-4" />,
      active: activeId === 'audit',
    },
    {
      id: 'data-rights',
      label: 'Data Rights',
      href: '/console/data-rights',
      icon: <ShieldAlert className="h-4 w-4" />,
      active: activeId === 'data-rights',
    },
    {
      id: 'appearance',
      label: 'Appearance',
      href: '/console/settings/appearance',
      icon: <Palette className="h-4 w-4" />,
      active: activeId === 'appearance' || activeId === 'settings',
    },
    {
      id: 'design-system',
      label: 'Design System',
      href: '/console/design-system',
      icon: <Sparkles className="h-4 w-4" />,
      badge: (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]">
          Internal
        </span>
      ),
      active: activeId === 'design-system',
    },
  ];

  // Plug-in / Installed Products
  const bottomNavItems: NavItem[] = [
    {
      id: 'restaurant-os',
      label: 'RestaurantOS',
      href: '/admin/restaurant',
      icon: <Layers className="h-4 w-4" />,
      badge: (
        <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-warning)]/15 text-[var(--color-warning)]">
          Hold
        </span>
      ),
    },
    {
      id: 'hms',
      label: 'Hospitality HMS',
      href: '/hms',
      icon: <Building2 className="h-4 w-4" />,
      badge: (
        <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
          Live
        </span>
      ),
    },
  ];

  // Active Operator Profile (for SidebarCard bottom slot)
  const userProfile = (
    <div className="flex flex-col gap-2 p-3 rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-center justify-between">
        <span
          className={`text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded-full ${
            isProduction
              ? 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]'
              : 'bg-[var(--color-info)]/15 text-[var(--color-info)]'
          }`}
        >
          {envLabel}
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)] font-mono">v1.4.0</span>
      </div>

      <div className="flex items-center justify-between gap-2 mt-1">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-[var(--color-text)] truncate" title={operatorEmail}>
            {operatorEmail}
          </div>
          <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-mono">
            {operatorRole}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={loggingOut}
          className="h-8 w-8 p-0 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-danger)] shrink-0"
          title="Sign out of operator session"
          aria-label="Sign out of operator session"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // TopBar Action Slot (Environment pill, AI Assistant link, Lock/Signout)
  const topBarActions = (
    <div className="flex items-center gap-2">
      <span
        className={`hidden sm:inline-flex text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-full ${
          isProduction
            ? 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]'
            : 'bg-[var(--color-info)]/15 text-[var(--color-info)]'
        }`}
      >
        {envLabel}
      </span>

      <Link
        href="/console/ai"
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-colors min-h-[32px]"
      >
        <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary)]" />
        <span className="hidden md:inline">Ask AI</span>
      </Link>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        disabled={loggingOut}
        className="h-8 w-8 p-0 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
        title="Sign out"
        aria-label="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <ResponsiveShell
      appName="OrbitoX Operations"
      brandIcon={<Sparkles className="h-5 w-5 text-[var(--color-primary)]" />}
      navItems={navItems}
      bottomNavItems={bottomNavItems}
      userProfile={userProfile}
      topBarActions={topBarActions}
      breadcrumbs={breadcrumbs}
    >
      {children}
    </ResponsiveShell>
  );
}
