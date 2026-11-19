import { redirect } from 'next/navigation';

/**
 * Legacy admin projects list redirects to /platform/fleet.
 */
export default function LegacyAdminProjectsPage() {
  redirect('/platform/fleet');
}
