import { NextResponse } from 'next/server';
import { assertPlatformDatabaseReady } from './platform-database-readiness';

export function createHealthHandler(
    checkReadiness: () => Promise<void> = assertPlatformDatabaseReady,
) {
    return async function GET() {
        try {
            await checkReadiness();
            return NextResponse.json(
                { ok: true, service: 'orbitox-control-plane' },
                { headers: { 'Cache-Control': 'no-store' } },
            );
        } catch {
            return NextResponse.json(
                { ok: false, service: 'orbitox-control-plane' },
                { status: 503, headers: { 'Cache-Control': 'no-store' } },
            );
        }
    };
}
