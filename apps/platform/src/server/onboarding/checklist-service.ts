import { prisma } from '@/server/db/prisma';

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
  invitedEmail?: string;
  invitedRole?: string;
  kdsStationId?: string;
  tasksCount?: number;
  tablesCount?: number;
  printerDriver?: string;
  printerEndpoint?: string;
  testPrintId?: string;
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
      const record = await prisma.billingProviderCache.findUnique({
        where: {
          tenantId_cacheKey: {
            tenantId,
            cacheKey: CHECKLIST_CACHE_KEY,
          },
        },
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
    } catch {
      // Prisma offline or unconfigured, fallback to memory
    }
  }

  if (memoryState) {
    return memoryState;
  }

  const completedCount = defaults.filter((i) => i.completed).length;
  const initialState: OnboardingChecklistState = {
    tenantId,
    items: defaults,
    completedCount,
    totalCount: defaults.length,
    allCompleted: completedCount === defaults.length,
    updatedAt: new Date().toISOString(),
  };
  inMemoryChecklistStore.set(tenantId, initialState);
  return initialState;
}

export async function updateChecklistItem(
  tenantId: string,
  input: {
    itemId: ChecklistItemId;
    status: ChecklistItemStatus;
    statusNote?: string;
    evidence?: ChecklistEvidence;
    actorId?: string;
  },
  tableCount = 12,
): Promise<OnboardingChecklistState> {
  const current = await getChecklist(tenantId, tableCount);
  const now = new Date().toISOString();

  const isCompleted = input.status === 'COMPLETED';
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
    tenantId,
    items: updatedItems,
    completedCount,
    totalCount: updatedItems.length,
    allCompleted: completedCount === updatedItems.length,
    updatedAt: now,
  };

  inMemoryChecklistStore.set(tenantId, nextState);

  if (process.env.DATABASE_URL) {
    try {
      await prisma.billingProviderCache.upsert({
        where: {
          tenantId_cacheKey: {
            tenantId,
            cacheKey: CHECKLIST_CACHE_KEY,
          },
        },
        update: {
          payload: nextState as any,
          expiresAt: new Date(Date.now() + FAR_FUTURE_MS),
          updatedAt: new Date(),
        },
        create: {
          tenantId,
          cacheKey: CHECKLIST_CACHE_KEY,
          subscriptionId: 'onboarding',
          payload: nextState as any,
          expiresAt: new Date(Date.now() + FAR_FUTURE_MS),
          updatedAt: new Date(),
        },
      });
    } catch {
      // Prisma offline, state is still retained in memory
    }
  }

  return nextState;
}
