import { HeadlessCrmService, Lead, LeadStatus } from '@orbitox-io/crm';
import {
  Experience,
  ExperienceGuest,
  ExperienceWish,
  ShagunContribution,
  EventPoll,
} from './types';

export type CelebrationsEventType =
  | 'rsvp.created'
  | 'wish.created'
  | 'shagun.received'
  | 'guest.checked_in'
  | 'poll.voted'
  | 'crm.status_updated'
  | 'webhook.dispatched'
  | 'experience.created'
  | 'experience.published'
  | 'theme.switched';

export interface CelebrationsEvent<T = unknown> {
  id: string;
  type: CelebrationsEventType;
  tenantId: string;
  experienceId: string;
  payload: T;
  timestamp: string;
}

export type CelebrationsEventListener<T = unknown> = (event: CelebrationsEvent<T>) => void;

/**
 * Universal Interconnect Service linking Celebrations with OrbitoX CRM,
 * Commerce, and Zero-Trust Multi-Tenancy.
 */
export class CelebrationsInterconnect {
  private static instance: CelebrationsInterconnect;
  private crmService: HeadlessCrmService;
  private listeners: Map<CelebrationsEventType, CelebrationsEventListener[]> = new Map();
  private auditLog: CelebrationsEvent[] = [];
  private shagunContributions: ShagunContribution[] = [];
  private eventPolls: Map<string, EventPoll[]> = new Map();

  constructor(crmService = new HeadlessCrmService()) {
    this.crmService = crmService;
  }

  static getInstance(): CelebrationsInterconnect {
    if (!CelebrationsInterconnect.instance) {
      CelebrationsInterconnect.instance = new CelebrationsInterconnect();
    }
    return CelebrationsInterconnect.instance;
  }

  /**
   * Subscribe to platform celebration events
   */
  subscribe<T>(type: CelebrationsEventType, listener: CelebrationsEventListener<T>): () => void {
    const existing = this.listeners.get(type) || [];
    existing.push(listener as CelebrationsEventListener);
    this.listeners.set(type, existing);

    return () => {
      const updated = (this.listeners.get(type) || []).filter((l) => l !== listener);
      this.listeners.set(type, updated);
    };
  }

  /**
   * Dispatch platform celebration event to all subscribers and write audit log
   */
  dispatch<T>(event: Omit<CelebrationsEvent<T>, 'id' | 'timestamp'>): CelebrationsEvent<T> {
    const fullEvent: CelebrationsEvent<T> = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };

    this.auditLog.unshift(fullEvent as CelebrationsEvent);

    const handlers = this.listeners.get(event.type) || [];
    handlers.forEach((handler) => {
      try {
        handler(fullEvent);
      } catch (err) {
        console.error(`[CelebrationsInterconnect] Error in handler for ${event.type}:`, err);
      }
    });

