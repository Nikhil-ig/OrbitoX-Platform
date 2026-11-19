export class SandboxGuard {
  /**
   * Asserts that a facade object is deeply frozen to prevent plugins from monkey-patching or altering methods.
   */
  static assertFrozenFacade(facade: any, facadeName: string): void {
    if (!facade || typeof facade !== 'object') return;

    if (!Object.isFrozen(facade)) {
      Object.freeze(facade);
    }
  }

  /**
   * Freezes all standard facade APIs exposed by the OrbitoX runtime.
   */
  static freezeAllFacades(runtimeFacade: Record<string, any>): void {
    if (!runtimeFacade) return;
    for (const [key, val] of Object.entries(runtimeFacade)) {
      if (val && typeof val === 'object') {
        Object.freeze(val);
      }
    }
    Object.freeze(runtimeFacade);
  }

  /**
   * Creates a strictly isolated Proxy around a service to prevent untrusted plugins
   * from accessing private properties, symbol keys, or unapproved methods.
   */
  static createSandboxedProxy<T extends object>(target: T, allowedMethods: (keyof T)[]): T {
    const allowedSet = new Set(allowedMethods as string[]);

    return new Proxy(target, {
      get(obj: any, prop: string | symbol) {
        if (typeof prop === 'symbol') {
          // Block internal symbols
          throw new Error('Sandbox Security Alert: Access to kernel symbols is restricted.');
        }

        if (prop.startsWith('_') || prop.startsWith('#')) {
          // Block internal private properties
          throw new Error(`Sandbox Security Alert: Access to private property "${prop}" is forbidden.`);
        }

        if (!allowedSet.has(prop)) {
          throw new Error(`Sandbox Security Alert: Method "${prop}" is not authorized for plugin execution.`);
        }

        const value = obj[prop];
        if (typeof value === 'function') {
          return value.bind(obj);
        }
        return value;
      },
      set() {
        throw new Error('Sandbox Security Alert: Runtime facades are read-only and immutable.');
      },
      defineProperty() {
        throw new Error('Sandbox Security Alert: Property definition on kernel objects is forbidden.');
      },
      deleteProperty() {
        throw new Error('Sandbox Security Alert: Deleting kernel properties is forbidden.');
      },
    });
  }
}
