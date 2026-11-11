import { redirect } from 'next/navigation';

/**
 * /platform/projects redirects to the live fleet table at /platform/fleet.
 */
export default function PlatformProjectsRedirect() {
  redirect('/platform/fleet');
}
