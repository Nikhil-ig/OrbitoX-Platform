export const restaurantTemplate = `import { OrbitoXConfig } from '@orbitox/runtime';

const config: OrbitoXConfig = {
  app: {
    name: 'Restaurant OS',
    port: 3000
  },
  entities: [
    {
      id: 'menu_item',
      name: 'Menu Item',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'price', type: 'number', required: true },
        { name: 'category', type: 'enum', options: ['appetizer', 'main', 'dessert'] },
        { name: 'available', type: 'boolean', default: true }
      ]
    },
    {
      id: 'table',
      name: 'Table',
      fields: [
        { name: 'number', type: 'number', required: true },
        { name: 'capacity', type: 'number', required: true },
        { name: 'status', type: 'enum', options: ['available', 'occupied', 'reserved'] }
      ]
    }
  ]
};

export default config;
`;
