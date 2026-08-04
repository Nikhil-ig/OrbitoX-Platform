import { LeadStateMachine } from './lead-state-machine';
import { HeadlessCrmService } from './lead-actions';

describe('LeadStateMachine & HeadlessCrmService', () => {
  it('should calculate correct lead score based on data completeness', () => {
    const score = LeadStateMachine.calculateLeadScore({
      email: 'john@acme.com',
      company: 'Acme Corp',
      estimatedValue: 15000
    });
    expect(score).toBe(100);
  });

  it('should validate valid lead status transitions', () => {
    expect(LeadStateMachine.canTransition('NEW', 'CONTACTED')).toBe(true);
    expect(LeadStateMachine.canTransition('CONTACTED', 'QUALIFIED')).toBe(true);
    expect(LeadStateMachine.canTransition('QUALIFIED', 'PROPOSAL_SENT')).toBe(true);
    expect(LeadStateMachine.canTransition('PROPOSAL_SENT', 'WON')).toBe(true);
  });

  it('should reject invalid lead status transitions', () => {
    expect(LeadStateMachine.canTransition('NEW', 'WON')).toBe(false);
    expect(() => LeadStateMachine.validateTransition('NEW', 'WON')).toThrow(
      'Invalid CRM Lead State Transition'
    );
  });

  it('should create and transition leads in HeadlessCrmService', () => {
    const service = new HeadlessCrmService();
    const lead = service.createLead({
      name: 'Test Lead',
      email: 'test@example.com',
      company: 'Test Co',
      estimatedValue: 20000
    });

    expect(lead.status).toBe('NEW');
    expect(lead.score).toBe(100);

    const updated = service.updateLeadStatus(lead.id, 'CONTACTED');
    expect(updated.status).toBe('CONTACTED');
  });
});
