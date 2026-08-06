export const ecommerceTemplate = `import { OrbitoXConfig } from '@orbitox/runtime';

const config: OrbitoXConfig = {
  app: {
    name: 'E-Commerce Platform',
    port: 3000
  },
  entities: [
    {
      id: 'product',
      name: 'Product',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'price', type: 'number', required: true },
        { name: 'inStock', type: 'boolean', default: true }
      ]
    },
    {
      id: 'order',
      name: 'Order',
      fields: [
        { name: 'totalAmount', type: 'number', required: true },
        { name: 'status', type: 'enum', options: ['pending', 'shipped', 'delivered'] }
      ]
    }
  ]
};

export default config;
`;
