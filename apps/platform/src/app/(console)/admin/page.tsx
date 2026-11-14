import { redirect } from 'next/navigation';

/**
 * Legacy admin root redirects to the modern operator console overview at /console/overview.
 */
export default function LegacyAdminPage() {
  redirect('/console/overview');
}
