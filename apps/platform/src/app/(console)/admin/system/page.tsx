import { redirect } from 'next/navigation';

/**
 * Legacy admin system page redirects to /platform/settings.
 */
export default function LegacyAdminSystemPage() {
  redirect('/platform/settings');
}
