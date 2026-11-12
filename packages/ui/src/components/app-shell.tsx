import * as React from 'react';
import { Menu, ChevronLeft, ChevronRight, Moon, Sun } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './button';
import { Sheet, SheetContent } from './sheet';
import { toggleTheme } from '../tokens/theme-script';

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
  active?: boolean;
  badge?: React.ReactNode;
  onClick?: () => void;
}

export interface AppShellProps {
  appName?: string;
  logo?: React.ReactNode;
  navItems: NavItem[];
  tenantSwitcher?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  userMenu?: React.ReactNode;
  banner?: React.ReactNode;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}

export function AppShell({
  appName = 'OrbitoX',
  logo,
  navItems,
  tenantSwitcher,
  breadcrumbs,
  userMenu,
  banner,
  children,
  defaultCollapsed = false,
}: AppShellProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  const toggleCollapsed = () => setIsCollapsed((prev) => !prev);

  const renderNavList = (isMobile = false) => (
    <nav className="flex-1 space-y-1 p-3">
      {navItems.map((item) => (
        <a
          key={item.id}
          href={item.href || '#'}
          onClick={(e) => {
            if (item.onClick) {
              e.preventDefault();
              item.onClick();
            }
            if (isMobile) setIsMobileOpen(false);
          }}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors select-none cursor-pointer',
            item.active
              ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] font-semibold shadow-xs'
              : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]',
            isCollapsed && !isMobile && 'justify-center px-2'
          )}
          title={isCollapsed && !isMobile ? item.label : undefined}
        >
          {item.icon && <span className="h-5 w-5 shrink-0 flex items-center justify-center">{item.icon}</span>}
          {(!isCollapsed || isMobile) && (
            <span className="flex-1 truncate">{item.label}</span>
          )}
          {(!isCollapsed || isMobile) && item.badge && (
            <span className="shrink-0">{item.badge}</span>
          )}
        </a>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col">
      {/* Optional Top Alert / Staging Banner */}
      {banner}

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Collapsible Sidebar */}
        <aside
          className={cn(
            'hidden md:flex flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-all duration-200 select-none',
            isCollapsed ? 'w-16' : 'w-64'
          )}
        >
          {/* Sidebar Header */}
          <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-4">
            {!isCollapsed && (
              <div className="flex items-center gap-2.5 truncate">
                {logo || <div className="h-6 w-6 rounded bg-[var(--color-primary)] shrink-0" />}
                <span className="font-bold text-sm tracking-tight text-[var(--color-text)] truncate">{appName}</span>
              </div>
            )}
            {isCollapsed && (
              <div className="mx-auto">
                {logo || <div className="h-6 w-6 rounded bg-[var(--color-primary)]" />}
              </div>
            )}
            <button
              onClick={toggleCollapsed}
              className={cn(
                'p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-colors cursor-pointer',
                isCollapsed && 'hidden'
              )}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Org / Tenant Switcher */}
          {!isCollapsed && tenantSwitcher && (
            <div className="border-b border-[var(--color-border)] p-3">
              {tenantSwitcher}
            </div>
          )}

          {/* Navigation Links */}
          {renderNavList(false)}

          {/* Collapse Footer Toggle when collapsed */}
          {isCollapsed && (
            <div className="p-2 border-t border-[var(--color-border)] flex justify-center">
              <button
                onClick={toggleCollapsed}
                className="p-2 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-colors cursor-pointer"
                aria-label="Expand sidebar"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </aside>

        {/* Mobile Sidebar Sheet */}
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetContent side="left" className="w-72 p-0 flex flex-col bg-[var(--color-surface)]">
            <div className="flex h-14 items-center border-b border-[var(--color-border)] px-4 gap-3">
              {logo || <div className="h-6 w-6 rounded bg-[var(--color-primary)] shrink-0" />}
              <span className="font-bold text-sm tracking-tight">{appName}</span>
            </div>
            {tenantSwitcher && <div className="border-b border-[var(--color-border)] p-3">{tenantSwitcher}</div>}
            {renderNavList(true)}
          </SheetContent>
        </Sheet>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Top Bar */}
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-xs px-4 sm:px-6">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Hamburger Toggle */}
              <button
                onClick={() => setIsMobileOpen(true)}
                className="md:hidden p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
                aria-label="Open mobile navigation"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Breadcrumbs */}
              {breadcrumbs && <div className="text-sm">{breadcrumbs}</div>}
            </div>

            {/* Top Bar Actions & User Menu */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleTheme()}
                className="h-8 w-8 p-0"
                aria-label="Toggle theme"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>

              {userMenu}
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

