/**
 * 🛡️ OrbitoX RestaurantOS - QR Trust, Table Discovery & Dining Session Engine
 * ─────────────────────────────────────────────────────────────
 * Implements the authoritative v2.2 contract:
 * - SCAN ≠ JOIN (TableDiscoveryContext provides only public metadata)
 * - Explicit Join Policies (OPEN_JOIN, HOST_APPROVAL, STAFF_APPROVAL)
 * - Independent Ephemeral Guest Capabilities bound to accessEpoch
 * - Sanitized Shared Order Projections (Zero customer PII)
 * - Instant Access Revocation on Session Turnover or Eviction
 */

import * as crypto from 'crypto';
import {
  QRTrustEngine,
  QRIdentity,
  TableDiscoveryContext,
  DiningSession,
  SessionParticipant,
  SessionJoinRequest,
  DiningJoinPolicy,
  ParticipantRole,
  GuestCapabilityPayload,
  SanitizedParticipantProjection,
} from '../domain/qr-trust';

export interface CreateSessionParams {
  readonly tenantId: string;
  readonly companyId: string;
  readonly locationId: string;
  readonly tableId: string;
  readonly hostDisplayName: string;
  readonly joinPolicy?: DiningJoinPolicy;
}

export interface JoinRequestResult {
  readonly joinRequestId: string;
  readonly status: 'APPROVED' | 'REQUESTED';
  readonly capabilityToken?: string;
  readonly message: string;
}

export interface SharedOrderView {
  readonly orderId: string;
  readonly participantDisplayName: string;
  readonly isYourOrder: boolean;
  readonly items: Array<{
    readonly name: string;
    readonly quantity: number;
    readonly selectedModifiers: string[];
    readonly preparationStatus: string;
  }>;
  readonly customerStage: string;
  readonly totalMinor: bigint;
  readonly currency: string;
}

export class QrSessionService {
  // In-memory operational stores for instant sub-millisecond execution
  private readonly qrIdentities = new Map<string, QRIdentity>(); // locator -> QRIdentity
  private readonly tables = new Map<string, { id: string; tableNumber: string; capacity: number; locationId: string }>();
  private readonly sessions = new Map<string, DiningSession>(); // sessionId -> DiningSession
  private readonly participants = new Map<string, SessionParticipant>(); // participantId -> SessionParticipant
  private readonly joinRequests = new Map<string, SessionJoinRequest>(); // joinRequestId -> SessionJoinRequest
  private readonly tableActiveSessions = new Map<string, string>(); // tableId -> activeSessionId
  private readonly orders = new Map<string, any>(); // orderId -> Order record

  /**
   * Registers a permanent physical QR identity for a dining table.
   */
  registerTableQR(identity: QRIdentity, tableInfo: { tableNumber: string; capacity: number }): void {
    this.qrIdentities.set(identity.locator, identity);
    this.tables.set(identity.tableId, {
      id: identity.tableId,
      tableNumber: tableInfo.tableNumber,
      capacity: tableInfo.capacity,
      locationId: identity.locationId,
    });
  }

  /**
   * Resolves a public table locator scanned from a physical QR code.
   * INVARIANT (SCAN ≠ JOIN): Exposes public table metadata only.
   * NEVER returns sessionId, active participant names, or order items to an unauthenticated scan.
   */
  resolveDiscoveryContext(locator: string, tenantScope?: string): TableDiscoveryContext {
    const qr = this.qrIdentities.get(locator);
    if (!qr || !qr.isActive) {
      throw new Error('Table QR code is invalid or deactivated');
    }

    if (tenantScope && qr.tenantId !== tenantScope) {
      throw new Error('Cross-tenant QR resolution rejected');
    }

    const table = this.tables.get(qr.tableId);
    if (!table) {
      throw new Error('Associated physical table not found');
    }

    const activeSessionId = this.tableActiveSessions.get(table.id);
    const activeSession = activeSessionId ? this.sessions.get(activeSessionId) : null;

    return QRTrustEngine.buildDiscoveryContext({
      restaurantName: 'OrbitoX Bistro',
      branchName: 'Ludhiana Main',
      serviceAreaName: 'Main Courtyard',
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      activeSession,
      locator: qr.locator,
    });
  }

