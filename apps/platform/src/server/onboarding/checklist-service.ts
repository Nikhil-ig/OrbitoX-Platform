import { prisma } from '@/server/db/prisma';

export class ChecklistConcurrencyError extends Error {
  readonly statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = 'ChecklistConcurrencyError';
  }
}

export class InvalidChecklistTransitionError extends Error {
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'InvalidChecklistTransitionError';
  }
}

export class ChecklistPersistenceError extends Error {
  readonly statusCode = 500;
  constructor(message: string, public override readonly cause?: unknown) {
    super(message);
    this.name = 'ChecklistPersistenceError';
  }
}

export type ChecklistItemStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'ACTION_REQUIRED'
  | 'PENDING_VERIFICATION'
  | 'COMPLETED'
  | 'FAILED'
  | 'UNAVAILABLE';

export type ChecklistItemId = 'qr' | 'kds' | 'staff' | 'payment' | 'printer';

export interface ChecklistEvidence {
  artifactDownloaded?: boolean;
  downloadedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  orderId?: string;
  settledAmountMinor?: number;
  paymentMethod?: string;
  previewOrderId?: string;
  previewSettledAmountMinor?: number;
  previewPaymentMethod?: string;
  previewSettledAt?: string;
  gatewayVerified?: boolean;
  gatewayTransactionId?: string;
  invitedEmail?: string;
  invitedRole?: string;
  invitedAt?: string;
  memberVerified?: boolean;
  kdsStationId?: string;
  stationLinkVerified?: boolean;
  tasksCount?: number;
  tablesCount?: number;
  printerDriver?: string;
  printerEndpoint?: string;
  paperWidth?: string;
  testPrintId?: string;
  hardwarePending?: boolean;
  physicalPlacementConfirmed?: boolean;
  hardwareMounted?: boolean;
  metadata?: Record<string, any>;
}

export interface ChecklistItemRecord {
  id: ChecklistItemId;
  title: string;
  description: string;
  actionLabel: string;
  status: ChecklistItemStatus;
  completed: boolean;
  statusNote: string;
  evidence?: ChecklistEvidence;
  updatedAt: string;
}

export interface OnboardingChecklistState {
  tenantId: string;
  version: number;
  items: ChecklistItemRecord[];
  completedCount: number;
  totalCount: number;
  allCompleted: boolean;
  updatedAt: string;
}

const CHECKLIST_CACHE_KEY = 'onboarding_checklist';
const FAR_FUTURE_MS = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years

const inMemoryChecklistStore = new Map<string, OnboardingChecklistState>();

export function getDefaultChecklistItems(tableCount = 12): ChecklistItemRecord[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'qr',
      title: 'Print Table QR Codes',
      description: `Download ready-to-print placards for all ${tableCount} tables with authentic cryptographic signatures.`,
      actionLabel: 'Download QR Sheet',
      status: 'NOT_STARTED',
      completed: false,
      statusNote: 'Not yet printed',
      updatedAt: now,
    },
    {
      id: 'kds',
      title: 'Station Kitchen Display (KDS)',
      description: 'Bookmark and open the real-time order queue on your kitchen station tablet or monitor.',
      actionLabel: 'Open Station KDS',
      status: 'NOT_STARTED',
      completed: false,
      statusNote: 'Station unverified',
      updatedAt: now,
    },
    {
      id: 'staff',
      title: 'Invite Captains & Service Staff',
      description: 'Grant role-based PIN access to captains, order takers, and kitchen managers.',
      actionLabel: 'Invite Team',
      status: 'NOT_STARTED',
      completed: false,
      statusNote: 'No invitations sent',
      updatedAt: now,
    },
    {
      id: 'payment',
      title: 'Test Live UPI / Card Payment',
      description: 'Place and settle an authentic ₹1 test transaction to verify live bank reconciliation.',
      actionLabel: 'Test Settlement',
      status: 'NOT_STARTED',
      completed: false,
      statusNote: 'Payment unverified',
      updatedAt: now,
    },
    {
      id: 'printer',
      title: 'Connect Thermal ESC/POS Printer',
      description: 'Auto-print Kitchen Order Tickets (KOT) on Bluetooth or LAN receipt printers.',
      actionLabel: 'Configure Printer',
      status: 'NOT_STARTED',
      completed: false,
      statusNote: 'No printer connected',
      updatedAt: now,
    },
  ];
}

