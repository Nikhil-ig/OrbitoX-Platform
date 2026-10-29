import { NextRequest, NextResponse } from 'next/server';
import { ApiRequestContext } from '@/app/api/v1/_lib/api-types';

export const ORBITOX_BACKEND_URL = process.env.ORBITOX_BACKEND_URL || 'http://localhost:3000';

function trustedHeaders(authContext: ApiRequestContext, headers?: HeadersInit): Headers {
  const trusted = new Headers(headers);
  trusted.set('Authorization', `Bearer ${authContext.credential}`);
  trusted.set('x-tenant-id', authContext.tenantId);
  trusted.set('x-context-id', authContext.tenantId);
  return trusted;
}

export async function authenticatedHospitalFetch(
  upstreamPath: string,
  authContext: ApiRequestContext | undefined,
  init: RequestInit = {}
): Promise<Response> {
  if (!authContext?.tenantId || !authContext.credential) {
    throw new Error('A verified customer principal is required.');
  }
  return fetch(`${ORBITOX_BACKEND_URL}${upstreamPath}`, {
    ...init,
    headers: trustedHeaders(authContext, init.headers),
  });
}