    return fullEvent;
  }

  /**
   * INTERCONNECT: Auto-Sync RSVP to OrbitoX CRM as a High-Scoring Lead
   */
  syncRsvpToCrm(
    guest: ExperienceGuest,
    experience: { id: string; title: string; occasionSlug: string }
  ): Lead {
    const isAttending = guest.attending === 'ATTENDING';
    const email =
      guest.email && guest.email.includes('@')
        ? guest.email.trim()
        : `${guest.guestName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'guest'}@celebrate.orbitox.io`;

    // Calculate value based on party size & attendance
    const estimatedValue = isAttending ? (guest.partySize || 1) * 7500 : 0;

    const lead = this.crmService.createLead({
      name: guest.guestName,
      email,
      company: `${experience.title} (${experience.occasionSlug.toUpperCase()})`,
      phone: guest.phone,
      estimatedValue,
      customFields: {
        guestId: guest.id,
        experienceId: experience.id,
        attending: guest.attending,
        partySize: guest.partySize,
        dietary: guest.dietaryRequirements,
        message: guest.message,
        syncedVia: 'OrbitoX Celebrations Engine',
      },
    });

    // Notify event bus
    this.dispatch({
      type: 'rsvp.created',
      tenantId: guest.tenantId,
      experienceId: experience.id,
      payload: { guest, lead },
    });

    return lead;
  }

  /**
   * INTERCONNECT: Record guest wish & publish event
   */
  syncWish(wish: ExperienceWish, experienceId: string, tenantId: string): void {
    this.dispatch({
      type: 'wish.created',
      tenantId,
      experienceId,
      payload: wish,
    });
  }

  /**
   * Get CRM Leads associated with a celebration
   */
  getCelebrationLeads(experienceId: string): Lead[] {
    return this.crmService.filterLeads().filter((l: Lead) => {
      const custom = l.customFields as Record<string, unknown> | undefined;
      return custom?.experienceId === experienceId;
    });
  }

  /**
   * INTERCONNECT: Process Digital Shagun / Cash Gift via Commerce
   */
  processShagunGift(contribution: ShagunContribution): ShagunContribution {
    this.shagunContributions.unshift(contribution);

    this.dispatch({
      type: 'shagun.received',
      tenantId: contribution.tenantId,
      experienceId: contribution.experienceId,
      payload: contribution,
    });

    return contribution;
  }

  /**
   * Get Shagun contributions for an experience
   */
  getShagunContributions(experienceId?: string): ShagunContribution[] {
    if (!experienceId) return [...this.shagunContributions];
    return this.shagunContributions.filter((s) => s.experienceId === experienceId);
  }

  /**
   * Total Shagun amount collected
   */
  getTotalShagunAmount(experienceId?: string): number {
    return this.getShagunContributions(experienceId).reduce((sum, s) => sum + s.amount, 0);
  }

  /**
   * Bi-directional CRM: Update Lead status in CRM pipeline
   */
  updateLeadPipelineStatus(leadId: string, status: LeadStatus): Lead {
    const updated = this.crmService.updateLeadStatus(leadId, status);
    const custom = (updated.customFields || {}) as Record<string, unknown>;

    this.dispatch({
      type: 'crm.status_updated',
      tenantId: (custom.tenantId as string) || 'default',
      experienceId: (custom.experienceId as string) || 'default',
      payload: updated,
    });

    return updated;
  }

  /**
   * Get CRM pipeline breakdown for a celebration
   */
  getCrmPipelineSummary(experienceId?: string): {
    totalValue: number;
    leadsByStatus: Record<LeadStatus, number>;
    totalLeads: number;
  } {
    const allLeads = experienceId
      ? this.getCelebrationLeads(experienceId)
      : this.crmService.filterLeads();

    const leadsByStatus: Record<LeadStatus, number> = {
      NEW: 0,
      CONTACTED: 0,
      QUALIFIED: 0,
      PROPOSAL_SENT: 0,
      WON: 0,
      LOST: 0,
    };

    let totalValue = 0;
    allLeads.forEach((l) => {
      leadsByStatus[l.status] = (leadsByStatus[l.status] || 0) + 1;
      totalValue += l.estimatedValue || 0;
    });

    return {
      totalValue,
      leadsByStatus,
      totalLeads: allLeads.length,
    };
  }

  /**
   * Concierge Gate Check-In for attending guests
   */
  checkInGuest(guestId: string, experienceId: string, tenantId: string): boolean {
    this.dispatch({
      type: 'guest.checked_in',
      tenantId,
      experienceId,
      payload: { guestId, checkedInAt: new Date().toISOString() },
    });
    return true;
  }

  /**
   * Get interactive polls for an experience
   */
  getPolls(experienceId: string): EventPoll[] {
    if (!this.eventPolls.has(experienceId)) {
      this.eventPolls.set(experienceId, [
        {
          id: 'poll_1',
          question: 'Who fell in love first?',
          totalVotes: 87,
          options: [
            { id: 'opt_1', text: 'Aarav (Love at first sight!)', votes: 54, icon: '🤵' },
            { id: 'opt_2', text: 'Meera (She just hid it better!)', votes: 33, icon: '👰' },
          ],
        },
        {
          id: 'poll_2',
          question: 'Which side will bring more fire to the Sangeet dance floor?',
          totalVotes: 142,
          options: [
            { id: 'opt_3', text: 'Team Groom 💥', votes: 68, icon: '🕺' },
            { id: 'opt_4', text: 'Team Bride ✨', votes: 74, icon: '💃' },
          ],
        },
      ]);
    }
    return this.eventPolls.get(experienceId) || [];
  }

  /**
   * Cast a vote on a live event poll
   */
  votePoll(experienceId: string, pollId: string, optionId: string): EventPoll {
    const polls = this.getPolls(experienceId);
    const targetPoll = polls.find((p) => p.id === pollId);
    if (!targetPoll) throw new Error(`Poll ${pollId} not found`);

    const option = targetPoll.options.find((o) => o.id === optionId);
    if (!option) throw new Error(`Option ${optionId} not found`);

    option.votes += 1;
    targetPoll.totalVotes += 1;

    this.dispatch({
      type: 'poll.voted',
      tenantId: 'default',
      experienceId,
      payload: { pollId, optionId, totalVotes: targetPoll.totalVotes },
    });

    return targetPoll;
  }

  /**
   * Outbound notification webhook simulator
   */
  simulateWebhookDispatch(
    channel: 'whatsapp' | 'sms' | 'email',
    payload: Record<string, unknown>
  ): {
    status: 'DELIVERED';
    trackingId: string;
    channel: string;
    timestamp: string;
  } {
    const trackingId = `ox_wh_${channel}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const event = {
      status: 'DELIVERED' as const,
      trackingId,
      channel,
      timestamp: new Date().toISOString(),
      payload,
    };

    this.dispatch({
      type: 'webhook.dispatched',
      tenantId: 'default',
      experienceId: 'default',
      payload: event,
    });

    return event;
  }

  /**
   * Query event audit logs
   */
  getAuditLog(experienceId?: string): CelebrationsEvent[] {
    if (!experienceId) return [...this.auditLog];
    return this.auditLog.filter((e) => e.experienceId === experienceId);
  }
}
