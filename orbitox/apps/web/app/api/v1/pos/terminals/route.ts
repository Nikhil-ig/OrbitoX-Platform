import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '../../_lib/api-guard';

const POS_TERMINALS = [
  {
    id: 'pos-term-01',
    terminalName: 'Express Lane #1 (Touch Register)',
    stationId: 'station-front-01',
    drawerStatus: 'locked_secured',
    hardwareStatus: 'connected',
    printerOnline: true,
    cashInDrawer: 1450.0,
    dailyTransactionsCount: 284,
    lastSyncAt: 'Just now',
    firmwareVersion: 'v3.8.1-anti-tamper',
  },
  {
    id: 'pos-term-02',
    terminalName: 'Self-Checkout Kiosk #4',
    stationId: 'kiosk-cluster-b',
    drawerStatus: 'cashless_digital',
    hardwareStatus: 'connected',
    printerOnline: true,
    cashInDrawer: 0.0,
    dailyTransactionsCount: 612,
    lastSyncAt: '12 secs ago',
    firmwareVersion: 'v3.8.1-anti-tamper',
  },
  {
    id: 'pos-term-03',
    terminalName: 'Drive-Thru / Curbside Mobile Terminal',
    stationId: 'mobile-cart-02',
    drawerStatus: 'handheld_secure',
    hardwareStatus: 'connected',
    printerOnline: true,
    cashInDrawer: 320.0,
    dailyTransactionsCount: 148,
    lastSyncAt: '1 min ago',
    firmwareVersion: 'v3.8.1-anti-tamper',
  },
];

export const GET = withApiGuard(
  {
    serviceId: 'pos',
    serviceName: 'Point of Sale (Omnichannel POS)',
  },
  async (req: NextRequest) => {
    return NextResponse.json({
      success: true,
      data: POS_TERMINALS,
      meta: {
        totalTerminals: POS_TERMINALS.length,
        activeSync: true,
        networkMode: 'mesh-synchronized',
      },
    });
  }
);
