import { redirect } from 'next/navigation';

/**
 * Legacy admin project detail redirects to /platform/projects/[projectId].
 */
export default async function LegacyAdminProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(`/platform/projects/${projectId}`);
}
