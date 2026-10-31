import {
  defineOrbitoXPlugin,
  OrbitoXPlugin,
  PluginRequestContext,
} from '@orbitox/plugin-engine';
import { HeadlessCrmService } from './domain/lead-actions';
import { LeadStateMachine } from './domain/lead-state-machine';
import { LeadStatus } from './domain/types';

export interface CrmDomain {
  LeadStateMachine: typeof LeadStateMachine;
}

export const crmPlugin: OrbitoXPlugin<CrmDomain, HeadlessCrmService, any> = defineOrbitoXPlugin<
  CrmDomain,
  HeadlessCrmService,
  any
>({
  manifest: {
    id: '@orbitox/crm',
    name: '@orbitox/crm',
    displayName: 'OrbitoX CRM & Lead Engine',
    version: '1.0.0',
    description: 'Headless CRM, Lead Scoring, and Opportunity Pipeline Engine',
    entitlements: {
      features: ['crm.leads', 'crm.pipelines', 'crm.scoring'],
      quotas: [
        { key: 'crm.monthly_leads', defaultLimit: 5000, window: 'monthly' },
      ],
    },
  },
  domain: {
    LeadStateMachine,
  },
  service: () => new HeadlessCrmService(),
  routes: [
    {
      method: 'GET',
      path: '/api/crm/leads',
      entitlement: {
        feature: 'crm.leads',
      },
      handler: async (ctx: PluginRequestContext<HeadlessCrmService>) => {
        const status = ctx.query?.status as LeadStatus | undefined;
        const leads = ctx.services.filterLeads(status ? { status } : {});
        return { status: 200, body: { success: true, data: leads } };
      },
    },
    {
      method: 'POST',
      path: '/api/crm/leads',
      entitlement: {
        feature: 'crm.leads',
        quotaKey: 'crm.monthly_leads',
      },
      handler: async (ctx: PluginRequestContext<HeadlessCrmService>) => {
        const lead = ctx.services.createLead(ctx.body || {});
        return { status: 201, body: { success: true, data: lead } };
      },
    },
    {
      method: 'POST',
      path: '/api/crm/leads/:id/status',
      entitlement: {
        feature: 'crm.leads',
      },
      handler: async (ctx: PluginRequestContext<HeadlessCrmService>) => {
        const leadId = ctx.params?.id || '';
        const { nextStatus } = ctx.body || {};
        try {
          const updated = ctx.services.updateLeadStatus(leadId, nextStatus);
          return { status: 200, body: { success: true, data: updated } };
        } catch (err: any) {
          return { status: 400, body: { success: false, error: err.message } };
        }
      },
    },
  ],
});

export function crm(): OrbitoXPlugin<CrmDomain, HeadlessCrmService, any> {
  return crmPlugin;
}
