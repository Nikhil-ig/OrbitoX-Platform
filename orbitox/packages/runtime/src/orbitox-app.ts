import express from 'express';
import { MetadataEngine } from '@orbitox/plugin-engine';
import { OrbitoXConfig } from './config.types';
import { orbitox } from './orbitox-singleton';

export async function createOrbitoXApp(config: OrbitoXConfig) {
  console.log(`🚀 Booting OrbitoX App: ${config.app.name}...`);

  // 1. Initialize Engines via Singleton
  orbitox.configure({ mode: 'open' }); // Dev mode by default for zero-complexity apps
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

  // 3. Initialize Express Server
  const app = express();
  app.use(express.json());

  // Mock Auth Middleware
  app.use((req: any, res: any, next: any) => {
    req.user = { id: 'admin_user' };
    req.context = { id: 'default_context' };
    next();
  });

  // 4. Auto-Generate CRUD Routes
  const apiRouter = express.Router();

  for (const entity of config.entities) {
    const entityRouter = express.Router();
    const permissionScope = `${entity.id}`;
    
    // GET ALL
    entityRouter.get('/', async (req: any, res: any) => {
      try {
        await orbitox.security.authorize(req.user.id, `${permissionScope}.read`, req.context.id);
        res.json({ message: `GET all ${entity.name} (OrbitoX Runtime)`, items: [] });
      } catch (error: any) {
        res.status(403).json({ error: error.message });
      }
    });

    // CREATE
    entityRouter.post('/', async (req: any, res: any) => {
      try {
        await orbitox.security.authorize(req.user.id, `${permissionScope}.create`, req.context.id);
        res.status(201).json({ message: `CREATED ${entity.name} (OrbitoX Runtime)`, item: req.body });
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
  app.listen(port, () => {
    console.log(`\n🎉 OrbitoX Runtime is active!`);
    console.log(`   - 🩺 Health: http://localhost:${port}/health`);
    console.log(`   - ⚡ API:    http://localhost:${port}/api`);
  });
}
