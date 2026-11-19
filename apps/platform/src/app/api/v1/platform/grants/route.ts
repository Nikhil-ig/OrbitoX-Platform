import { NextRequest } from 'next/server';
import { GET as getGrant } from './[...slug]/route';

export async function GET(req: NextRequest) {
  return getGrant(req, { params: Promise.resolve({ slug: [] }) });
}