export async function getChecklist(tenantId: string, tableCount = 12): Promise<OnboardingChecklistState> {
  const memoryState = inMemoryChecklistStore.get(tenantId);
  const defaults = memoryState ? memoryState.items : getDefaultChecklistItems(tableCount);

  if (process.env.DATABASE_URL) {
    try {
      const record = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
        return await tx.billingProviderCache.findUnique({
          where: {
            tenantId_cacheKey: {
              tenantId,
              cacheKey: CHECKLIST_CACHE_KEY,
            },
          },
        });
      });

      if (record && record.payload && typeof record.payload === 'object') {
        const payload = record.payload as any;
        if (Array.isArray(payload.items)) {
          const defaultRef = getDefaultChecklistItems(tableCount);
          const mergedItems = defaultRef.map((def) => {
            const match = payload.items.find((it: any) => it.id === def.id);
            if (!match) return def;
            return {
              ...def,
              status: (match.status as ChecklistItemStatus) || (match.completed ? 'COMPLETED' : 'NOT_STARTED'),
              completed: match.status === 'COMPLETED' || Boolean(match.completed),
              statusNote: match.statusNote ?? def.statusNote,
              evidence: match.evidence || undefined,
              updatedAt: match.updatedAt || record.updatedAt.toISOString(),
            };
          });

          const completedCount = mergedItems.filter((i) => i.completed).length;
          const freshState: OnboardingChecklistState = {
            tenantId,
            version: typeof payload.version === 'number' ? payload.version : 1,
            items: mergedItems,
            completedCount,
            totalCount: mergedItems.length,
            allCompleted: completedCount === mergedItems.length,
            updatedAt: record.updatedAt.toISOString(),
          };
          inMemoryChecklistStore.set(tenantId, freshState);
          return freshState;
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') {
        throw new ChecklistPersistenceError('Failed to read onboarding checklist state from database.', err);
      }
    }
  }

  if (memoryState) {
    return memoryState;
  }

  const completedCount = defaults.filter((i) => i.completed).length;
  const initialState: OnboardingChecklistState = {
    tenantId,
    version: 1,
    items: defaults,
    completedCount,
    totalCount: defaults.length,
    allCompleted: completedCount === defaults.length,
    updatedAt: new Date().toISOString(),
  };
  inMemoryChecklistStore.set(tenantId, initialState);
  return initialState;
}

