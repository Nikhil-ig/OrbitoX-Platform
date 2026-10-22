"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadStateMachine = void 0;
const ALLOWED_TRANSITIONS = {
    NEW: ['CONTACTED', 'LOST'],
    CONTACTED: ['QUALIFIED', 'LOST'],
    QUALIFIED: ['PROPOSAL_SENT', 'LOST'],
    PROPOSAL_SENT: ['WON', 'LOST'],
    WON: [],
    LOST: ['NEW'] // Allow reopening lost leads
};
class LeadStateMachine {
    static canTransition(current, next) {
        return ALLOWED_TRANSITIONS[current]?.includes(next) ?? false;
    }
    static getNextValidStates(current) {
        return ALLOWED_TRANSITIONS[current] || [];
    }
    static validateTransition(current, next) {
        if (!this.canTransition(current, next)) {
            throw new Error(`Invalid CRM Lead State Transition: Cannot move lead from ${current} to ${next}`);
        }
    }
    static calculateLeadScore(leadData) {
        let score = 10;
        if (leadData.email && leadData.email.includes('@'))
            score += 20;
        if (leadData.company)
            score += 30;
        if (leadData.estimatedValue && leadData.estimatedValue > 10000)
            score += 40;
        return score;
    }
}
exports.LeadStateMachine = LeadStateMachine;
//# sourceMappingURL=lead-state-machine.js.map