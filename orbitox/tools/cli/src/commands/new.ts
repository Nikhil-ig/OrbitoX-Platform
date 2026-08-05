import * as fs from 'fs';
import * as path from 'path';

/**
 * `orbitox new <plugin-name>` — Scaffolds a fully production-ready,
 * dual-architecture (frontend headless domain + NestJS backend) plugin workspace.
 * 
 * The generated structure exactly mirrors existing plugins like @orbitox/crm.
 */
export function commandNew(args: string[]): void {
  const pluginName = args[0];
  if (!pluginName) {
    console.error('❌ Error: Please specify a plugin name (e.g., orbitox new tickets)');
    process.exit(1);
  }

  // Validate name format: lowercase, alphanumeric, hyphens only
  if (!/^[a-z][a-z0-9-]*$/.test(pluginName)) {
    console.error('❌ Error: Plugin name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens.');
    process.exit(1);
  }

  const rootDir = process.cwd();
  const pluginDir = path.join(rootDir, 'plugins', pluginName);

  if (fs.existsSync(pluginDir)) {
    console.error(`❌ Error: Plugin directory already exists at plugins/${pluginName}`);
    process.exit(1);
  }

  console.log(`\n🚀 Scaffolding OrbitoX Plugin: @orbitox/${pluginName}\n`);

  // Derive names for code generation
  const pascalName = toPascalCase(pluginName);   // e.g. "tickets" -> "Tickets"
  const entityName = toEntityName(pluginName);     // e.g. "tickets" -> "Ticket" (singular)
  const entityPascal = toPascalCase(entityName);
  const entityLower = entityName.toLowerCase();

  // Create directory structure
  const dirs = [
    '',
    'src',
    'src/domain',
    'src/react',
    'backend',
    'backend/src',
  ];
  for (const dir of dirs) {
    fs.mkdirSync(path.join(pluginDir, dir), { recursive: true });
  }
  logCreated('Directory structure');

  // 1. manifest.json
  writeFile(pluginDir, 'manifest.json', generateManifest(pluginName, pascalName, entityLower));
  logCreated('manifest.json');

  // 2. package.json (frontend domain)
  writeFile(pluginDir, 'package.json', generatePackageJson(pluginName));
  logCreated('package.json');

  // 3. tsconfig.json (frontend)
  writeFile(pluginDir, 'tsconfig.json', generateTsconfig());
  logCreated('tsconfig.json');

  // 4. jest.config.js
  writeFile(pluginDir, 'jest.config.js', generateJestConfig());
  logCreated('jest.config.js');

  // 5. src/index.ts
  writeFile(pluginDir, 'src/index.ts', generateSrcIndex(entityLower, pluginName));
  logCreated('src/index.ts');

  // 6. src/domain/types.ts
  writeFile(pluginDir, 'src/domain/types.ts', generateDomainTypes(entityPascal));
  logCreated('src/domain/types.ts');

  // 7. src/domain/<entity>-state-machine.ts
  writeFile(pluginDir, `src/domain/${entityLower}-state-machine.ts`, generateStateMachine(entityPascal));
  logCreated(`src/domain/${entityLower}-state-machine.ts`);

  // 8. src/domain/<entity>-actions.ts
  writeFile(pluginDir, `src/domain/${entityLower}-actions.ts`, generateActions(entityPascal, entityLower, pluginName));
  logCreated(`src/domain/${entityLower}-actions.ts`);

  // 9. src/react/index.ts
  writeFile(pluginDir, 'src/react/index.ts', `export * from './use-${pluginName}';\n`);
  logCreated('src/react/index.ts');

  // 10. src/react/use-<plugin>.ts
  writeFile(pluginDir, `src/react/use-${pluginName}.ts`, generateReactHook(entityPascal, entityLower, pluginName));
  logCreated(`src/react/use-${pluginName}.ts`);

  // 11. backend/package.json
  writeFile(pluginDir, 'backend/package.json', generateBackendPackageJson(pluginName));
  logCreated('backend/package.json');

  // 12. backend/tsconfig.json
  writeFile(pluginDir, 'backend/tsconfig.json', generateBackendTsconfig());
  logCreated('backend/tsconfig.json');

  // 13. backend/src/index.ts
  writeFile(pluginDir, 'backend/src/index.ts', generateBackendIndex(pluginName));
  logCreated('backend/src/index.ts');

  // 14. backend/src/<plugin>.module.ts
  writeFile(pluginDir, `backend/src/${pluginName}.module.ts`, generateBackendModule(pascalName, pluginName));
  logCreated(`backend/src/${pluginName}.module.ts`);

  // 15. backend/src/<plugin>.service.ts
  writeFile(pluginDir, `backend/src/${pluginName}.service.ts`, generateBackendService(pascalName, entityLower));
  logCreated(`backend/src/${pluginName}.service.ts`);

  console.log(`\n🎉 Plugin @orbitox/${pluginName} scaffolded successfully!`);
  console.log(`\n   Next steps:`);
  console.log(`   1. pnpm install              (install workspace dependencies)`);
  console.log(`   2. pnpm --filter @orbitox/${pluginName} build`);
  console.log(`   3. pnpm --filter @orbitox/${pluginName} test\n`);
}

