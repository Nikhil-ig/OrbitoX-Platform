import { LeadStatus } from './types';
export declare class LeadStateMachine {
    static canTransition(current: LeadStatus, next: LeadStatus): boolean;
    static getNextValidStates(current: LeadStatus): LeadStatus[];
    static validateTransition(current: LeadStatus, next: LeadStatus): void;
    static calculateLeadScore(leadData: {
        email?: string;
        company?: string;
        estimatedValue?: number;
    }): number;
}
//# sourceMappingURL=lead-state-machine.d.ts.map