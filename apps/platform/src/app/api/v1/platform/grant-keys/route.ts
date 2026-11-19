import { NextRequest, NextResponse } from 'next/server';
import { getPublicGrantKeyInfo, getPublicGrantKeys } from '@orbitox-io/plugin-engine';

export async function GET(_req: NextRequest) {
  try {
    const keysInfo = getPublicGrantKeyInfo();
    const publicKeysMap: Record<string, string> = {};
    for (const item of keysInfo) {
      publicKeysMap[item.kid] = item.publicKeyPem;
    }

    return NextResponse.json({
      success: true,
      keys: keysInfo,
      publicKeys: publicKeysMap,
      issuer: 'orbitox',
      algorithm: 'Ed25519',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
