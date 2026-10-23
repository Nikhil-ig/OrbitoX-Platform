/**
 * 🔐 OrbitoX RestaurantOS - QR Trust & Guest Capability Engine (v2.2 Contract)
 * ─────────────────────────────────────────────────────────────
 * INVARIANT: SCAN ≠ JOIN.
 * Printed QR codes are physical table locators, NEVER authenticated dining credentials.
 * Scanning a table QR produces a sanitized TableDiscoveryContext with ZERO private session data.
 * Diners become participants only after explicit join policy evaluation.
 * Ephemeral GuestCapability tokens are strictly bound to diningSessionId AND accessEpoch.
 */

import * as crypto from 'crypto';
import { requireSecret } from '@orbitox/config';

export type DiningSessionStatus = 'ACTIVE' | 'BILL_REQUESTED' | 'SETTLING' | 'CLOSED' | 'ABANDONED';
export type DiningJoinPolicy = 'OPEN_JOIN' | 'HOST_APPROVAL' | 'STAFF_APPROVAL';
export type ParticipantRole = 'HOST' | 'GUEST' | 'STAFF';
export type JoinRequestStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

export interface QRIdentity {
  readonly id: string;
  readonly tenantId: string;
  readonly companyId: string;
  readonly locationId: string;
  readonly tableId: string;
  readonly locator: string; // High-entropy opaque public token e.g. "7Kp9xQ8m2L"
  readonly tokenHash: string; // SHA-256 of locator secret
  readonly securityVersion: number;
  readonly isActive: boolean;
}

/**
 * Public discovery projection returned when any phone scans a table QR.
 * ZERO PII, ZERO ORDER DATA, ZERO ACTIVE GUEST NAMES.
 */
export interface TableDiscoveryContext {
  readonly restaurantName: string;
  readonly branchName: string;
  readonly serviceAreaName: string;
  readonly tableNumber: string;
  readonly capacity: number;
  readonly hasActiveSession: boolean;
  readonly joinPolicy: DiningJoinPolicy;
  readonly publicMenuAvailable: boolean;
  // Opaque tokens for subsequent join initiation
  readonly locator: string;
  readonly resolvedAt: string;
}

export interface DiningSession {
  readonly id: string;
  readonly tenantId: string;
  readonly companyId: string;
  readonly locationId: string;
  readonly tableId: string;
  readonly sessionCode: string; // e.g. "S-1048"
  readonly status: DiningSessionStatus;
  readonly joinPolicy: DiningJoinPolicy;
  readonly hostParticipantId?: string;
  readonly accessEpoch: number; // Incremented on close/evict to instantly invalidate all capabilities
  readonly version: number;
  readonly openedAt: string;
  readonly closedAt?: string;
}

export interface SessionParticipant {
  readonly id: string;
  readonly tenantId: string;
  readonly companyId: string;
  readonly locationId: string;
  readonly diningSessionId: string;
  readonly role: ParticipantRole;
  readonly displayName: string; // Public display only (e.g. "Nikhil")
  readonly capabilityTokenHash: string;
  readonly joinedAt: string;
  readonly leftAt?: string;
  readonly isActive: boolean;
}

export interface SessionJoinRequest {
  readonly id: string;
  readonly tenantId: string;
  readonly companyId: string;
  readonly locationId: string;
  readonly diningSessionId: string;
  readonly displayName: string;
  readonly status: JoinRequestStatus;
  readonly requestTokenHash: string;
  readonly decidedBy?: string;
  readonly decidedAt?: string;
  readonly expiresAt: string; // Typically 120s TTL
  readonly createdAt: string;
}

export interface GuestCapabilityPayload {
  readonly tenantId: string;
  readonly companyId: string;
  readonly locationId: string;
  readonly tableId: string;
  readonly diningSessionId: string;
  readonly participantId: string;
  readonly role: ParticipantRole;
  readonly accessEpoch: number;
  readonly exp: number; // Unix timestamp seconds
}

export interface SanitizedParticipantProjection {
  readonly participantId: string;
  readonly displayName: string;
  readonly role: ParticipantRole;
  readonly isYou: boolean;
}

export class QRTrustEngine {
  private static getSecretKey(): string {
    return requireSecret('ORBITOX_GUEST_SECRET', { minBytes: 32 });
  }

  /**
   * Hashes an arbitrary token string using SHA-256 for secure DB lookups.
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a high-entropy locator code for a physical table.
   */
  static generateLocator(): string {
    return crypto.randomBytes(8).toString('base64url');
  }

  /**
   * Builds the strictly sanitized TableDiscoveryContext for a scanned QR.
   * INVARIANT: Never leaks active participant PII or existing order states.
   */
  static buildDiscoveryContext(params: {
    restaurantName: string;
    branchName: string;
    serviceAreaName: string;
    tableNumber: string;
    capacity: number;
    activeSession?: DiningSession | null;
    locator: string;
  }): TableDiscoveryContext {
    return {
      restaurantName: params.restaurantName,
      branchName: params.branchName,
      serviceAreaName: params.serviceAreaName,
      tableNumber: params.tableNumber,
      capacity: params.capacity,
      hasActiveSession: !!params.activeSession && params.activeSession.status === 'ACTIVE',
      joinPolicy: params.activeSession?.joinPolicy ?? 'OPEN_JOIN',
      publicMenuAvailable: true,
      locator: params.locator,
      resolvedAt: new Date().toISOString(),
    };
  }

  /**
   * Issues a cryptographically signed GuestCapability token for an authorized diner.
   */
  static issueCapabilityToken(payload: Omit<GuestCapabilityPayload, 'exp'>, ttlSeconds: number = 14400): string {
    const fullPayload: GuestCapabilityPayload = {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    };
    const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.getSecretKey())
      .update(encodedPayload)
      .digest('base64url');

    return `${encodedPayload}.${signature}`;
  }

  /**
   * Verifies an incoming GuestCapability token against cryptographic signature,
   * expiration, AND the authoritative DiningSession's current accessEpoch.
   */
  static verifyCapability(
    token: string,
    currentSession: { id: string; status: DiningSessionStatus; accessEpoch: number }
  ): GuestCapabilityPayload {
    const parts = token.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error('Invalid capability token format');
    }

    const encodedPayload = parts[0];
    const signature = parts[1];
    const expectedSignature = crypto
      .createHmac('sha256', this.getSecretKey())
      .update(encodedPayload)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      throw new Error('Cryptographic signature verification failed');
    }

    const payload: GuestCapabilityPayload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      throw new Error('Guest capability has expired');
    }

    // Session binding
    if (payload.diningSessionId !== currentSession.id) {
      throw new Error('Capability token does not belong to active table session');
    }

    // Session status
    if (currentSession.status === 'CLOSED' || currentSession.status === 'ABANDONED') {
      throw new Error('Dining session has ended');
    }

    // Access epoch revocation: if host evicted or table closed, old epoch tokens are REJECTED
    if (payload.accessEpoch !== currentSession.accessEpoch) {
      throw new Error('Capability revoked: Session epoch mismatch');
    }

    return payload;
  }

  /**
   * Sanitizes a list of session participants for guest-facing display.
   * Strips all internal IDs, email, phone, CRM tags, loyalty status, or auth tokens.
   */
  static sanitizeParticipants(
    participants: SessionParticipant[],
    currentParticipantId: string
  ): SanitizedParticipantProjection[] {
    return participants
      .filter(p => p.isActive)
      .map(p => ({
        participantId: p.id,
        displayName: p.displayName,
        role: p.role,
        isYou: p.id === currentParticipantId,
      }));
  }
}
