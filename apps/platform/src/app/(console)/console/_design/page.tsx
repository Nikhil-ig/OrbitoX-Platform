import { notFound } from 'next/navigation';
import DesignSystemClient from './design-client';

export const dynamic = 'force-dynamic';

export default function DesignSystemConsolePage() {
  const isStagingHost = (process.env.ORBITOX_PUBLIC_BASE_URL || '').toLowerCase().includes('staging');
  const isDevOrStaging = process.env.NODE_ENV !== 'production' || isStagingHost;

  if (!isDevOrStaging) {
    notFound();
  }

  return <DesignSystemClient />;
}
