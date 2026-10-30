import { NextRequest, NextResponse } from 'next/server';
import { ApiRequestContext } from '@/app/api/v1/_lib/api-types';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';

type RouteContext = any;
type GuardedRouteHandler = (
    request: NextRequest,
    routeContext: RouteContext,
    authContext: ApiRequestContext
) => Promise<Response> | Response;

type GuestRouteHandler = (request: NextRequest, routeContext: RouteContext, guest: any) => Promise<Response> | Response;

interface LegacyGuardOptions {
    serviceId: string;
    adminOnly?: boolean;
    sensitive?: boolean;
}

function withLegacyGuard(options: LegacyGuardOptions, handler: GuardedRouteHandler) {
    return async (request: NextRequest, routeContext?: RouteContext): Promise<Response> => {
        if (
            options.sensitive &&
            (process.env.NODE_ENV === 'production' || !process.env.NODE_ENV) &&
            process.env.ORBITOX_ENABLE_HOSPITAL_ADMIN_ENDPOINTS !== 'true'
        ) {
            return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint is disabled.' } }, { status: 404 });
        }

        const guarded = withApiGuard(
            {
                serviceId: options.serviceId,
                serviceName: options.serviceId === 'hms' ? 'Hospital API' : 'Restaurant API',
                routeClass: options.adminOnly ? 'platform-admin' : 'customer',
                requiredScopes: options.adminOnly
                    ? ['admin']
                    : [options.serviceId === 'hms' ? `hms:${request.method === 'GET' ? 'read' : 'write'}` : 'restaurant:read'],
            },
            async (guardedRequest, authContext) => handler(guardedRequest, routeContext, authContext)
        );

        return guarded(request);
    };
}

export function withHospitalGuard(handler: GuardedRouteHandler, options: Omit<LegacyGuardOptions, 'serviceId'> = {}) {
    return withLegacyGuard({ serviceId: 'hms', ...options }, handler);
}

export function withRestaurantGuard(handler: GuardedRouteHandler, options: Omit<LegacyGuardOptions, 'serviceId'> = {}) {
    return withLegacyGuard({ serviceId: 'restaurant', ...options }, handler);
}

export function verifyGuestCapabilityToken(token: string): any {
    const [encodedPayload] = token.split('.');
    if (!encodedPayload) throw new Error('Invalid guest capability token.');
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    return payload;
}

export function withGuestToken(handler: GuestRouteHandler) {
    return async (request: NextRequest, routeContext?: RouteContext): Promise<Response> => {
        const token = request.headers.get('x-guest-token')?.trim();
        if (!token) {
            return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'A guest capability token is required.' } }, { status: 401 });
        }
        try {
            return await handler(request, routeContext, verifyGuestCapabilityToken(token));
        } catch {
            return NextResponse.json({ success: false, error: { code: 'INVALID_GUEST_TOKEN', message: 'The guest capability is invalid, expired, or revoked.' } }, { status: 401 });
        }
    };
}

export function withPublicGuestBootstrap(handler: GuestRouteHandler) {
    return async (request: NextRequest, routeContext?: RouteContext): Promise<Response> => {
        if ((process.env.NODE_ENV === 'production' || !process.env.NODE_ENV) && !process.env.ORBITOX_GUEST_SECRET?.trim()) {
            return NextResponse.json({ success: false, error: { code: 'AUTH_NOT_CONFIGURED', message: 'Guest session authentication is not configured.' } }, { status: 503 });
        }
        return handler(request, routeContext, undefined);
    };
}