// ─── Helpers ──────────────────────────────────────────────────

function writeFile(base: string, relative: string, content: string): void {
  fs.writeFileSync(path.join(base, relative), content, 'utf-8');
}

function logCreated(name: string): void {
  console.log(`   ✅ ${name}`);
}

function toPascalCase(str: string): string {
  return str.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

function toEntityName(pluginName: string): string {
  // Simple singularization: "tickets" -> "ticket", "inventory" -> "item"
  if (pluginName.endsWith('s') && !pluginName.endsWith('ss')) {
    return pluginName.slice(0, -1);
  }
  return pluginName;
}

// ─── Template Generators ──────────────────────────────────────

function generateManifest(pluginName: string, pascalName: string, entityLower: string): string {
  return JSON.stringify({
    id: pluginName,
    name: `@orbitox/${pluginName}`,
    version: '1.0.0',
    displayName: pascalName,
    description: `Headless domain engine for ${pascalName}`,
    icon: 'box',
    category: 'business',
    author: 'OrbitoX Developer',
    permissions: [
      `${pluginName}.${entityLower}s.create`,
      `${pluginName}.${entityLower}s.read`,
      `${pluginName}.${entityLower}s.update`,
      `${pluginName}.${entityLower}s.delete`,
    ],
    menus: [
      {
        id: `${pluginName}-root`,
        label: pascalName,
        icon: 'box',
        sortOrder: 200,
        children: [
          {
            id: `${pluginName}-${entityLower}s`,
            label: `${toPascalCase(entityLower)}s`,
            path: `/${pluginName}/${entityLower}s`,
            permission: `${pluginName}.${entityLower}s.read`,
          },
        ],
      },
    ],
    pages: [
      {
        id: `${pluginName}-${entityLower}s`,
        path: `/${pluginName}/${entityLower}s`,
        component: `${toPascalCase(entityLower)}sListPage`,
      },
    ],
    widgets: [
      {
        id: `${pluginName}.${entityLower}s.count`,
        title: `Total ${toPascalCase(entityLower)}s`,
        size: '1x1',
      },
    ],
  }, null, 2) + '\n';
}

function generatePackageJson(pluginName: string): string {
  return JSON.stringify({
    name: `@orbitox/${pluginName}`,
    version: '0.1.0',
    description: `Headless ${toPascalCase(pluginName)} domain core package providing UI-agnostic business actions, state machines, and hooks.`,
    main: './dist/index.js',
    module: './dist/index.mjs',
    types: './dist/index.d.ts',
    exports: {
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.mjs',
        require: './dist/index.js',
      },
      './react': {
        types: './dist/react/index.d.ts',
        import: './dist/react/index.mjs',
        require: './dist/react/index.js',
      },
    },
    scripts: {
      build: 'tsc --build',
      clean: 'rm -rf dist',
      test: 'jest --passWithNoTests',
    },
    dependencies: {
      '@orbitox/types': 'workspace:*',
      '@orbitox/utils': 'workspace:*',
    },
    peerDependencies: {
      react: '^18.0.0 || ^19.0.0',
    },
    devDependencies: {
      '@orbitox/jest-config': 'workspace:*',
      '@types/jest': '^29.0.0',
      '@types/node': '^20.0.0',
      '@types/react': '^19.0.0',
      jest: '^29.0.0',
      'ts-jest': '^29.0.0',
      react: '^19.0.0',
      typescript: '^5.0.0',
    },
  }, null, 2) + '\n';
}

