export const crmTemplate = `import { OrbitoXConfig } from '@orbitox/runtime';

const config: OrbitoXConfig = {
  app: {
    name: 'OrbitoX CRM',
    port: 3000
  },
  entities: [
    {
      id: 'lead',
      name: 'Lead',
      fields: [
        { name: 'firstName', type: 'text', required: true },
        { name: 'lastName', type: 'text', required: true },
        { name: 'email', type: 'text', required: true },
        { name: 'status', type: 'enum', options: ['new', 'contacted', 'qualified', 'lost'] }
      ]
    },
    {
      id: 'deal',
      name: 'Deal',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'amount', type: 'number', required: true },
        { name: 'stage', type: 'enum', options: ['prospecting', 'negotiation', 'closed_won', 'closed_lost'] }
      ]
    }
  ]
};

export default config;
`;
