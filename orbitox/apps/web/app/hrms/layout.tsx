import React from 'react';
import { isSamplePluginEnabled } from '@/lib/sample-plugins';
import { PluginComingSoon } from '@/components/plugin-coming-soon';

export default function HrmsLayout({ children }: { children: React.ReactNode }) {
  if (!isSamplePluginEnabled('hrms')) {
    return <PluginComingSoon pluginId="hrms" name="HRMS & Workforce Suite" />;
  }
  return <>{children}</>;
}
