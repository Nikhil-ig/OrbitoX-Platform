"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@orbitox/core");
const plugin_engine_1 = require("@orbitox/plugin-engine");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function bootstrap() {
    console.log('🚀 Starting External Restaurant OS with OrbitoX Kernel...');
    // 1. Read Manifest
    const manifestPath = path.join(__dirname, '../manifest.json');
    const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log(`📦 Loaded Plugin: ${manifestData.displayName} (v${manifestData.version})`);
    // 2. Initialize Core Services
    // For a standalone test, we instantiate them directly instead of via NestJS DI
    const contextService = new core_1.ContextService();
    const policyEngine = new core_1.PolicyEngine();
    // Mock RoleService for testing
    const roleService = {
        getUserRoles: async (userId, contextId) => ['manager'],
        getEffectivePermissions: async (roleId) => ['restaurant.menu_item.read', 'restaurant.menu_item.create'],
    };
    // Mock Logger for testing
    const loggerService = {
        warn: console.warn,
        info: console.log,
        error: console.error,
    };
    const rbacService = new core_1.RbacService(roleService, policyEngine, loggerService);
    // 3. Initialize Plugin Engine (Metadata)
    const metadataEngine = new plugin_engine_1.MetadataEngine();
    // 4. Register Entities from Manifest
    console.log('\n⚙️  Registering Entities...');
    for (const entity of manifestData.entities || []) {
        await metadataEngine.registerEntity(entity);
    }
    // 5. Test Context Engine (Graph Traversal)
    console.log('\n🌐 Creating Context Graph (Brand -> Franchisee)...');
    const brandContext = contextService.createContext({
        type: 'tenant',
        slug: 'brand-hq',
        displayName: 'Global Brand HQ',
        ownerId: 'sysadmin',
        parentId: null,
    });
    const franchiseeContext = contextService.createContext({
        type: 'tenant',
        slug: 'franchisee-1',
        displayName: 'Local Restaurant',
        parentId: brandContext.id, // Tree relationship
        ownerId: 'franchise_owner',
    });
    const vendorContext = contextService.createContext({
        type: 'vendor',
        slug: 'supplier-abc',
        displayName: 'ABC Suppliers',
        ownerId: 'vendor_admin',
        parentId: null,
        relatedContexts: [franchiseeContext.id] // Graph relationship
    });
    console.log('Context Tree:');
    console.log(`- ${brandContext.displayName} (ID: ${brandContext.id})`);
    console.log(`  |- ${franchiseeContext.displayName} (ID: ${franchiseeContext.id})`);
    console.log(`     |- [Related] ${vendorContext.displayName} (ID: ${vendorContext.id})`);
    console.log('\n🔍 Testing Graph Traversal (Descendants of Brand HQ)...');
    const descendants = contextService.getDescendants(brandContext.id);
    console.log(`Descendants found: ${descendants.map(d => d.displayName).join(', ')}`);
    // 6. Test ABAC / Security Engine
    console.log('\n🛡️  Testing Security Engine...');
    const userContext = { userId: 'alice', contextId: franchiseeContext.id, permission: 'restaurant.menu_item.create' };
    try {
        await rbacService.authorize(userContext);
        console.log('✅ Access GRANTED to create Menu Item (RBAC Passed & ABAC Default Allowed)');
    }
    catch (error) {
        console.error(`❌ Access DENIED: ${error.message}`);
    }
    // Attempt to delete (user does not have this permission in the mock)
    const deleteContext = { userId: 'alice', contextId: franchiseeContext.id, permission: 'restaurant.menu_item.delete' };
    try {
        await rbacService.authorize(deleteContext);
    }
    catch (error) {
        console.log(`✅ Access correctly DENIED for delete: ${error.message}`);
    }
    console.log('\n🎉 Standalone Integration Test Completed Successfully!');
}
bootstrap().catch(console.error);
