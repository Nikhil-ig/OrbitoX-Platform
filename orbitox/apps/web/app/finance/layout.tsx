import React from 'react';
import { isSamplePluginEnabled } from '@/lib/sample-plugins';
import { PluginComingSoon } from '@/components/plugin-coming-soon';

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  if (!isSamplePluginEnabled('finance')) {
    return <PluginComingSoon pluginId="finance" name="Finance & Ledger Engine" />;
  }
  return <>{children}</>;
}
