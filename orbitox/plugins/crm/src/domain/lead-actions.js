"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeadlessCrmService = void 0;
const lead_state_machine_1 = require("./lead-state-machine");
class HeadlessCrmService {
    leads = [];
    constructor(initialLeads = []) {
        this.leads = [...initialLeads];
    }
    createLead(payload) {
        if (!payload.name || payload.name.trim() === '') {
            throw new Error('CRM Lead Validation Failed: Name is required.');
        }
        if (!payload.email || !payload.email.includes('@')) {
            throw new Error('CRM Lead Validation Failed: Valid email is required.');
        }
        const calculatedScore = lead_state_machine_1.LeadStateMachine.calculateLeadScore(payload);
        const newLead = {
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
    updateLeadStatus(leadId, nextStatus) {
        const currentLead = this.leads.find((l) => l.id === leadId);
        if (!currentLead) {
            throw new Error(`CRM Lead Not Found: ${leadId}`);
        }
        lead_state_machine_1.LeadStateMachine.validateTransition(currentLead.status, nextStatus);
        const updatedLead = {
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
    filterLeads(filter = {}) {
        return this.leads.filter((lead) => {
            if (filter.status && lead.status !== filter.status)
                return false;
            if (filter.assignedTo && lead.assignedTo !== filter.assignedTo)
                return false;
            if (filter.minScore !== undefined && lead.score < filter.minScore)
                return false;
            if (filter.search) {
                const query = filter.search.toLowerCase();
                const matchesName = lead.name.toLowerCase().includes(query);
                const matchesEmail = lead.email.toLowerCase().includes(query);
                const matchesCompany = lead.company?.toLowerCase().includes(query) ?? false;
                if (!matchesName && !matchesEmail && !matchesCompany)
                    return false;
            }
            return true;
        });
    }
    getLeadById(leadId) {
        return this.leads.find((l) => l.id === leadId);
    }
    generateAiSummary(leadId) {
        const lead = this.getLeadById(leadId);
        if (!lead)
            throw new Error(`Lead Not Found: ${leadId}`);
        return `[AI Summary] Lead ${lead.name} (${lead.company || 'Individual'}) has an estimated deal value of $${lead.estimatedValue.toLocaleString()} with a lead score of ${lead.score}/100. Recommended Next Action: Schedule product demo.`;
    }
}
exports.HeadlessCrmService = HeadlessCrmService;
//# sourceMappingURL=lead-actions.js.map