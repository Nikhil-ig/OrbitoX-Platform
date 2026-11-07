import { NextRequest } from 'next/server';
import { handleRestaurantPublicRedirect } from '@/app/api/restaurant/_lib/restaurant-routing';

/**
 * 🛰️ OrbitoX RestaurantOS — Legacy v1 Menu Redirect (Phase 2b-5)
 * Answers 308 Permanent Redirect to RestaurantOS public origin.
 * In production, fails closed with 503 if RESTAURANTOS_PUBLIC_URL is unconfigured.
 */
export async function GET(request: NextRequest) {
  return handleRestaurantPublicRedirect(request, '/api/restaurant/menu');
}
