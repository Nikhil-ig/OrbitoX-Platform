import React from 'react';
import { isSamplePluginEnabled } from '@/lib/sample-plugins';
import { PluginComingSoon } from '@/components/plugin-coming-soon';

export default function StoreRootLayout({ children }: { children: React.ReactNode }) {
  if (!isSamplePluginEnabled('commerce')) {
    return <PluginComingSoon pluginId="commerce" name="Commerce & Storefront" />;
  }
  return <>{children}</>;
}
