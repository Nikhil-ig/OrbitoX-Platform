import type { NextRequest } from 'next/server';

export function isAllowedOrigin(originOrReferer: string, request: NextRequest): boolean {
  try {
    const originUrl = new URL(originOrReferer);
    const requestOrigin = request.nextUrl.origin;
    if (originUrl.origin === requestOrigin) return true;

    // Check reverse-proxy forwarded origin headers
    const fwdHost = request.headers.get('x-forwarded-host');
    if (fwdHost) {
      const fwdProto = request.headers.get('x-forwarded-proto') || (request.nextUrl.protocol.replace(':', '') || 'http');
      if (originUrl.origin === `${fwdProto}://${fwdHost}`) return true;
    }

    // In local development, permit loopback hosts across dev ports (4010, 3005, etc.)
    const isDev = process.env.NODE_ENV === 'development' || process.env.ALLOW_UNAUTHENTICATED_DEV_MODE === 'true';
    if (isDev) {
      const isLoopback = (host: string) => ['localhost', '127.0.0.1', '0.0.0.0'].includes((host || '').split(':')[0] || '');
      if (isLoopback(originUrl.hostname)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}