  /**
   * Opens a new DiningSession for a table when the first guest (or captain) seats the party.
   */
  openDiningSession(params: CreateSessionParams): { session: DiningSession; hostToken: string } {
    const existingActiveId = this.tableActiveSessions.get(params.tableId);
    if (existingActiveId) {
      const existing = this.sessions.get(existingActiveId);
      if (existing && existing.status === 'ACTIVE') {
        throw new Error(`Table ${params.tableId} already has an active dining session (${existing.sessionCode})`);
      }
    }

    const sessionId = `sess_${crypto.randomUUID()}`;
    const hostParticipantId = `part_${crypto.randomUUID()}`;
    const sessionCode = `S-${crypto.randomInt(1000, 10000)}`;

    const session: DiningSession = {
      id: sessionId,
      tenantId: params.tenantId,
      companyId: params.companyId,
      locationId: params.locationId,
      tableId: params.tableId,
      sessionCode,
      status: 'ACTIVE',
      joinPolicy: params.joinPolicy ?? 'OPEN_JOIN',
      hostParticipantId,
      accessEpoch: 1,
      version: 1,
      openedAt: new Date().toISOString(),
    };

    const hostToken = QRTrustEngine.issueCapabilityToken({
      tenantId: params.tenantId,
      companyId: params.companyId,
      locationId: params.locationId,
      tableId: params.tableId,
      diningSessionId: sessionId,
      participantId: hostParticipantId,
      role: 'HOST',
      accessEpoch: session.accessEpoch,
    });

    const hostParticipant: SessionParticipant = {
      id: hostParticipantId,
      tenantId: params.tenantId,
      companyId: params.companyId,
      locationId: params.locationId,
      diningSessionId: sessionId,
      role: 'HOST',
      displayName: params.hostDisplayName,
      capabilityTokenHash: QRTrustEngine.hashToken(hostToken),
      joinedAt: new Date().toISOString(),
      isActive: true,
    };

    this.sessions.set(sessionId, session);
    this.tableActiveSessions.set(params.tableId, sessionId);
    this.participants.set(hostParticipantId, hostParticipant);

    return { session, hostToken };
  }