function generateTsconfig(): string {
  return JSON.stringify({
    extends: '../../tsconfig.base.json',
    compilerOptions: {
      outDir: './dist',
      rootDir: './src',
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      jsx: 'react-jsx',
    },
    include: ['src/**/*'],
  }, null, 2) + '\n';
}

function generateJestConfig(): string {
  return `const baseConfig = require('@orbitox/jest-config');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  rootDir: '.',
};
`;
}

function generateSrcIndex(entityLower: string, pluginName: string): string {
  return `export * from './domain/types';
export * from './domain/${entityLower}-state-machine';
export * from './domain/${entityLower}-actions';
export * from './react/use-${pluginName}';
`;
}

function generateDomainTypes(entityPascal: string): string {
  return `export type ${entityPascal}Status = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface ${entityPascal} {
  id: string;
  name: string;
  description?: string;
  status: ${entityPascal}Status;
  contextId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Create${entityPascal}Payload {
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface Update${entityPascal}Payload {
  name?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface ${entityPascal}Filter {
  status?: ${entityPascal}Status;
  search?: string;
}
`;
}

function generateStateMachine(entityPascal: string): string {
  return `import { ${entityPascal}Status } from './types';

const ALLOWED_TRANSITIONS: Record<${entityPascal}Status, ${entityPascal}Status[]> = {
  DRAFT: ['ACTIVE', 'ARCHIVED'],
  ACTIVE: ['ARCHIVED'],
  ARCHIVED: ['DRAFT'], // Allow re-drafting archived items
};

export class ${entityPascal}StateMachine {
  static canTransition(current: ${entityPascal}Status, next: ${entityPascal}Status): boolean {
    return ALLOWED_TRANSITIONS[current]?.includes(next) ?? false;
  }

  static getNextValidStates(current: ${entityPascal}Status): ${entityPascal}Status[] {
    return ALLOWED_TRANSITIONS[current] || [];
  }

  static validateTransition(current: ${entityPascal}Status, next: ${entityPascal}Status): void {
    if (!this.canTransition(current, next)) {
      throw new Error(\`Invalid State Transition: Cannot move from \${current} to \${next}\`);
    }
  }
}
`;
}

function generateActions(entityPascal: string, entityLower: string, pluginName: string): string {
  return `import { ${entityPascal}, ${entityPascal}Status, Create${entityPascal}Payload, ${entityPascal}Filter } from './types';
import { ${entityPascal}StateMachine } from './${entityLower}-state-machine';

export class Headless${toPascalCase(pluginName)}Service {
  private items: ${entityPascal}[] = [];

  constructor(initialItems: ${entityPascal}[] = []) {
    this.items = [...initialItems];
  }

  create(payload: Create${entityPascal}Payload, contextId: string): ${entityPascal} {
    if (!payload.name || payload.name.trim() === '') {
      throw new Error('Validation Failed: Name is required.');
    }

    const newItem: ${entityPascal} = {
      id: \`${entityLower}_\${Date.now()}_\${Math.random().toString(36).substring(2, 7)}\`,
      name: payload.name.trim(),
      description: payload.description?.trim(),
      status: 'DRAFT',
      contextId,
      metadata: payload.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.items.unshift(newItem);
    return newItem;
  }

  updateStatus(itemId: string, nextStatus: ${entityPascal}Status): ${entityPascal} {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) {
      throw new Error(\`Not Found: \${itemId}\`);
    }

    ${entityPascal}StateMachine.validateTransition(item.status, nextStatus);

    const updated: ${entityPascal} = {
      ...item,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };

    const idx = this.items.findIndex((i) => i.id === itemId);
    if (idx !== -1) {
      this.items[idx] = updated;
    }

    return updated;
  }

  filter(filter: ${entityPascal}Filter = {}): ${entityPascal}[] {
    return this.items.filter((item) => {
      if (filter.status && item.status !== filter.status) return false;
      if (filter.search) {
        const query = filter.search.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDesc = item.description?.toLowerCase().includes(query) ?? false;
        if (!matchesName && !matchesDesc) return false;
      }
      return true;
    });
  }

  getById(itemId: string): ${entityPascal} | undefined {
    return this.items.find((i) => i.id === itemId);
  }
}
`;
}

