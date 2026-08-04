import { Lead, LeadStatus, CreateLeadPayload, LeadFilter } from './types';
import { LeadStateMachine } from './lead-state-machine';

export class HeadlessCrmService {
  private leads: Lead[] = [];

  constructor(initialLeads: Lead[] = []) {
    this.leads = [...initialLeads];
  }

  createLead(payload: CreateLeadPayload): Lead {
    if (!payload.name || payload.name.trim() === '') {
      throw new Error('CRM Lead Validation Failed: Name is required.');
    }
    if (!payload.email || !payload.email.includes('@')) {
      throw new Error('CRM Lead Validation Failed: Valid email is required.');
    }

    const calculatedScore = LeadStateMachine.calculateLeadScore(payload);

    const newLead: Lead = {
      id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: payload.name.trim(),
      email: payload.email.trim(),
      company: payload.company?.trim(),
      phone: payload.phone?.trim(),
      status: 'NEW',
      estimatedValue: payload.estimatedValue || 0,
      score: calculatedScore,
      assignedTo: payload.assignedTo,
      customFields: payload.customFields || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.leads.unshift(newLead);
    return newLead;
  }

  updateLeadStatus(leadId: string, nextStatus: LeadStatus): Lead {
    const currentLead = this.leads.find((l) => l.id === leadId);
    if (!currentLead) {
      throw new Error(`CRM Lead Not Found: ${leadId}`);
    }

    LeadStateMachine.validateTransition(currentLead.status, nextStatus);

    const updatedLead: Lead = {
      ...currentLead,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    };

    const leadIndex = this.leads.findIndex((l) => l.id === leadId);
    if (leadIndex !== -1) {
      this.leads[leadIndex] = updatedLead;
    }

    return updatedLead;
  }

  filterLeads(filter: LeadFilter = {}): Lead[] {
    return this.leads.filter((lead) => {
      if (filter.status && lead.status !== filter.status) return false;
      if (filter.assignedTo && lead.assignedTo !== filter.assignedTo) return false;
      if (filter.minScore !== undefined && lead.score < filter.minScore) return false;
      if (filter.search) {
        const query = filter.search.toLowerCase();
        const matchesName = lead.name.toLowerCase().includes(query);
        const matchesEmail = lead.email.toLowerCase().includes(query);
        const matchesCompany = lead.company?.toLowerCase().includes(query) ?? false;
        if (!matchesName && !matchesEmail && !matchesCompany) return false;
      }
      return true;
    });
  }

  getLeadById(leadId: string): Lead | undefined {
    return this.leads.find((l) => l.id === leadId);
  }

  generateAiSummary(leadId: string): string {
    const lead = this.getLeadById(leadId);
    if (!lead) throw new Error(`Lead Not Found: ${leadId}`);
    return `[AI Summary] Lead ${lead.name} (${lead.company || 'Individual'}) has an estimated deal value of $${lead.estimatedValue.toLocaleString()} with a lead score of ${lead.score}/100. Recommended Next Action: Schedule product demo.`;
  }
}
