import { NextResponse } from 'next/server';
import { DEFAULT_OCCASIONS, DEFAULT_OCCASION_CATEGORIES } from '@orbitox-io/celebrations';

export async function GET() {
  return NextResponse.json({
    occasions: DEFAULT_OCCASIONS,
    categories: DEFAULT_OCCASION_CATEGORIES,
  });
}
