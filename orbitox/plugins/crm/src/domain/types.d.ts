export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL_SENT' | 'WON' | 'LOST';
export interface Lead {
    id: string;
    name: string;
    email: string;
    company?: string;
    phone?: string;
    status: LeadStatus;
    estimatedValue: number;
    score: number;
    assignedTo?: string;
    customFields?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface CreateLeadPayload {
    name: string;
    email: string;
    company?: string;
    phone?: string;
    estimatedValue?: number;
    assignedTo?: string;
    customFields?: Record<string, unknown>;
}
export interface UpdateLeadPayload {
    name?: string;
    email?: string;
    company?: string;
    phone?: string;
    estimatedValue?: number;
    assignedTo?: string;
    customFields?: Record<string, unknown>;
}
export interface LeadFilter {
    status?: LeadStatus;
    search?: string;
    assignedTo?: string;
    minScore?: number;
}
//# sourceMappingURL=types.d.ts.map