import { NextRequest, NextResponse } from 'next/server';
import { PersistentControlStore } from '@orbitox/external-project-engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/system/settings
 * Reports configured secrets (as boolean flags ONLY, never values),
 * persistent data directory, and control plane platform info.
 */
export async function GET(req: NextRequest) {
  try {
    const store = PersistentControlStore.getInstance();

    const secrets = [
      {
        key: 'ORBITOX_ADMIN_TOKEN',
        label: 'Admin Access Token',
        description: 'Protects the control plane dashboard and administrative management APIs',
        configured: Boolean(process.env.ORBITOX_ADMIN_TOKEN?.trim()),
        scope: 'Control Plane Admin',
        required: true,
      },
      {
        key: 'ORBITOX_RUNTIME_TOKEN',
        label: 'Client Runtime Token',
        description: 'Shared secret allowing external client applications to register and heartbeat',
        configured: Boolean(process.env.ORBITOX_RUNTIME_TOKEN?.trim()),
        scope: 'Client SDK Runtimes',
        required: true,
      },
      {
        key: 'ORBITOX_CONTROL_SECRET',
        label: 'Control Signing Secret',
        description: 'Signs configurations and administrative commands issued to client runtimes',
        configured: Boolean(process.env.ORBITOX_CONTROL_SECRET?.trim()),
        scope: 'Cryptographic Signing',
        required: true,
      },
      {
        key: 'ORBITOX_GUEST_SECRET',
        label: 'Guest Access Secret',
        description: 'Signs and verifies public guest session and QR interaction tokens',
        configured: Boolean(process.env.ORBITOX_GUEST_SECRET?.trim()),
        scope: 'Guest & QR Access',
        required: true,
      },
      {
        key: 'JWT_PRIVATE_KEY',
        label: 'JWT Private Key (RS256)',
        description: 'Private RSA key for signing production user session JWTs',
        configured: Boolean(process.env.JWT_PRIVATE_KEY?.trim()),
        scope: 'Identity & Auth',
        required: false,
      },
      {
        key: 'JWT_PUBLIC_KEY',
        label: 'JWT Public Key (RS256)',
        description: 'Public RSA key for validating user session tokens',
        configured: Boolean(process.env.JWT_PUBLIC_KEY?.trim()),
        scope: 'Identity & Auth',
        required: false,
      },
      {
        key: 'DATABASE_URL',
        label: 'PostgreSQL Database URL',
        description: 'Optional Postgres connection string for relational enterprise storage',
        configured: Boolean(process.env.DATABASE_URL?.trim()),
        scope: 'Persistence (Optional)',
        required: false,
      },
      {
        key: 'REDIS_URL',
        label: 'Redis Cache URL',
        description: 'Optional Redis connection for distributed pub/sub and high-throughput cache',
        configured: Boolean(process.env.REDIS_URL?.trim() || (process.env.REDIS_HOST && process.env.REDIS_PORT)),
        scope: 'Caching & Queues (Optional)',
        required: false,
      },
    ];

    const dataDir = store.getDataDir();

    return NextResponse.json(
      {
        success: true,
        data: {
          secrets,
          platform: {
            dataDir,
            version: '1.0.0',
            nodeEnv: process.env.NODE_ENV || 'development',
            nodeVersion: process.version,
            uptimeSeconds: Math.floor(process.uptime()),
            docsUrl: 'https://github.com/Nikhil-ig/OrbitoX-Platform',
          },
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: { code: 'INTERNAL', message } }, { status: 500 });
  }
}
