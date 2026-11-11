import { redirect } from 'next/navigation';

/**
 * Legacy admin root redirects to the unified control plane at /platform.
 */
export default function LegacyAdminPage() {
  redirect('/platform');
}
