import { LeadStatus } from './types';

const ALLOWED_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ['CONTACTED', 'LOST'],
  CONTACTED: ['QUALIFIED', 'LOST'],
  QUALIFIED: ['PROPOSAL_SENT', 'LOST'],
  PROPOSAL_SENT: ['WON', 'LOST'],
  WON: [],
  LOST: ['NEW'] // Allow reopening lost leads
};

export class LeadStateMachine {
  static canTransition(current: LeadStatus, next: LeadStatus): boolean {
    return ALLOWED_TRANSITIONS[current]?.includes(next) ?? false;
  }

  static getNextValidStates(current: LeadStatus): LeadStatus[] {
    return ALLOWED_TRANSITIONS[current] || [];
  }

  static validateTransition(current: LeadStatus, next: LeadStatus): void {
    if (!this.canTransition(current, next)) {
      throw new Error(`Invalid CRM Lead State Transition: Cannot move lead from ${current} to ${next}`);
    }
  }

  static calculateLeadScore(leadData: { email?: string; company?: string; estimatedValue?: number }): number {
    let score = 10;
    if (leadData.email && leadData.email.includes('@')) score += 20;
    if (leadData.company) score += 30;
    if (leadData.estimatedValue && leadData.estimatedValue > 10000) score += 40;
    return score;
  }
}
