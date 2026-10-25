import express from 'express';
import { MetadataEngine, PluginContractLoader } from '@orbitox-io/plugin-engine';
import { ControlClient } from '@orbitox/external-runtime-sdk';
import { OrbitoXConfig, OrbitoXEntity } from './config.types';
import { orbitox } from './orbitox-singleton';

export async function createOrbitoXApp(config: OrbitoXConfig): Promise<{
  app: express.Express;
  server: any;
  platformSdk?: ControlClient | null;
}> {
  console.log(`🚀 Booting OrbitoX App: ${config.app.name}...`);

  // 1. Strict Production Security Enforcement
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    config.app.environment === 'production';

  if (isProduction) {
    if (!config.auth?.provider) {
      throw new Error(
        'SECURITY CRITICAL: createOrbitoXApp refuses to start in production without an explicit "auth.provider". Anonymous and mock authentication are strictly prohibited in production.'
      );
    }
    if (!config.tenancy?.resolver) {
      throw new Error(
        'SECURITY CRITICAL: createOrbitoXApp refuses to start in production without an explicit "tenancy.resolver". Zero-trust multi-tenancy requires tenant resolution in production.'
      );
    }
  }

  // 2. Initialize Internal Kernel via Singleton
  orbitox.configure({});
  const metadataEngine = new MetadataEngine();

  // 3. Register Entities if provided
  if (config.entities && config.entities.length > 0) {
    for (const entity of config.entities) {
      console.log(`   📦 Registering Entity: ${entity.name}`);
      await metadataEngine.registerEntity({
        id: entity.id,
        name: entity.id,
        version: '1.0.0',
        displayName: entity.name,
        description: `Auto-generated entity for ${entity.name}`,
        author: 'OrbitoX Runtime',
        fields: entity.fields.map((f) => ({
          name: f.name,
          type: f.type,
          required: f.required,
        })) as any,
      } as any);
    }
  }

  // 4. Register Database Adapter if provided
  if (config.database?.adapter) {
    orbitox.db.useAdapter(config.database.adapter);
  }

  // 5. Connect to OrbitoX Platform via External Runtime SDK
  let platformSdk: ControlClient | null = null;
  if (config.platform?.sdk) {
    platformSdk = config.platform.sdk;
  } else if (config.platform?.enabled !== false && (config.platform?.projectId || config.platform?.controlPlaneUrl)) {
    try {
      const manifestSlug = config.platform.slug || config.app.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      platformSdk = new ControlClient({
        manifest: {
          projectId: config.platform.projectId || manifestSlug,
          slug: manifestSlug,
          name: config.app.name,
          type: 'custom-os',
          version: '1.0.0',
          runtime: {
            type: 'standalone',
            entrypoint: 'dist/main.js',
            defaultPort: config.app.port || 3000,
            healthEndpoint: '/health',
          },
          enabledPlugins: (config.plugins || []).map((p) => p.manifest?.name || p.manifest?.id || 'plugin'),
          enabledFeatures: [],
          apis: [],
          planReferences: [],
          environmentMetadata: {
            defaultEnvironment: config.app.environment || 'development',
            supportedEnvironments: ['development', 'staging', 'production'],
          },
          platformController: {
            controlPlaneUrl: config.platform.controlPlaneUrl || 'http://localhost:3005',
            syncIntervalSeconds: config.platform.syncIntervalSeconds || 10,
            requireSignedConfig: false,
          },
          capabilities: ['CONTROL_BRIDGE_V1', 'REALTIME_TELEMETRY_V1'],
        },
        controlPlaneUrl: config.platform.controlPlaneUrl || 'http://localhost:3005',
        apiKey: config.platform.apiKey,
      });
      console.log(`   🪐 Connected Platform Bridge to: ${config.platform.controlPlaneUrl || 'http://localhost:3005'}`);
    } catch (err: any) {
      console.warn(`   ⚠️ Platform SDK bridge skipped: ${err.message}`);
    }
  }

  // 6. Initialize Express App
  const app = express();
  app.use(express.json());

  // 7. Health Endpoint (Pre-auth & Pre-tenancy bypass)
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      app: config.app.name,
      environment: config.app.environment || process.env.NODE_ENV || 'development',
      pluginsCount: config.plugins?.length || 0,
      activeEntities: config.entities?.length || 0,
    });
  });

  // 8. Zero-Trust Multi-Tenancy Middleware (No Mock Tenancy)
  const bypassPaths = config.tenancy?.bypassPaths || ['/health', '/favicon.ico'];

  app.use(async (req: any, res: any, next: any) => {
    if (bypassPaths.some((p) => req.path === p || req.path.startsWith(`${p}/`))) {
      return next();
    }

    if (!config.tenancy?.resolver) {
      // In development, if no resolver is configured, allow request to proceed un-scoped
      return next();
    }

    try {
      const tenant = await config.tenancy.resolver(req);
      if (!tenant) {
        return res.status(404).json({
          error: 'TENANT_NOT_FOUND',
          message: `Zero-Trust Tenancy: Custom domain or tenant header not recognized for ${req.method} ${req.path}`,
        });
      }

      if (tenant.status === 'SUSPENDED') {
        return res.status(403).json({
          error: 'TENANT_SUSPENDED',
          message: `Tenant account "${tenant.name || tenant.tenantId}" is currently suspended. Please contact platform support.`,
        });
      }

      req.tenant = tenant;
      req.tenantId = tenant.tenantId;
      req.context = { id: tenant.tenantId, tenant };

      // Helper for tenant feature checks
      req.tenantSession = {
        tenant,
        hasFeature: (featureName: string) => {
          if (!tenant.features) return false;
          if (tenant.features.includes('*')) return true;
          return tenant.features.includes(featureName);
        },
      };

      next();
    } catch (err: any) {
      return res.status(500).json({
        error: 'TENANT_RESOLUTION_ERROR',
        message: err.message || 'Tenant resolution failed',
      });
    }
  });

  // 9. Authentic Authentication Middleware (Deleted Mock Auth)
  app.use(async (req: any, res: any, next: any) => {
    if (config.auth?.provider) {
      try {
        const user = await config.auth.provider(req);
        if (user) {
          req.user = user;
        }
      } catch (err: any) {
        return res.status(401).json({
          error: 'AUTHENTICATION_FAILED',
          message: err.message || 'Authentication provider error',
        });
      }
    }
    next();
  });

  // 10. Mount Composed Plugins
  const repositories = {
    ...(config.storage?.repositories || {}),
    ...(config.database?.repositories || {}),
  };

  if (config.plugins && config.plugins.length > 0) {
    for (const plugin of config.plugins) {
      const loaded = PluginContractLoader.loadPlugin(plugin, {
        repositories,
        platformSdk,
      });

      const pluginRouter = PluginContractLoader.compileExpressRouter(loaded, {
        authProvider: config.auth?.provider,
        tenantResolver: config.tenancy?.resolver,
      });

      app.use(pluginRouter);
      console.log(`   🔌 Mounted Plugin: ${loaded.manifest.displayName || loaded.manifest.name} (${loaded.routes.length} routes)`);
    }
  }

  // 11. Auto-Generate CRUD Routes for Declared Entities
  if (config.entities && config.entities.length > 0) {
    const apiRouter = express.Router();

    for (const entity of config.entities) {
      const entityRouter = express.Router();
      const permissionScope = `${entity.id}`;

      // Entitlement & Quota Guard for Entity
      const entityGuard = async (req: any, res: any, next: any) => {
        // 1. Feature entitlement check (403)
        if (entity.entitlement?.feature && req.tenant) {
          const hasFeature = req.tenantSession?.hasFeature(entity.entitlement.feature);
          if (!hasFeature) {
            return res.status(403).json({
              error: 'FEATURE_NOT_ENTITLED',
              feature: entity.entitlement.feature,
              message: `Tenant "${req.tenant.tenantId}" is not entitled to feature "${entity.entitlement.feature}"`,
            });
          }
        }

        // 2. Quota check (402)
        if (entity.entitlement?.quotaKey && req.tenant) {
          let allowed = true;
          let limit = Infinity;
          let used = 0;

          if (req.tenant.quotas && req.tenant.quotas[entity.entitlement.quotaKey] !== undefined) {
            limit = req.tenant.quotas[entity.entitlement.quotaKey];
            used = (req.tenant.usage && req.tenant.usage[entity.entitlement.quotaKey]) || 0;
            if (used >= limit) {
              allowed = false;
            }
          }
          if (allowed && platformSdk?.entitlements) {
            const check = platformSdk.entitlements.check(entity.entitlement.quotaKey);
            if (check.enforced && !check.allowed) {
              allowed = false;
              limit = (check as any).limit || limit;
              used = (check as any).used || used;
            }

          }


          if (!allowed) {
            return res.status(402).json({
              error: 'QUOTA_EXCEEDED',
              quotaKey: entity.entitlement.quotaKey,
              limit,
              used,
              message: `Tenant "${req.tenant.tenantId}" has exceeded quota for "${entity.entitlement.quotaKey}". Payment or upgrade required.`,
            });
          }

          // Report usage through SDK on successful response
          res.on('finish', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              if (platformSdk?.entitlements?.reportUsage) {
                platformSdk.entitlements.reportUsage(entity.entitlement!.quotaKey!, 1).catch(() => {});
              }
            }
          });
        }

        next();
      };

      entityRouter.use(entityGuard);

      const validate = (payload: any, isPartial = false) => {
        const errors: string[] = [];
        for (const field of entity.fields) {
          if (field.required && !isPartial && payload[field.name] === undefined) {
            errors.push(`Field '${field.name}' is required`);
          }
          if (payload[field.name] !== undefined) {
            const val = payload[field.name];
            if (field.type === 'number' && typeof val !== 'number') errors.push(`Field '${field.name}' must be a number`);
            if (field.type === 'boolean' && typeof val !== 'boolean') errors.push(`Field '${field.name}' must be a boolean`);
            if (field.type === 'text' && typeof val !== 'string') errors.push(`Field '${field.name}' must be text`);
            if (field.type === 'enum' && field.options && !field.options.includes(val)) {
              errors.push(`Field '${field.name}' must be one of: ${field.options.join(', ')}`);
            }
          }
        }
        return errors;
      };

      // GET ALL
      entityRouter.get('/', async (req: any, res: any) => {
        try {
          if (!req.user) {
            return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
          }
          await orbitox.security.authorize(req.user.id, `${permissionScope}.read`, req.context?.id);

          let query = { ...req.query };
          if (entity.hooks?.beforeRead) {
            query = (await entity.hooks.beforeRead(query, req.context)) || query;
          }

          const page = parseInt(query.page || '1', 10);
          const limit = parseInt(query.limit || '20', 10);
          const sort = query.sort || '-createdAt';

          delete query.page;
          delete query.limit;
          delete query.sort;

          const result = await orbitox.db.findMany(entity.id, {
            filter: query,
            page,
            limit,
            sort,
            contextId: req.context?.id,
          });

          res.json({
            message: `GET all ${entity.name} (OrbitoX Runtime)`,
            data: result.data,
            meta: result.meta,
          });
        } catch (error: any) {
          res.status(403).json({ error: error.message });
        }
      });

      // GET ONE
      entityRouter.get('/:id', async (req: any, res: any) => {
        try {
          if (!req.user) {
            return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
          }
          await orbitox.security.authorize(req.user.id, `${permissionScope}.read`, req.context?.id);
          const record = await orbitox.db.findById(entity.id, req.params.id, req.context?.id);
          if (!record) {
            return res.status(404).json({ error: `${entity.name} with id '${req.params.id}' not found` });
          }
          res.json({ message: `GET one ${entity.name} (OrbitoX Runtime)`, data: record });
        } catch (error: any) {
          res.status(403).json({ error: error.message });
        }
      });

      // CREATE
      entityRouter.post('/', async (req: any, res: any) => {
        try {
          if (!req.user) {
            return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
          }
          await orbitox.security.authorize(req.user.id, `${permissionScope}.create`, req.context?.id);

          const errors = validate(req.body);
          if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

          let payload = req.body;
          if (entity.hooks?.beforeCreate) {
            payload = (await entity.hooks.beforeCreate(payload, req.context)) || payload;
          }

          const newRecord = await orbitox.db.create(entity.id, payload, req.context?.id);

          if (entity.hooks?.afterCreate) {
            await entity.hooks.afterCreate(newRecord, req.context);
          }

          await orbitox.events.emit(`${entity.id}.created`, { record: newRecord }, req.context?.id);
          await orbitox.audit.created(entity.name, newRecord.id, newRecord, req.user.id, req.context?.id);

          res.status(201).json({ message: `CREATED ${entity.name} (OrbitoX Runtime)`, data: newRecord });
        } catch (error: any) {
          res.status(403).json({ error: error.message });
        }
      });

      // UPDATE
      entityRouter.put('/:id', async (req: any, res: any) => {
        try {
          if (!req.user) {
            return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
          }
          await orbitox.security.authorize(req.user.id, `${permissionScope}.update`, req.context?.id);

          const errors = validate(req.body);
          if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

          let payload = req.body;
          if (entity.hooks?.beforeUpdate) {
            payload = (await entity.hooks.beforeUpdate(req.params.id, payload, req.context)) || payload;
          }

          const updatedRecord = await orbitox.db.update(entity.id, req.params.id, payload, req.context?.id);

          if (entity.hooks?.afterUpdate) {
            await entity.hooks.afterUpdate(updatedRecord, req.context);
          }

          await orbitox.events.emit(`${entity.id}.updated`, { record: updatedRecord }, req.context?.id);
          await orbitox.audit.updated(entity.name, updatedRecord.id, {}, updatedRecord, req.user.id, req.context?.id);

          res.json({ message: `UPDATED ${entity.name} (OrbitoX Runtime)`, data: updatedRecord });
        } catch (error: any) {
          res.status(403).json({ error: error.message });
        }
      });

      // PATCH
      entityRouter.patch('/:id', async (req: any, res: any) => {
        try {
          if (!req.user) {
            return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
          }
          await orbitox.security.authorize(req.user.id, `${permissionScope}.update`, req.context?.id);

          const errors = validate(req.body, true);
          if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

          let payload = req.body;
          if (entity.hooks?.beforeUpdate) {
            payload = (await entity.hooks.beforeUpdate(req.params.id, payload, req.context)) || payload;
          }

          const updatedRecord = await orbitox.db.update(entity.id, req.params.id, payload, req.context?.id);

          if (entity.hooks?.afterUpdate) {
            await entity.hooks.afterUpdate(updatedRecord, req.context);
          }

          await orbitox.events.emit(`${entity.id}.updated`, { record: updatedRecord }, req.context?.id);
          await orbitox.audit.updated(entity.name, updatedRecord.id, {}, updatedRecord, req.user.id, req.context?.id);

          res.json({ message: `PATCHED ${entity.name} (OrbitoX Runtime)`, data: updatedRecord });
        } catch (error: any) {
          res.status(403).json({ error: error.message });
        }
      });

      // DELETE
      entityRouter.delete('/:id', async (req: any, res: any) => {
        try {
          if (!req.user) {
            return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
          }
          await orbitox.security.authorize(req.user.id, `${permissionScope}.delete`, req.context?.id);

          if (entity.hooks?.beforeDelete) {
            await entity.hooks.beforeDelete(req.params.id, req.context);
          }

          const deleted = await orbitox.db.delete(entity.id, req.params.id, req.context?.id);
          if (!deleted) {
            return res.status(404).json({ error: `${entity.name} with id '${req.params.id}' not found` });
          }

          if (entity.hooks?.afterDelete) {
            await entity.hooks.afterDelete(req.params.id, req.context);
          }

          await orbitox.events.emit(`${entity.id}.deleted`, { id: req.params.id }, req.context?.id);
          await orbitox.audit.deleted(entity.name, req.params.id, {}, req.user.id, req.context?.id);

          res.json({ message: `DELETED ${entity.name} (OrbitoX Runtime)`, id: req.params.id });
        } catch (error: any) {
          res.status(403).json({ error: error.message });
        }
      });

      const routeName = entity.id.replace(/_/g, '-');
      apiRouter.use(`/${routeName}s`, entityRouter);
      console.log(`   ✅ Mounted Auto-Route: /api/${routeName}s`);
    }

    app.use('/api', apiRouter);
  }

  // 12. Start Server
  const port = config.app.port || 3000;
  const server = app.listen(port, () => {
    console.log(`\n🎉 OrbitoX Runtime is active!`);
    console.log(`   - 🩺 Health: http://localhost:${port}/health`);
    console.log(`   - ⚡ Port:   ${port}`);
  });

  return { app, server, platformSdk };
}
