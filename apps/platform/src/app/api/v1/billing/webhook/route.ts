import { NextRequest } from 'next/server';
import { POST as handleRazorpay } from './razorpay/route';

export async function POST(req: NextRequest) {
  return handleRazorpay(req);
}
