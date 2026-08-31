import express from 'express';
import { MetadataEngine } from '@orbitox/plugin-engine';
import { OrbitoXConfig } from './config.types';
import { orbitox } from './orbitox-singleton';

export async function createOrbitoXApp(config: OrbitoXConfig): Promise<{ app: any; server: any }> {
  console.log(`🚀 Booting OrbitoX App: ${config.app.name}...`);

  // 1. Initialize Engines via Singleton
  // Mode auto-detects from NODE_ENV: production → strict, otherwise → open
  orbitox.configure({});
  const metadataEngine = new MetadataEngine();

  // 2. Register Metadata from Config
  for (const entity of config.entities) {
    console.log(`   📦 Registering Entity: ${entity.name}`);
    await metadataEngine.registerEntity({
      id: entity.id,
      name: entity.id, // For metadata engine internal usage
      version: '1.0.0',
      displayName: entity.name,
      description: `Auto-generated entity for ${entity.name}`,
      author: 'OrbitoX Runtime',
      fields: entity.fields.map(f => ({
        name: f.name,
        type: f.type,
        required: f.required
      })) as any
    } as any);
  }

  // 3. Register database adapter if provided
  if (config.database?.adapter) {
    orbitox.db.useAdapter(config.database.adapter);
  }

  // 4. Initialize Express Server
  const app = express();
  app.use(express.json());

  // Mock Auth Middleware
  app.use((req: any, res: any, next: any) => {
    req.user = { id: 'admin_user' };
    req.context = { id: 'default_context' };
    next();
  });

  // 5. Auto-Generate CRUD Routes
  const apiRouter = express.Router();

  for (const entity of config.entities) {
    const entityRouter = express.Router();
    const permissionScope = `${entity.id}`;
    
    // Validation helper
    const validate = (payload: any, isPartial: boolean = false) => {
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
          if (field.type === 'enum' && field.options && !field.options.includes(val)) errors.push(`Field '${field.name}' must be one of: ${field.options.join(', ')}`);
        }
      }
      return errors;
    };

    // GET ALL (Advanced Querying)
    entityRouter.get('/', async (req: any, res: any) => {
      try {
        await orbitox.security.authorize(req.user.id, `${permissionScope}.read`, req.context.id);
        
        let query = { ...req.query };
        if (entity.hooks?.beforeRead) {
          query = await entity.hooks.beforeRead(query, req.context) || query;
        }

        const page = parseInt(query.page || '1', 10);
        const limit = parseInt(query.limit || '20', 10);
        const sort = query.sort || '-createdAt';
        
        // Remove known pagination/sorting keys from filter
        delete query.page;
        delete query.limit;
        delete query.sort;

        const result = await orbitox.db.findMany(entity.id, {
          filter: query,
          page,
          limit,
          sort,
          contextId: req.context?.id
        });

        res.json({ 
          message: `GET all ${entity.name} (OrbitoX Runtime)`, 
          data: result.data,
          meta: result.meta
        });
      } catch (error: any) {
        res.status(403).json({ error: error.message });
      }
    });

    // GET ONE
    entityRouter.get('/:id', async (req: any, res: any) => {
      try {
        await orbitox.security.authorize(req.user.id, `${permissionScope}.read`, req.context.id);
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
        await orbitox.security.authorize(req.user.id, `${permissionScope}.create`, req.context.id);
        
        const errors = validate(req.body);
        if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

        let payload = req.body;
        if (entity.hooks?.beforeCreate) {
          payload = await entity.hooks.beforeCreate(payload, req.context) || payload;
        }

        const newRecord = await orbitox.db.create(entity.id, payload, req.context?.id);
        
        if (entity.hooks?.afterCreate) {
          await entity.hooks.afterCreate(newRecord, req.context);
        }

        await orbitox.events.emit(`${entity.id}.created`, { record: newRecord }, req.context.id);
        await orbitox.audit.created(entity.name, newRecord.id, newRecord, req.user.id, req.context.id);

        res.status(201).json({ message: `CREATED ${entity.name} (OrbitoX Runtime)`, data: newRecord });
      } catch (error: any) {
        res.status(403).json({ error: error.message });
      }
    });

    // UPDATE
    entityRouter.put('/:id', async (req: any, res: any) => {
      try {
        await orbitox.security.authorize(req.user.id, `${permissionScope}.update`, req.context.id);
        
        const errors = validate(req.body);
        if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

        let payload = req.body;
        if (entity.hooks?.beforeUpdate) {
          payload = await entity.hooks.beforeUpdate(req.params.id, payload, req.context) || payload;
        }

        const updatedRecord = await orbitox.db.update(entity.id, req.params.id, payload, req.context?.id);
        
        if (entity.hooks?.afterUpdate) {
          await entity.hooks.afterUpdate(updatedRecord, req.context);
        }

        await orbitox.events.emit(`${entity.id}.updated`, { record: updatedRecord }, req.context.id);
        await orbitox.audit.updated(entity.name, updatedRecord.id, {}, updatedRecord, req.user.id, req.context.id);

        res.json({ message: `UPDATED ${entity.name} (OrbitoX Runtime)`, data: updatedRecord });
      } catch (error: any) {
        res.status(403).json({ error: error.message });
      }
    });

    // PATCH
    entityRouter.patch('/:id', async (req: any, res: any) => {
      try {
        await orbitox.security.authorize(req.user.id, `${permissionScope}.update`, req.context.id);
        
        const errors = validate(req.body, true);
        if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

        let payload = req.body;
        if (entity.hooks?.beforeUpdate) {
          payload = await entity.hooks.beforeUpdate(req.params.id, payload, req.context) || payload;
        }

        const updatedRecord = await orbitox.db.update(entity.id, req.params.id, payload, req.context?.id);
        
        if (entity.hooks?.afterUpdate) {
          await entity.hooks.afterUpdate(updatedRecord, req.context);
        }

        await orbitox.events.emit(`${entity.id}.updated`, { record: updatedRecord }, req.context.id);
        await orbitox.audit.updated(entity.name, updatedRecord.id, {}, updatedRecord, req.user.id, req.context.id);

        res.json({ message: `PATCHED ${entity.name} (OrbitoX Runtime)`, data: updatedRecord });
      } catch (error: any) {
        res.status(403).json({ error: error.message });
      }
    });

    // DELETE
    entityRouter.delete('/:id', async (req: any, res: any) => {
      try {
        await orbitox.security.authorize(req.user.id, `${permissionScope}.delete`, req.context.id);
        
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

        await orbitox.events.emit(`${entity.id}.deleted`, { id: req.params.id }, req.context.id);
        await orbitox.audit.deleted(entity.name, req.params.id, {}, req.user.id, req.context.id);

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

  // Health endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', app: config.app.name, activeEntities: config.entities.length });
  });

  // 5. Start Server
  const port = config.app.port || 3000;
  const server = app.listen(port, () => {
    console.log(`\n🎉 OrbitoX Runtime is active!`);
    console.log(`   - 🩺 Health: http://localhost:${port}/health`);
    console.log(`   - ⚡ API:    http://localhost:${port}/api`);
  });

  return { app, server };
}
