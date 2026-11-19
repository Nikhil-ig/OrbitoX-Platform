import { notFound } from 'next/navigation';
import { isDesignSystemEnabled } from '@/server/http/design-system-gate';
import DesignSystemClient from './design-client';

export const dynamic = 'force-dynamic';

export default function DesignSystemConsolePage() {
  if (!isDesignSystemEnabled()) {
    notFound();
  }

  return <DesignSystemClient />;
}
