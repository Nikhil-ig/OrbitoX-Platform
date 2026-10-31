import React from 'react';
import { isSamplePluginEnabled } from '@/lib/sample-plugins';
import { PluginComingSoon } from '@/components/plugin-coming-soon';

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  if (!isSamplePluginEnabled('crm')) {
    return <PluginComingSoon pluginId="crm" name="CRM & Sales Pipeline" />;
  }
  return <>{children}</>;
}
