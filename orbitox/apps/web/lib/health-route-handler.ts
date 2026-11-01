import { NextResponse } from 'next/server';
import { assertPlatformDatabaseReady } from './platform-database-readiness';
import { hasConfiguredGrantKeys, initializeGrantKeys } from '@orbitox-io/plugin-engine';

export function createHealthHandler(
    checkReadiness: () => Promise<void> = assertPlatformDatabaseReady,
) {
    return async function GET() {
        try {
            await checkReadiness();

            if (process.env.NODE_ENV === 'production') {
                try {
                    initializeGrantKeys();
                } catch {
                    return NextResponse.json(
                        { ok: false, service: 'orbitox-control-plane', error: 'GRANT_KEYS_UNCONFIGURED' },
                        { status: 503, headers: { 'Cache-Control': 'no-store' } },
                    );
                }
                if (!hasConfiguredGrantKeys()) {
                    return NextResponse.json(
                        { ok: false, service: 'orbitox-control-plane', error: 'GRANT_KEYS_UNCONFIGURED' },
                        { status: 503, headers: { 'Cache-Control': 'no-store' } },
                    );
                }
            }

            return NextResponse.json(
                { ok: true, service: 'orbitox-control-plane' },
                { headers: { 'Cache-Control': 'no-store' } },
            );
        } catch (err: any) {
            const isUnsafeRole = err?.code === 'DATABASE_ROLE_UNSAFE' || err?.message?.includes('DATABASE_ROLE_UNSAFE');
            return NextResponse.json(
                {
                    ok: false,
                    service: 'orbitox-control-plane',
                    ...(isUnsafeRole ? { code: 'DATABASE_ROLE_UNSAFE', error: 'DATABASE_ROLE_UNSAFE' } : {}),
                },
                { status: 503, headers: { 'Cache-Control': 'no-store' } },
            );
        }
    };
}
