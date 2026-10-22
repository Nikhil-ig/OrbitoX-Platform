import { NextResponse } from 'next/server';
import { DEFAULT_THEMES } from '@orbitox-io/celebrations';

export async function GET() {
  return NextResponse.json({
    themes: DEFAULT_THEMES,
  });
}
