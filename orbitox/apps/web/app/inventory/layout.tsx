import React from 'react';
import { isSamplePluginEnabled } from '@/lib/sample-plugins';
import { PluginComingSoon } from '@/components/plugin-coming-soon';

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  if (!isSamplePluginEnabled('inventory')) {
    return <PluginComingSoon pluginId="inventory" name="Inventory & Logistics" />;
  }
  return <>{children}</>;
}
