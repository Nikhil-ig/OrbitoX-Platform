import { Lead, LeadStatus, CreateLeadPayload, LeadFilter } from './types';
export declare class HeadlessCrmService {
    private leads;
    constructor(initialLeads?: Lead[]);
    createLead(payload: CreateLeadPayload): Lead;
    updateLeadStatus(leadId: string, nextStatus: LeadStatus): Lead;
    filterLeads(filter?: LeadFilter): Lead[];
    getLeadById(leadId: string): Lead | undefined;
    generateAiSummary(leadId: string): string;
}
//# sourceMappingURL=lead-actions.d.ts.map