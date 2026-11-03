import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  CUSTOMER_CSRF_COOKIE,
  CUSTOMER_SESSION_COOKIE,
  getCustomerSession,
  type CustomerSessionContext,
} from './phase6-account-service';

export type CustomerHandler<Context = undefined> = (
  request: NextRequest,
  session: CustomerSessionContext,
  context: Context,
) => Promise<Response>;

export function withCustomerAuth(
  handler: CustomerHandler<undefined>,
  options?: { write?: boolean; allowMfaSetup?: boolean; reauth?: boolean },
): (request: NextRequest) => Promise<Response>;
export function withCustomerAuth<Context>(
  handler: CustomerHandler<Context>,
  options?: { write?: boolean; allowMfaSetup?: boolean; reauth?: boolean },
): (request: NextRequest, context: Context) => Promise<Response>;
export function withCustomerAuth<Context = undefined>(
  handler: CustomerHandler<Context>,
  options: { write?: boolean; allowMfaSetup?: boolean; reauth?: boolean } = {},
) {
  return async (request: NextRequest, context?: Context): Promise<Response> => {
    const rawToken = request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value;
    const session = await getCustomerSession(rawToken);
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401, headers: noStore });
    }
    if (session.mfaSetupRequired && !options.allowMfaSetup) {
      return NextResponse.json({ ok: false, error: 'TOTP enrollment is required for organization owners and admins.' }, { status: 403, headers: noStore });
    }
    if (options.write && !validCustomerCsrf(request, session.csrfTokenHash)) {
      return NextResponse.json({ ok: false, error: 'CSRF validation failed.' }, { status: 403, headers: noStore });
    }
    if (options.reauth && (!session.reauthenticatedAt || Date.now() - session.reauthenticatedAt.getTime() > 5 * 60 * 1000)) {
      return NextResponse.json({ ok: false, error: 'Re-authenticate before this sensitive action.' }, { status: 403, headers: noStore });
    }
    return handler(request, session, context as Context);
  };
}

export function setCustomerSessionCookies(
  response: NextResponse,
  input: { sessionToken: string; csrfToken: string; expiresAt: Date },
): NextResponse {
  const maxAge = Math.max(0, Math.floor((input.expiresAt.getTime() - Date.now()) / 1000));
  const secure = secureCookie();
  response.cookies.set(CUSTOMER_SESSION_COOKIE, input.sessionToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge,
  });
  response.cookies.set(CUSTOMER_CSRF_COOKIE, input.csrfToken, {
    httpOnly: false,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge,
  });
  return response;
}

export function clearCustomerSessionCookies(response: NextResponse): NextResponse {
  response.cookies.set(CUSTOMER_SESSION_COOKIE, '', { httpOnly: true, secure: secureCookie(), sameSite: 'strict', path: '/', maxAge: 0 });
  response.cookies.set(CUSTOMER_CSRF_COOKIE, '', { httpOnly: false, secure: secureCookie(), sameSite: 'strict', path: '/', maxAge: 0 });
  return response;
}

export function validCustomerCsrf(request: NextRequest, expectedHash: string): boolean {
  const csrfCookie = request.cookies.get(CUSTOMER_CSRF_COOKIE)?.value;
  const csrfHeader = request.headers.get('x-csrf-token');
  const origin = request.headers.get('origin');
  if (!csrfCookie || !csrfHeader || !origin || csrfCookie !== csrfHeader) return false;
  try {
    if (new URL(origin).origin !== request.nextUrl.origin) return false;
  } catch {
    return false;
  }
  const actualHash = cryptoHash(csrfHeader);
  const left = Buffer.from(actualHash, 'hex');
  const right = Buffer.from(expectedHash, 'hex');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function cryptoHash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

const noStore = { 'Cache-Control': 'no-store' };

function secureCookie(): boolean {
  return !['development', 'test'].includes((process.env.NODE_ENV || '').trim());
}
