import { NextRequest } from 'next/server';
import { restaurantRuntime } from '../../_lib/restaurant-runtime';
import { createLegacyProxyResponse } from '../../_lib/legacy-proxy';

/**
 * ⚠️ LEGACY COMPATIBILITY PROXY: Session Join / Seating
 * Target runtime: http://localhost:4010/api/restaurant/sessions/join
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { locator, displayName, nonce } = body;

    if (!locator || !displayName) {
      return createLegacyProxyResponse(
        { success: false, error: 'Locator and displayName are required' },
        { status: 400 }
      );
    }

    // Try joining existing active session first
    try {
      const joinResult = restaurantRuntime.qrService.requestJoinSession({
        locator,
        displayName,
        requestNonce: nonce,
      });
      return createLegacyProxyResponse({ success: true, data: joinResult });
    } catch (joinErr: any) {
      // If no active dining session exists on table, auto-seat table as Host
      if (joinErr.message.includes('No active dining session')) {
        const discovery = restaurantRuntime.qrService.resolveDiscoveryContext(locator);
        const { session, hostToken } = restaurantRuntime.qrService.openDiningSession({
          tenantId: 'tenant_orbitox',
          companyId: 'company_bistro',
          locationId: 'loc_ludhiana',
          tableId: 'tbl_14', // Default to table 14 for demo
          hostDisplayName: displayName,
          joinPolicy: 'OPEN_JOIN',
        });

        return createLegacyProxyResponse({
          success: true,
          data: {
            joinRequestId: `init_${session.id}`,
            status: 'APPROVED',
            capabilityToken: hostToken,
            message: `Dining party seated at ${discovery.tableNumber}`,
            isHost: true,
            sessionCode: session.sessionCode,
          },
        });
      }
      throw joinErr;
    }
  } catch (error: any) {
    return createLegacyProxyResponse(
      { success: false, error: error.message || 'Join session failed' },
      { status: 422 }
    );
  }
}
