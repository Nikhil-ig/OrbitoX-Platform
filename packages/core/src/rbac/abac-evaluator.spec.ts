import { AbacEvaluator } from './abac-evaluator';

describe('AbacEvaluator', () => {
  it('should allow access if user is admin in the same tenant', () => {
    const user = { userId: 'u1', roles: ['admin'], tenantId: 'tenant-1' };
    const resource = { resourceType: 'crm.lead', resourceId: 'r1', tenantId: 'tenant-1' };
    expect(AbacEvaluator.canAccess(user, resource, 'read')).toBe(true);
  });

  it('should deny access if cross-tenant isolation is violated', () => {
    const user = { userId: 'u1', roles: ['admin'], tenantId: 'tenant-1' };
    const resource = { resourceType: 'crm.lead', resourceId: 'r1', tenantId: 'tenant-2' };
    expect(AbacEvaluator.canAccess(user, resource, 'read')).toBe(false);
  });

  it('should allow access if user is resource owner or assigned', () => {
    const user = { userId: 'u1', roles: ['user'], tenantId: 'tenant-1' };
    const resource = { resourceType: 'crm.lead', resourceId: 'r1', assignedTo: 'u1', tenantId: 'tenant-1' };
    expect(AbacEvaluator.canAccess(user, resource, 'update')).toBe(true);
  });
});
