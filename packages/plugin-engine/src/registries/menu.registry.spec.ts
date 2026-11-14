import { MenuRegistry } from './menu.registry';

describe('MenuRegistry', () => {
  let registry: MenuRegistry;

  beforeEach(() => {
    registry = new MenuRegistry();
  });

  it('should register and retrieve menus per context', () => {
    const contextId = 'ctx-123';
    const menuItems = [
      { id: 'patients', label: 'Patients', path: '/hms' },
    ];

    registry.register(contextId, 'hms', menuItems);
    const retrieved = registry.getMenus(contextId);

    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].id).toBe('patients');
  });

  it('should return empty array for context without menus', () => {
    expect(registry.getMenus('non-existent')).toEqual([]);
  });
});