export async function persistChecklistState(
  tenantId: string,
  state: OnboardingChecklistState,
  expectedVersion?: number,
): Promise<OnboardingChecklistState> {
  const now = new Date();
  state.updatedAt = now.toISOString();

  if (process.env.DATABASE_URL) {
    try {
      const persistedState = await prisma.$transaction(async (tx) => {
        // Set tenant context for RLS enforcement
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;

        // 1. Transaction-scoped advisory lock by tenantId to serialize concurrent writes
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('orbitox_checklist_' || ${tenantId}))`;

        // 2. Row-level lock FOR UPDATE
        const rows = await tx.$queryRaw<Array<{ payload: any; updatedAt: Date }>>`
          SELECT "payload", "updatedAt"
          FROM public."BillingProviderCache"
          WHERE "tenantId" = ${tenantId} AND "cacheKey" = ${CHECKLIST_CACHE_KEY}
          FOR UPDATE
        `;

        let nextVersion: number;
        const firstRow = rows[0];
        if (firstRow && firstRow.payload && typeof firstRow.payload === 'object') {
          const payload = firstRow.payload as any;
          const currentVersion = typeof payload.version === 'number' ? payload.version : 1;
          if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
            throw new ChecklistConcurrencyError(
              `Checklist version conflict for tenant ${tenantId}: expected ${expectedVersion}, but found ${currentVersion}`,
            );
          }
          nextVersion = currentVersion + 1;
          state.version = nextVersion;

          await tx.$executeRaw`
            UPDATE public."BillingProviderCache"
            SET "payload" = ${JSON.stringify(state)}::jsonb,
                "updatedAt" = NOW()
            WHERE "tenantId" = ${tenantId} AND "cacheKey" = ${CHECKLIST_CACHE_KEY}
          `;
        } else {
          // First persisted write for this tenant: initial unpersisted state is version 1
          if (expectedVersion !== undefined && expectedVersion !== 1) {
            throw new ChecklistConcurrencyError(
              `Checklist version conflict for tenant ${tenantId}: expected ${expectedVersion}, but initial state is version 1`,
            );
          }
          nextVersion = 2;
          state.version = nextVersion;

          await tx.$executeRaw`
            INSERT INTO public."BillingProviderCache" ("tenantId", "cacheKey", "subscriptionId", "payload", "expiresAt", "updatedAt")
            VALUES (${tenantId}, ${CHECKLIST_CACHE_KEY}, 'onboarding', ${JSON.stringify(state)}::jsonb, NOW() + interval '10 years', NOW())
          `;
        }

        return state;
      });

      inMemoryChecklistStore.set(tenantId, persistedState);
      return persistedState;
    } catch (err) {
      if (err instanceof ChecklistConcurrencyError) {
        throw err;
      }
      if (process.env.NODE_ENV !== 'test') {
        throw new ChecklistPersistenceError('Failed to persist onboarding checklist state to database.', err);
      }
      // If error is not a database connection issue, rethrow
      const errMsg = (err as any)?.message || '';
      if (!errMsg.includes('connect') && !errMsg.includes('connection') && !errMsg.includes('database')) {
        throw err;
      }
    }
  }

  // In-memory fallback (when DATABASE_URL is not set or in test fallback)
  const memory = inMemoryChecklistStore.get(tenantId);
  const currentVersion = memory?.version || 1;
  if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
    throw new ChecklistConcurrencyError(
      `Checklist version conflict for tenant ${tenantId}: expected ${expectedVersion}, but found ${currentVersion}`,
    );
  }
  state.version = currentVersion + 1;
  inMemoryChecklistStore.set(tenantId, state);
  return state;
}

export async function recordQrDownloaded(
  tenantId: string,
  actorId: string,
  tablesCount: number,
  expectedVersion?: number,
): Promise<OnboardingChecklistState> {
  const current = await getChecklist(tenantId);
  const now = new Date().toISOString();

  const updatedItems = current.items.map((it) => {
    if (it.id !== 'qr') return it;
    const evidence: ChecklistEvidence = {
      ...(it.evidence || {}),
      artifactDownloaded: true,
      downloadedAt: now,
      tablesCount,
      verifiedBy: actorId,
    };
    return {
      ...it,
      status: 'ACTION_REQUIRED' as ChecklistItemStatus,
      completed: false,
      statusNote: 'QR Sheet downloaded · Placement required',
      evidence,
      updatedAt: now,
    };
  });

  const completedCount = updatedItems.filter((i) => i.completed).length;
  const nextState: OnboardingChecklistState = {
    ...current,
    items: updatedItems,
    completedCount,
    allCompleted: completedCount === updatedItems.length,
  };

  return persistChecklistState(tenantId, nextState, expectedVersion);
}

export async function recordQrPlacementAttestation(
  tenantId: string,
  actorId: string,
  expectedVersion?: number,
): Promise<OnboardingChecklistState> {
  const current = await getChecklist(tenantId);
  const qrItem = current.items.find((i) => i.id === 'qr');
  if (!qrItem?.evidence?.artifactDownloaded) {
    throw new InvalidChecklistTransitionError('Cannot attest QR placard placement before downloading the placard sheet.');
  }

  const now = new Date().toISOString();
  const updatedItems = current.items.map((it) => {
    if (it.id !== 'qr') return it;
    const evidence: ChecklistEvidence = {
      ...(it.evidence || {}),
      physicalPlacementConfirmed: true,
      verifiedAt: now,
      verifiedBy: actorId,
    };
    return {
      ...it,
      status: 'COMPLETED' as ChecklistItemStatus,
      completed: true,
      statusNote: 'QR placards placed on tables',
      evidence,
      updatedAt: now,
    };
  });

  const completedCount = updatedItems.filter((i) => i.completed).length;
  const nextState: OnboardingChecklistState = {
    ...current,
    items: updatedItems,
    completedCount,
    allCompleted: completedCount === updatedItems.length,
  };

  return persistChecklistState(tenantId, nextState, expectedVersion);
}

export async function recordKdsVerified(
  tenantId: string,
  actorId: string,
  stationId = 'station_main_kitchen',
  tasksCount = 0,
  expectedVersion?: number,
): Promise<OnboardingChecklistState> {
  const current = await getChecklist(tenantId);
  const now = new Date().toISOString();

  const updatedItems = current.items.map((it) => {
    if (it.id !== 'kds') return it;
    const evidence: ChecklistEvidence = {
      ...(it.evidence || {}),
      stationLinkVerified: true,
      kdsStationId: stationId,
      tasksCount,
      verifiedAt: now,
      verifiedBy: actorId,
    };
    return {
      ...it,
      status: 'ACTION_REQUIRED' as ChecklistItemStatus,
      completed: false,
      statusNote: 'Station link verified · Hardware placement required',
      evidence,
      updatedAt: now,
    };
  });

  const completedCount = updatedItems.filter((i) => i.completed).length;
  const nextState: OnboardingChecklistState = {
    ...current,
    items: updatedItems,
    completedCount,
    allCompleted: completedCount === updatedItems.length,
  };

  return persistChecklistState(tenantId, nextState, expectedVersion);
}

export async function recordKdsMountedAttestation(
  tenantId: string,
  actorId: string,
  expectedVersion?: number,
): Promise<OnboardingChecklistState> {
  const current = await getChecklist(tenantId);
  const kdsItem = current.items.find((i) => i.id === 'kds');
  if (!kdsItem?.evidence?.kdsStationId) {
    throw new InvalidChecklistTransitionError('Cannot attest KDS mounting before a station link has been verified.');
  }

  const now = new Date().toISOString();

  const updatedItems = current.items.map((it) => {
    if (it.id !== 'kds') return it;
    const evidence: ChecklistEvidence = {
      ...(it.evidence || {}),
      hardwareMounted: true,
      verifiedAt: now,
      verifiedBy: actorId,
    };
    return {
      ...it,
      status: 'COMPLETED' as ChecklistItemStatus,
      completed: true,
      statusNote: 'KDS station operational & mounted',
      evidence,
      updatedAt: now,
    };
  });

  const completedCount = updatedItems.filter((i) => i.completed).length;
  const nextState: OnboardingChecklistState = {
    ...current,
    items: updatedItems,
    completedCount,
    allCompleted: completedCount === updatedItems.length,
  };

  return persistChecklistState(tenantId, nextState, expectedVersion);
}

export async function recordStaffInvited(
  tenantId: string,
  actorId: string,
  email: string,
  role: string,
  expectedVersion?: number,
): Promise<OnboardingChecklistState> {
  const current = await getChecklist(tenantId);
  const now = new Date().toISOString();

  const updatedItems = current.items.map((it) => {
    if (it.id !== 'staff') return it;
    const evidence: ChecklistEvidence = {
      ...(it.evidence || {}),
      invitedEmail: email,
      invitedRole: role,
      invitedAt: now,
      verifiedBy: actorId,
    };
    return {
      ...it,
      status: 'PENDING_VERIFICATION' as ChecklistItemStatus,
      completed: false,
      statusNote: `Invite dispatched to ${email} (${role}) · Awaiting acceptance`,
      evidence,
      updatedAt: now,
    };
  });

  const completedCount = updatedItems.filter((i) => i.completed).length;
  const nextState: OnboardingChecklistState = {
    ...current,
    items: updatedItems,
    completedCount,
    allCompleted: completedCount === updatedItems.length,
  };

  return persistChecklistState(tenantId, nextState, expectedVersion);
}

export async function recordStaffVerified(
  tenantId: string,
  actorId: string,
  memberEmail?: string,
  expectedVersion?: number,
): Promise<OnboardingChecklistState> {
  const current = await getChecklist(tenantId);
  const now = new Date().toISOString();

  const updatedItems = current.items.map((it) => {
    if (it.id !== 'staff') return it;
    const evidence: ChecklistEvidence = {
      ...(it.evidence || {}),
      memberVerified: true,
      verifiedAt: now,
      verifiedBy: actorId,
    };
    return {
      ...it,
      status: 'COMPLETED' as ChecklistItemStatus,
      completed: true,
      statusNote: memberEmail ? `Team member ${memberEmail} active` : 'Team member verified & onboarded',
      evidence,
      updatedAt: now,
    };
  });

  const completedCount = updatedItems.filter((i) => i.completed).length;
  const nextState: OnboardingChecklistState = {
    ...current,
    items: updatedItems,
    completedCount,
    allCompleted: completedCount === updatedItems.length,
  };

  return persistChecklistState(tenantId, nextState, expectedVersion);
}

export async function recordPreviewPaymentSettled(
  tenantId: string,
  actorId: string,
  orderId: string,
  amountMinor: number,
  method = 'UPI',
  expectedVersion?: number,
): Promise<OnboardingChecklistState> {
  const current = await getChecklist(tenantId);
  const now = new Date().toISOString();

  const updatedItems = current.items.map((it) => {
    if (it.id !== 'payment') return it;
    const evidence: ChecklistEvidence = {
      ...(it.evidence || {}),
      previewOrderId: orderId,
      previewSettledAmountMinor: amountMinor,
      previewPaymentMethod: method,
      previewSettledAt: now,
      verifiedBy: actorId,
    };
    return {
      ...it,
      status: 'ACTION_REQUIRED' as ChecklistItemStatus,
      completed: false,
      statusNote: `Preview test order settled (${orderId}) · Live gateway reconciliation pending`,
      evidence,
      updatedAt: now,
    };
  });

  const completedCount = updatedItems.filter((i) => i.completed).length;
  const nextState: OnboardingChecklistState = {
    ...current,
    items: updatedItems,
    completedCount,
    allCompleted: completedCount === updatedItems.length,
  };

  return persistChecklistState(tenantId, nextState, expectedVersion);
}

export async function recordLiveGatewayVerified(
  tenantId: string,
  actorId: string,
  transactionId: string,
  method = 'UPI',
  expectedVersion?: number,
): Promise<OnboardingChecklistState> {
  const current = await getChecklist(tenantId);
  const now = new Date().toISOString();

  const updatedItems = current.items.map((it) => {
    if (it.id !== 'payment') return it;
    const evidence: ChecklistEvidence = {
      ...(it.evidence || {}),
      gatewayVerified: true,
      gatewayTransactionId: transactionId,
      paymentMethod: method,
      verifiedAt: now,
      verifiedBy: actorId,
    };
    return {
      ...it,
      status: 'COMPLETED' as ChecklistItemStatus,
      completed: true,
      statusNote: 'Live payment gateway verified & reconciled',
      evidence,
      updatedAt: now,
    };
  });

  const completedCount = updatedItems.filter((i) => i.completed).length;
  const nextState: OnboardingChecklistState = {
    ...current,
    items: updatedItems,
    completedCount,
    allCompleted: completedCount === updatedItems.length,
  };

  return persistChecklistState(tenantId, nextState, expectedVersion);
}

export async function recordPrinterConfigured(
  tenantId: string,
  actorId: string,
  config: {
    driver: string;
    endpoint: string;
    paperWidth?: string;
    testPrintId?: string;
  },
  expectedVersion?: number,
): Promise<OnboardingChecklistState> {
  const current = await getChecklist(tenantId);
  const now = new Date().toISOString();

  const isVerified = Boolean(config.testPrintId);
  const updatedItems = current.items.map((it) => {
    if (it.id !== 'printer') return it;
    const evidence: ChecklistEvidence = {
      ...(it.evidence || {}),
      printerDriver: config.driver,
      printerEndpoint: config.endpoint,
      paperWidth: config.paperWidth,
      testPrintId: config.testPrintId,
      verifiedAt: isVerified ? now : undefined,
      verifiedBy: actorId,
    };
    return {
      ...it,
      status: (isVerified ? 'COMPLETED' : 'ACTION_REQUIRED') as ChecklistItemStatus,
      completed: isVerified,
      statusNote: isVerified
        ? `Printer connected (${config.driver} @ ${config.endpoint})`
        : `Printer endpoint registered (${config.driver}) · Dispatch test required`,
      evidence,
      updatedAt: now,
    };
  });

  const completedCount = updatedItems.filter((i) => i.completed).length;
  const nextState: OnboardingChecklistState = {
    ...current,
    items: updatedItems,
    completedCount,
    allCompleted: completedCount === updatedItems.length,
  };

  return persistChecklistState(tenantId, nextState, expectedVersion);
}

export async function recordPrinterPending(
  tenantId: string,
  actorId: string,
  config?: {
    driver?: string;
    endpoint?: string;
    paperWidth?: string;
  },
  expectedVersion?: number,
): Promise<OnboardingChecklistState> {
  const current = await getChecklist(tenantId);
  const now = new Date().toISOString();

  const updatedItems = current.items.map((it) => {
    if (it.id !== 'printer') return it;
    const evidence: ChecklistEvidence = {
      ...(it.evidence || {}),
      ...(config || {}),
      hardwarePending: true,
      verifiedAt: now,
      verifiedBy: actorId,
    };
    return {
      ...it,
      status: 'UNAVAILABLE' as ChecklistItemStatus,
      completed: false,
      statusNote: 'Hardware pending · Digital KDS tickets active',
      evidence,
      updatedAt: now,
    };
  });

  const completedCount = updatedItems.filter((i) => i.completed).length;
  const nextState: OnboardingChecklistState = {
    ...current,
    items: updatedItems,
    completedCount,
    allCompleted: completedCount === updatedItems.length,
  };

  return persistChecklistState(tenantId, nextState, expectedVersion);
}

export async function updateChecklistItem(
  tenantId: string,
  input: {
    itemId: ChecklistItemId;
    status: ChecklistItemStatus;
    statusNote?: string;
    evidence?: ChecklistEvidence;
    actorId?: string;
    expectedVersion?: number;
  },
  tableCount = 12,
): Promise<OnboardingChecklistState> {
  const current = await getChecklist(tenantId, tableCount);
  const now = new Date().toISOString();

  const isCompleted = input.status === 'COMPLETED';

  // Enforce server-authoritative transitions: client cannot fabricate completion without required evidence
  if (isCompleted) {
    if (input.itemId === 'qr' && !input.evidence?.physicalPlacementConfirmed) {
      throw new InvalidChecklistTransitionError('Cannot mark QR placard item completed without physical placement confirmation.');
    }
    if (input.itemId === 'kds' && !input.evidence?.hardwareMounted) {
      throw new InvalidChecklistTransitionError('Cannot mark KDS item completed without hardware mounting confirmation.');
    }
    if (input.itemId === 'staff' && !input.evidence?.memberVerified) {
      throw new InvalidChecklistTransitionError('Cannot mark staff item completed without accepted membership verification.');
    }
    if (input.itemId === 'payment' && !input.evidence?.gatewayVerified) {
      throw new InvalidChecklistTransitionError('Cannot mark payment item completed without live gateway reconciliation.');
    }
    if (input.itemId === 'printer' && (!input.evidence?.testPrintId || !input.evidence?.printerDriver)) {
      throw new InvalidChecklistTransitionError('Cannot mark printer item completed without acknowledged test print.');
    }
  }

  const updatedItems = current.items.map((it) => {
    if (it.id !== input.itemId) return it;

    const mergedEvidence: ChecklistEvidence = {
      ...(it.evidence || {}),
      ...(input.evidence || {}),
    };
    if (input.actorId) {
      mergedEvidence.verifiedBy = input.actorId;
    }
    if (isCompleted && !mergedEvidence.verifiedAt) {
      mergedEvidence.verifiedAt = now;
    }

    return {
      ...it,
      status: input.status,
      completed: isCompleted,
      statusNote: input.statusNote ?? it.statusNote,
      evidence: mergedEvidence,
      updatedAt: now,
    };
  });

  const completedCount = updatedItems.filter((i) => i.completed).length;
  const nextState: OnboardingChecklistState = {
    ...current,
    items: updatedItems,
    completedCount,
    allCompleted: completedCount === updatedItems.length,
    updatedAt: now,
  };

  return persistChecklistState(tenantId, nextState, input.expectedVersion);
}
