export const hmsTemplate = `import { OrbitoXConfig } from '@orbitox/runtime';

const config: OrbitoXConfig = {
  app: {
    name: 'Hospital Management System',
    port: 3000
  },
  entities: [
    {
      id: 'patient',
      name: 'Patient',
      fields: [
        { name: 'firstName', type: 'text', required: true },
        { name: 'lastName', type: 'text', required: true },
        { name: 'dob', type: 'date', required: true },
        { name: 'gender', type: 'enum', options: ['male', 'female', 'other'] }
      ]
    },
    {
      id: 'appointment',
      name: 'Appointment',
      fields: [
        { name: 'doctorId', type: 'text', required: true },
        { name: 'date', type: 'date', required: true },
        { name: 'status', type: 'enum', options: ['scheduled', 'completed', 'cancelled'] }
      ]
    }
  ]
};

export default config;
`;