  /**
   * A guest attempts to join the dining session for a scanned table.
   */
  requestJoinSession(params: {
    locator: string;
    displayName: string;
    requestNonce?: string;
  }): JoinRequestResult {
    const qr = this.qrIdentities.get(params.locator);
    if (!qr) throw new Error('Invalid table locator');

    const activeSessionId = this.tableActiveSessions.get(qr.tableId);
    if (!activeSessionId) {
      throw new Error('No active dining session on this table. Please notify staff or seat the table.');
    }

    const session = this.sessions.get(activeSessionId);
    if (!session || session.status !== 'ACTIVE') {
      throw new Error('Table session is closed');
    }

    const nonce = params.requestNonce ?? crypto.randomUUID();
    const nonceHash = QRTrustEngine.hashToken(nonce);

    // Prevent duplicate/replayed join request nonces
    for (const req of this.joinRequests.values()) {
      if (req.requestTokenHash === nonceHash) {
        throw new Error('Join request nonce has already been submitted');
      }
    }

    const joinRequestId = `join_${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + 120 * 1000).toISOString();

    // Policy 1: OPEN_JOIN -> Instant approval & capability token issuance
    if (session.joinPolicy === 'OPEN_JOIN') {
      const participantId = `part_${crypto.randomUUID()}`;
      const token = QRTrustEngine.issueCapabilityToken({
        tenantId: session.tenantId,
        companyId: session.companyId,
        locationId: session.locationId,
        tableId: session.tableId,
        diningSessionId: session.id,
        participantId,
        role: 'GUEST',
        accessEpoch: session.accessEpoch,
      });

      const participant: SessionParticipant = {
        id: participantId,
        tenantId: session.tenantId,
        companyId: session.companyId,
        locationId: session.locationId,
        diningSessionId: session.id,
        role: 'GUEST',
        displayName: params.displayName,
        capabilityTokenHash: QRTrustEngine.hashToken(token),
        joinedAt: new Date().toISOString(),
        isActive: true,
      };

      this.participants.set(participantId, participant);

      const approvedReq: SessionJoinRequest = {
        id: joinRequestId,
        tenantId: session.tenantId,
        companyId: session.companyId,
        locationId: session.locationId,
        diningSessionId: session.id,
        displayName: params.displayName,
        status: 'APPROVED',
        requestTokenHash: nonceHash,
        decidedBy: 'AUTO_POLICY',
        decidedAt: new Date().toISOString(),
        expiresAt,
        createdAt: new Date().toISOString(),
      };
      this.joinRequests.set(joinRequestId, approvedReq);

      return {
        joinRequestId,
        status: 'APPROVED',
        capabilityToken: token,
        message: 'Successfully joined table party',
      };
    }

    // Policy 2: HOST_APPROVAL / STAFF_APPROVAL -> Pending request created
    const pendingReq: SessionJoinRequest = {
      id: joinRequestId,
      tenantId: session.tenantId,
      companyId: session.companyId,
      locationId: session.locationId,
      diningSessionId: session.id,
      displayName: params.displayName,
      status: 'REQUESTED',
      requestTokenHash: nonceHash,
      expiresAt,
      createdAt: new Date().toISOString(),
    };
    this.joinRequests.set(joinRequestId, pendingReq);

    return {
      joinRequestId,
      status: 'REQUESTED',
      message: 'Join request sent to table host for approval',
    };
  }

  /**
   * Host approves a pending join request.
   */
  approveJoinRequest(params: {
    hostCapabilityToken: string;
    joinRequestId: string;
  }): { approved: boolean; guestToken: string } {
    const request = this.joinRequests.get(params.joinRequestId);
    if (!request) throw new Error('Join request not found');
    if (request.status !== 'REQUESTED') {
      throw new Error(`Cannot approve join request in status: ${request.status}`);
    }

    if (new Date(request.expiresAt).getTime() < Date.now()) {
      throw new Error('Join request has expired');
    }

    const session = this.sessions.get(request.diningSessionId);
    if (!session || session.status !== 'ACTIVE') {
      throw new Error('Dining session is not active');
    }

    // Verify host capability
    const hostPayload = QRTrustEngine.verifyCapability(params.hostCapabilityToken, session);
    if (hostPayload.role !== 'HOST' && hostPayload.role !== 'STAFF') {
      throw new Error('Only table host or staff can approve join requests');
    }

    // Create participant
    const participantId = `part_${crypto.randomUUID()}`;
    const guestToken = QRTrustEngine.issueCapabilityToken({
      tenantId: session.tenantId,
      companyId: session.companyId,
      locationId: session.locationId,
      tableId: session.tableId,
      diningSessionId: session.id,
      participantId,
      role: 'GUEST',
      accessEpoch: session.accessEpoch,
    });

    const participant: SessionParticipant = {
      id: participantId,
      tenantId: session.tenantId,
      companyId: session.companyId,
      locationId: session.locationId,
      diningSessionId: session.id,
      role: 'GUEST',
      displayName: request.displayName,
      capabilityTokenHash: QRTrustEngine.hashToken(guestToken),
      joinedAt: new Date().toISOString(),
      isActive: true,
    };

    this.participants.set(participantId, participant);

    // Atomically transition request to APPROVED
    const updatedReq: SessionJoinRequest = {
      ...request,
      status: 'APPROVED',
      decidedBy: hostPayload.participantId,
      decidedAt: new Date().toISOString(),
    };
    this.joinRequests.set(request.id, updatedReq);

    return { approved: true, guestToken };
  }

  /**
   * Returns sanitized shared order projection for authenticated diners.
   */
  getSharedOrders(capabilityToken: string): SharedOrderView[] {
    // 1. Decode token to find session
    const parts = capabilityToken.split('.');
    if (parts.length !== 2 || !parts[0]) throw new Error('Invalid capability token');
    const payload: GuestCapabilityPayload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));

    const session = this.sessions.get(payload.diningSessionId);
    if (!session) throw new Error('Dining session not found');

    // 2. Strict cryptographic + epoch validation
    QRTrustEngine.verifyCapability(capabilityToken, session);

    // 3. Return sanitized orders for this session
    const sessionOrders: SharedOrderView[] = [];
    for (const order of this.orders.values()) {
      if (order.sessionId === session.id) {
        const participant = this.participants.get(order.participantId);
        sessionOrders.push({
          orderId: order.id,
          participantDisplayName: participant?.displayName ?? 'Guest',
          isYourOrder: order.participantId === payload.participantId,
          items: order.items,
          customerStage: order.customerStage,
          totalMinor: order.totalMinor,
          currency: order.currency,
        });
      }
    }

    return sessionOrders;
  }

  /**
   * Adds an order to the active session.
   */
  recordOrder(capabilityToken: string, orderData: any): void {
    const parts = capabilityToken.split('.');
    if (parts.length !== 2 || !parts[0]) throw new Error('Invalid capability token');
    const payload: GuestCapabilityPayload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));

    const session = this.sessions.get(payload.diningSessionId);
    if (!session || session.status !== 'ACTIVE') throw new Error('Active session required to order');

    QRTrustEngine.verifyCapability(capabilityToken, session);

    this.orders.set(orderData.id, {
      ...orderData,
      sessionId: session.id,
      participantId: payload.participantId,
    });
  }

  /**
   * Closes table session and increments accessEpoch to instantly revoke all guest capabilities.
   */
  closeSession(sessionToken: string): void {
    const parts = sessionToken.split('.');
    if (parts.length !== 2 || !parts[0]) throw new Error('Invalid capability token');
    const payload: GuestCapabilityPayload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));

    const session = this.sessions.get(payload.diningSessionId);
    if (!session) throw new Error('Session not found');

    QRTrustEngine.verifyCapability(sessionToken, session);

    // Increment accessEpoch on turnover
    const updatedSession: DiningSession = {
      ...session,
      status: 'CLOSED',
      accessEpoch: session.accessEpoch + 1,
      version: session.version + 1,
      closedAt: new Date().toISOString(),
    };

    this.sessions.set(session.id, updatedSession);
    this.tableActiveSessions.delete(session.tableId);
  }

  /**
   * Evicts a participant from the table.
   * Increments accessEpoch to invalidate evicted user's token.
   */
  evictParticipant(hostToken: string, participantIdToEvict: string): void {
    const parts = hostToken.split('.');
    if (parts.length !== 2 || !parts[0]) throw new Error('Invalid capability token');
    const payload: GuestCapabilityPayload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));

    const session = this.sessions.get(payload.diningSessionId);
    if (!session || session.status !== 'ACTIVE') throw new Error('Session not active');

    QRTrustEngine.verifyCapability(hostToken, session);
    if (payload.role !== 'HOST' && payload.role !== 'STAFF') {
      throw new Error('Only host or staff can evict participants');
    }

    const evicted = this.participants.get(participantIdToEvict);
    if (!evicted || evicted.diningSessionId !== session.id) {
      throw new Error('Participant not in this session');
    }

    // Mark inactive
    this.participants.set(participantIdToEvict, {
      ...evicted,
      isActive: false,
      leftAt: new Date().toISOString(),
    });

    // Increment session accessEpoch to revoke old tokens
    this.sessions.set(session.id, {
      ...session,
      accessEpoch: session.accessEpoch + 1,
      version: session.version + 1,
    });
  }

  /**
   * Re-issues a capability token for an active participant after an epoch bump.
   */
  refreshCapabilityForParticipant(participantId: string): string {
    const participant = this.participants.get(participantId);
    if (!participant || !participant.isActive) {
      throw new Error('Participant is not active');
    }

    const session = this.sessions.get(participant.diningSessionId);
    if (!session || session.status !== 'ACTIVE') {
      throw new Error('Session is closed');
    }

    const newToken = QRTrustEngine.issueCapabilityToken({
      tenantId: session.tenantId,
      companyId: session.companyId,
      locationId: session.locationId,
      tableId: session.tableId,
      diningSessionId: session.id,
      participantId: participant.id,
      role: participant.role,
      accessEpoch: session.accessEpoch,
    });

    this.participants.set(participant.id, {
      ...participant,
      capabilityTokenHash: QRTrustEngine.hashToken(newToken),
    });

    return newToken;
  }
}
