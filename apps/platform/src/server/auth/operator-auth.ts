import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  getOperatorSession,
  OPERATOR_CSRF_COOKIE,
  OPERATOR_SESSION_COOKIE,
  type OperatorSessionContext,
} from '@/server/accounts/phase6-account-service';
import { operatorRoleAllows, type RequiredOperatorRole, requiresRecentReauthentication } from '@/server/organizations/operator-route-policy';

type OperatorHandler<Context = undefined> = (
  request: NextRequest,
  session: OperatorSessionContext,
  context: Context,
) => Promise<Response>;

export function withOperatorAuth(
  handler: OperatorHandler<undefined>,
  options?: { write?: boolean; requiredRole?: RequiredOperatorRole; reauth?: boolean },
): (request: NextRequest) => Promise<Response>;
export function withOperatorAuth<Context>(
  handler: OperatorHandler<Context>,
  options?: { write?: boolean; requiredRole?: RequiredOperatorRole; reauth?: boolean },
): (request: NextRequest, context: Context) => Promise<Response>;
export function withOperatorAuth<Context = undefined>(
  handler: OperatorHandler<Context>,
  options: { write?: boolean; requiredRole?: RequiredOperatorRole; reauth?: boolean } = {},
) {
  return async (request: NextRequest, context?: Context): Promise<Response> => {
    const session = await getOperatorSession(request.cookies.get(OPERATOR_SESSION_COOKIE)?.value);
    if (!session) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Operator session required.' } }, {
        status: 401,
        headers: noStore,
      });
    }
    if (options.requiredRole && !operatorRoleAllows(session.role, options.requiredRole)) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Your operator role cannot perform this action.' } }, {
        status: 403,
        headers: noStore,
      });
    }
    if (options.write && !validOperatorCsrf(request, session.csrfTokenHash)) {
      return NextResponse.json({ success: false, error: { code: 'CSRF_INVALID', message: 'CSRF validation failed.' } }, {
        status: 403,
        headers: noStore,
      });
    }
    const needsReauth = options.reauth ?? requiresRecentReauthentication(request.nextUrl.pathname, request.method);
    if (needsReauth && (!session.reauthenticatedAt || Date.now() - session.reauthenticatedAt.getTime() > 5 * 60 * 1000)) {
      return NextResponse.json({ success: false, error: { code: 'REAUTH_REQUIRED', message: 'Re-authenticate before this sensitive action.' } }, {
        status: 403,
        headers: noStore,
      });
    }
    return handler(request, session, context as Context);
  };
}

export function validOperatorCsrf(request: NextRequest, expectedHash: string): boolean {
  const csrfCookie = request.cookies.get(OPERATOR_CSRF_COOKIE)?.value;
  const csrfHeader = request.headers.get('x-csrf-token');
  const origin = request.headers.get('origin');
  if (!csrfCookie || !csrfHeader || !origin || csrfCookie !== csrfHeader) return false;
  try {
    if (new URL(origin).origin !== request.nextUrl.origin) return false;
  } catch {
    return false;
  }
  const actual = crypto.createHash('sha256').update(csrfHeader).digest();
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function setOperatorSessionCookies(
  response: NextResponse,
  input: { sessionToken: string; csrfToken: string; expiresAt: Date },
): NextResponse {
  const maxAge = Math.max(0, Math.floor((input.expiresAt.getTime() - Date.now()) / 1000));
  const secure = secureCookie();
  response.cookies.set(OPERATOR_SESSION_COOKIE, input.sessionToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
  response.cookies.set(OPERATOR_CSRF_COOKIE, input.csrfToken, {
    httpOnly: false,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge,
  });
  return response;
}

export function clearOperatorSessionCookies(response: NextResponse): NextResponse {
  response.cookies.set(OPERATOR_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  response.cookies.set(OPERATOR_CSRF_COOKIE, '', {
    httpOnly: false,
    secure: secureCookie(),
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}

const noStore = { 'Cache-Control': 'no-store' };

function secureCookie(): boolean {
  return !['development', 'test'].includes((process.env.NODE_ENV || '').trim());
}
