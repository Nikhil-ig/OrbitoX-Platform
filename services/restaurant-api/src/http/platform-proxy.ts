import * as http from 'http';

/**
 * Checks whether the incoming host is a local development loopback address.
 */
export function isLocalhostOrLoopback(host: string): boolean {
  const cleanHost = (host || '').split(':')[0].trim().toLowerCase();
  return cleanHost === 'localhost' || cleanHost === '127.0.0.1' || cleanHost === '0.0.0.0';
}

/**
 * Evaluates whether an unauthenticated loopback request should be routed
 * to the OrbitoX Platform control plane (e.g. for customer onboarding F1-F6).
 */
export function isPlatformForwardPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/onboarding' ||
    pathname.startsWith('/onboarding/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/v1/customer/') ||
    pathname.startsWith('/api/v1/billing/')
  );
}

/**
 * Proxies an HTTP request transparently to the Next.js platform instance (default port 3005).
 * If the connection cannot be established, issues a 307 redirect fallback to the onboarding URL.
 */
export function proxyRequestToPlatform(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  targetPath: string,
  platformPort: number = 3005
): void {
  const target = targetPath === '/' ? '/onboarding' : targetPath;

  const options: http.RequestOptions = {
    hostname: '127.0.0.1',
    port: platformPort,
    path: target,
    method: req.method,
    headers: {
      ...req.headers,
      host: `127.0.0.1:${platformPort}`,
      'x-forwarded-host': req.headers.host || 'localhost:4010',
      'x-forwarded-proto': 'http',
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.warn(`[PlatformProxy] Forward to 127.0.0.1:${platformPort} failed (${err.message}), falling back to 307 redirect.`);
    if (!res.headersSent) {
      res.writeHead(307, { Location: `http://localhost:${platformPort}/onboarding` });
      res.end();
    }
  });

  req.pipe(proxyReq, { end: true });
}
