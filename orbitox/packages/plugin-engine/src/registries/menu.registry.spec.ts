import { MenuRegistry } from './menu.registry';

describe('MenuRegistry', () => {
  let registry: MenuRegistry;

  beforeEach(() => {
    registry = new MenuRegistry();
  });

  it('should register and retrieve menus per context', () => {
    const contextId = 'ctx-123';
    const menuItems = [
      { id: 'leads', label: 'Leads', path: '/crm/leads' },
    ];

    registry.register(contextId, 'crm', menuItems);
    const retrieved = registry.getMenus(contextId);

    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].id).toBe('leads');
  });

  it('should return empty array for context without menus', () => {
    expect(registry.getMenus('non-existent')).toEqual([]);
  });
});
