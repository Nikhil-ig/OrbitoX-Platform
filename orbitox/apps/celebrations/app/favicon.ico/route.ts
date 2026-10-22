import { NextResponse } from 'next/server';

export async function GET() {
  // Minimal valid 16x16 32-bit ICO header + pixel
  const icoBuffer = Buffer.from(
    '0000010001001010000001002000680400001600000028000000100000002000000001002000000000000004000000000000000000000000000000000000' +
    '00'.repeat(1024) +
    '00'.repeat(64),
    'hex'
  );
  return new NextResponse(icoBuffer, {
    headers: {
      'Content-Type': 'image/x-icon',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
