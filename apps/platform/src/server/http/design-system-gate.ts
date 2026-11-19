import 'server-only';

/**
 * Determines whether the internal Design System preview page (/console/design-system)
 * should be accessible in the current runtime environment.
 *
 * Strictly disabled (returns false -> 404 notFound) in production deployments.
 * Enabled only in development, test, or staging environments.
 */
export function isDesignSystemEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const orbitoxEnv = (env.ORBITOX_ENVIRONMENT || '').toLowerCase().trim();
  if (orbitoxEnv === 'production') {
    return false;
  }
  if (orbitoxEnv === 'staging' || orbitoxEnv === 'development' || orbitoxEnv === 'dev' || orbitoxEnv === 'test') {
    return true;
  }
  return env.NODE_ENV !== 'production';
}