function generateReactHook(entityPascal: string, entityLower: string, pluginName: string): string {
  return `import { useState, useCallback } from 'react';
import { ${entityPascal}, ${entityPascal}Status, Create${entityPascal}Payload, ${entityPascal}Filter } from '../domain/types';
import { Headless${toPascalCase(pluginName)}Service } from '../domain/${entityLower}-actions';
import { ${entityPascal}StateMachine } from '../domain/${entityLower}-state-machine';

const defaultService = new Headless${toPascalCase(pluginName)}Service([]);

export function use${toPascalCase(pluginName)}(filter: ${entityPascal}Filter = {}) {
  const [service] = useState(() => defaultService);
  const [items, setItems] = useState<${entityPascal}[]>(() => service.filter(filter));

  const refresh = useCallback(() => {
    setItems(service.filter(filter));
  }, [service, filter]);

  return { items, refresh };
}

export function use${toPascalCase(pluginName)}Actions() {
  const [service] = useState(() => defaultService);

  const create = useCallback((payload: Create${entityPascal}Payload, contextId: string): ${entityPascal} => {
    return service.create(payload, contextId);
  }, [service]);

  const updateStatus = useCallback((itemId: string, nextStatus: ${entityPascal}Status): ${entityPascal} => {
    return service.updateStatus(itemId, nextStatus);
  }, [service]);

  const canTransition = useCallback((current: ${entityPascal}Status, next: ${entityPascal}Status): boolean => {
    return ${entityPascal}StateMachine.canTransition(current, next);
  }, []);

  return { create, updateStatus, canTransition };
}
`;
}

function generateBackendPackageJson(pluginName: string): string {
  return JSON.stringify({
    name: `@orbitox/${pluginName}-backend`,
    version: '1.0.0',
    private: true,
    main: './src/index.ts',
    types: './src/index.ts',
    scripts: {
      build: 'tsc -p tsconfig.json',
    },
    dependencies: {
      '@nestjs/common': '^10.0.0',
      '@orbitox/core': 'workspace:*',
      '@orbitox/sdk': 'workspace:*',
    },
    devDependencies: {
      '@orbitox/tsconfig': 'workspace:*',
      typescript: '^5.0.0',
    },
  }, null, 2) + '\n';
}

function generateBackendTsconfig(): string {
  return JSON.stringify({
    extends: '../../../packages/config/tsconfig/base.json',
    compilerOptions: {
      outDir: 'dist',
      rootDir: 'src',
      composite: true,
      declaration: true,
      declarationMap: true,
      resolveJsonModule: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist'],
  }, null, 2) + '\n';
}

function generateBackendIndex(pluginName: string): string {
  return `export * from './${pluginName}.module';
export * from './${pluginName}.service';
`;
}

function generateBackendModule(pascalName: string, pluginName: string): string {
  return `import { Module } from '@nestjs/common';
import { OrbitoXPlugin, BasePlugin, PluginManifest } from '@orbitox/sdk';
import { ${pascalName}Service } from './${pluginName}.service';
import manifest from '../../manifest.json';

@OrbitoXPlugin(manifest as PluginManifest)
@Module({
  providers: [${pascalName}Service],
  exports: [${pascalName}Service],
})
export class ${pascalName}Module extends BasePlugin {
  readonly manifest: PluginManifest = manifest as PluginManifest;
}
`;
}

function generateBackendService(pascalName: string, entityLower: string): string {
  return `import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ${pascalName}Service {
  private readonly logger = new Logger(${pascalName}Service.name);

  getAll(contextId: string): any[] {
    this.logger.log(\`Fetching ${entityLower}s for context \${contextId}\`);
    return [];
  }

  getById(id: string, contextId: string): any {
    this.logger.log(\`Fetching ${entityLower} \${id} for context \${contextId}\`);
    return { id, contextId };
  }
}
`;
}
