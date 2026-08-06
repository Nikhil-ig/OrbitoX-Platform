import { ContextService, RbacService, PolicyEngine } from '@orbitox/core';
import { MetadataEngine } from '@orbitox/plugin-engine';
import { PluginManifest } from '@orbitox/sdk';
import * as fs from 'fs';
import * as path from 'path';

/**
 * MOCK SERVICES
 * In a real OrbitoX Hub, these are provided by database-backed NestJS services.
 * For this standalone test, we create simple in-memory mocks.
 */
function createMockServices() {
  const roleService = {
    // Hardcode 'alice' to have the 'manager' role in any context
    getUserRoles: async (userId: string, contextId: string) => ['manager'],
    // Hardcode the 'manager' role to have read/create permissions, but NOT delete
    getEffectivePermissions: async (roleId: string) => [
      'restaurant.menu_item.read',
      'restaurant.menu_item.create'
    ],
  } as any;

  const loggerService = {
    warn: console.warn,
    info: console.log,
    error: console.error,
  } as any;

  return { roleService, loggerService };
}

/**
 * STEP 1: INITIALIZE ENGINES
 * Bootstraps the core OrbitoX engines (Context, Policy, Metadata, Security)
 * completely standalone, without any web framework.
 */
function initializeEngines() {
  const { roleService, loggerService } = createMockServices();

  const contextEngine = new ContextService();
  const policyEngine = new PolicyEngine();
  const metadataEngine = new MetadataEngine();
  
  // The RbacService ties the role lookups and JSON-Logic policies together
  const securityEngine = new RbacService(roleService, policyEngine, loggerService);

  return { contextEngine, policyEngine, metadataEngine, securityEngine };
}

/**
 * STEP 2: LOAD PLUGIN MANIFEST
 * Reads the local manifest.json which defines the database schema and UI for this plugin.
 */
async function loadManifest(metadataEngine: MetadataEngine) {
  const manifestPath = path.join(__dirname, '../manifest.json');
  const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as PluginManifest;
  
  console.log(`📦 Loaded Plugin: ${manifestData.displayName} (v${manifestData.version})`);

  // Register all entities defined in the manifest into the Metadata Engine
  for (const entity of manifestData.entities || []) {
    await metadataEngine.registerEntity(entity);
  }
}

/**
 * STEP 3: SIMULATE THE CONTEXT GRAPH (O2O2B2B)
 * Simulates a complex multi-tenant relationship graph.
 */
function simulateContextGraph(contextEngine: ContextService) {
  console.log('\n🌐 Creating Context Graph (Brand -> Franchisee -> Vendor)...');
  
  // 1. The Global Brand HQ (Top of the tree)
  const brandContext = contextEngine.createContext({
    type: 'tenant',
    slug: 'brand-hq',
    displayName: 'Global Brand HQ',
    ownerId: 'sysadmin',
    parentId: null,
  });

  // 2. A Local Franchisee (Child of the Brand HQ)
  const franchiseeContext = contextEngine.createContext({
    type: 'tenant',
    slug: 'franchisee-1',
    displayName: 'Local Restaurant',
    parentId: brandContext.id, // Hierarchical Tree relationship
    ownerId: 'franchise_owner',
  });

  // 3. A Third-Party Supplier (Cross-boundary Mesh relationship)
  const vendorContext = contextEngine.createContext({
    type: 'vendor',
    slug: 'supplier-abc',
    displayName: 'ABC Suppliers',
    ownerId: 'vendor_admin',
    parentId: null,
    relatedContexts: [franchiseeContext.id] // Graph relationship linking it to the franchisee
  });

  console.log('Context Tree Visualized:');
  console.log(`- ${brandContext.displayName}`);
  console.log(`  |- ${franchiseeContext.displayName}`);
  console.log(`     |- [Cross-linked to] ${vendorContext.displayName}`);

  // Test that the graph traversal algorithm works
  const descendants = contextEngine.getDescendants(brandContext.id);
  console.log(`\n🔍 Graph Traversal Result: Descendants of Brand HQ include [${descendants.map(d => d.displayName).join(', ')}]`);

  return { brandContext, franchiseeContext, vendorContext };
}

/**
 * STEP 4: SIMULATE ZERO-TRUST SECURITY
 * Tests if the Security Engine correctly blocks unauthorized actions.
 */
async function simulateSecurityChecks(securityEngine: RbacService, franchiseeContextId: string) {
  console.log('\n🛡️  Testing Security Engine...');
  
  // Test Case A: User tries to CREATE a menu item (Should Succeed)
  const createRequest = { 
    userId: 'alice', 
    contextId: franchiseeContextId, 
    permission: 'restaurant.menu_item.create' 
  };
  
  try {
    await securityEngine.authorize(createRequest);
    console.log('✅ Access GRANTED to create Menu Item (User has role & policy permits)');
  } catch (error: any) {
    console.error(`❌ Access DENIED: ${error.message}`);
  }

  // Test Case B: User tries to DELETE a menu item (Should Fail)
  const deleteRequest = { 
    userId: 'alice', 
    contextId: franchiseeContextId, 
    permission: 'restaurant.menu_item.delete' 
  };
  
  try {
    await securityEngine.authorize(deleteRequest);
    console.log('❌ Error: User was allowed to delete, but should not have been!');
  } catch (error: any) {
    // We expect this to throw an error because the 'manager' mock role lacks 'delete'
    console.log(`✅ Access correctly DENIED for delete action: ${error.message}`);
  }
}

/**
 * MAIN EXECUTION
 * Ties all the steps together into a readable workflow.
 */
async function bootstrap() {
  console.log('🚀 Starting External Restaurant OS with OrbitoX Kernel...\n');

  // Step 1: Boot engines
  const { contextEngine, metadataEngine, securityEngine } = initializeEngines();

  // Step 2: Load DB Schema (Manifest)
  await loadManifest(metadataEngine);

  // Step 3: Build Multi-Tenant Graph
  const { franchiseeContext } = simulateContextGraph(contextEngine);

  // Step 4: Run Security Tests
  await simulateSecurityChecks(securityEngine, franchiseeContext.id);

  console.log('\n🎉 Standalone Integration Test Completed Successfully!');
}

// Run the script
bootstrap().catch(console.error);
