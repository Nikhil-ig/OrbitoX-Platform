import { redirect } from 'next/navigation';

/**
 * Legacy admin api-keys page redirects to /platform/settings.
 */
export default function LegacyAdminApiKeysPage() {
  redirect('/platform/settings');
}
