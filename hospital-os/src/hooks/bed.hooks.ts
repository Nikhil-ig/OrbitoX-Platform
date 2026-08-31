import { orbitox } from '@orbitox/runtime';

export const bedHooks = {
  beforeCreate: async (payload: any) => {
    // Validate temporary surge bed expiration
    if (payload.isTemporary && !payload.surgeConfig) {
      payload.surgeConfig = {
        reason: 'Emergency Surge Overflow',
        autoDecommissionOnDischarge: true,
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString()
      };
    }
    return payload;
  },

  afterUpdate: async (record: any, context: any) => {
    // If bed is transitioning to sanitizing, notify housekeeping
    if (record.status === 'sanitizing') {
      await orbitox.events.emit('housekeeping.dispatch', {
        bedId: record.id,
        bedLabel: record.label,
        wardId: record.wardId
      }, context.id);
    }
  }
};
