import { NextResponse } from 'next/server';
import { CelebrationsInterconnect, ShagunContribution } from '@orbitox-io/celebrations';

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as ShagunContribution;

    if (!payload.contributorName || !payload.amount) {
      return NextResponse.json(
        { success: false, error: 'Contributor name and amount are required' },
        { status: 400 }
      );
    }

    const interconnect = CelebrationsInterconnect.getInstance();
    const processed = interconnect.processShagunGift(payload);

    return NextResponse.json({
      success: true,
      contribution: processed,
      message: 'Blessing and Shagun gift processed successfully via OrbitoX Commerce.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process Shagun' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const experienceId = searchParams.get('experienceId') || undefined;

  const interconnect = CelebrationsInterconnect.getInstance();
  const contributions = interconnect.getShagunContributions(experienceId);
  const totalAmount = interconnect.getTotalShagunAmount(experienceId);

  return NextResponse.json({
    success: true,
    contributions,
    totalAmount,
  });
}
