import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import {
  SAMPLE_PLUGINS,
  isSamplePluginEnabled,
  isSamplePackage,
  getSamplePluginForPackage,
} from '../lib/sample-plugins';
import { GET as getCrmLeads } from '../app/api/v1/crm/leads/route';
import { GET as getFinanceLedger } from '../app/api/v1/finance/ledger/route';
import { GET as getHrmsEmployees } from '../app/api/v1/hrms/employees/route';
import { GET as getSchoolStudents } from '../app/api/v1/school/students/route';
import { GET as getInventoryItems } from '../app/api/v1/inventory/items/route';
import { GET as getCommerceProducts } from '../app/api/v1/commerce/products/route';
import { GET as getCommerceOrders } from '../app/api/v1/commerce/orders/route';
import { GET as getPlatformPackages, POST as installPlatformPackage } from '../app/api/v1/platform/packages/route';
import { POST as templateProvision } from '../app/api/v1/projects/template-provision/route';

process.env.ORBITOX_PLATFORM_REPOSITORY = 'json';

describe('Sample-Data Plugins Elimination & Isolation (Phase 2b-5)', () => {
  it('enforces that all 6 sample plugins are disabled by default in production', () => {
    const prevEnv = process.env.NODE_ENV;
    Reflect.set(process.env, 'NODE_ENV', 'production');

    // Clean any explicit flags
    for (const plugin of SAMPLE_PLUGINS) {
      delete process.env[`ORBITOX_ENABLE_${plugin.toUpperCase()}_PLUGIN`];
    }
    delete process.env.ORBITOX_ENABLE_SAMPLE_PLUGINS;

    try {
      assert.equal(SAMPLE_PLUGINS.length, 6);
      for (const plugin of SAMPLE_PLUGINS) {
        assert.equal(
          isSamplePluginEnabled(plugin),
          false,
          `Plugin ${plugin} must be OFF by default in production`
        );
      }
    } finally {
      Reflect.set(process.env, 'NODE_ENV', prevEnv);
    }
  });

  it('exposes no sample-data endpoint in production build and returns 404 PLUGIN_NOT_AVAILABLE', async () => {
    const prevEnv = process.env.NODE_ENV;
    Reflect.set(process.env, 'NODE_ENV', 'production');

    // Ensure all sample flags are clean
    for (const plugin of SAMPLE_PLUGINS) {
      delete process.env[`ORBITOX_ENABLE_${plugin.toUpperCase()}_PLUGIN`];
    }

    try {
      const endpoints = [
        { name: 'CRM Leads', handler: getCrmLeads, url: 'http://localhost:3005/api/v1/crm/leads' },
        { name: 'Finance Ledger', handler: getFinanceLedger, url: 'http://localhost:3005/api/v1/finance/ledger' },
        { name: 'HRMS Employees', handler: getHrmsEmployees, url: 'http://localhost:3005/api/v1/hrms/employees' },
        { name: 'School Students', handler: getSchoolStudents, url: 'http://localhost:3005/api/v1/school/students' },
        { name: 'Inventory Items', handler: getInventoryItems, url: 'http://localhost:3005/api/v1/inventory/items' },
        { name: 'Commerce Products', handler: getCommerceProducts, url: 'http://localhost:3005/api/v1/commerce/products' },
        { name: 'Commerce Orders', handler: getCommerceOrders, url: 'http://localhost:3005/api/v1/commerce/orders' },
      ];

      for (const ep of endpoints) {
        const req = new NextRequest(ep.url);
        const res = await ep.handler(req);
        assert.equal(
          res.status,
          404,
          `Endpoint ${ep.name} (${ep.url}) must return 404 in production when sample plugins are off`
        );
        const body = await res.json();
        assert.equal(
          body.error?.code || body.code,
          'PLUGIN_NOT_AVAILABLE',
          `Endpoint ${ep.name} must return PLUGIN_NOT_AVAILABLE code`
        );
        assert.equal(body.success, false);
      }
    } finally {
      Reflect.set(process.env, 'NODE_ENV', prevEnv);
    }
  });

  it('allows individual sample plugins only when explicit per-plugin feature flag is set', () => {
    const prevEnv = process.env.NODE_ENV;
    Reflect.set(process.env, 'NODE_ENV', 'production');

    try {
      process.env.ORBITOX_ENABLE_CRM_PLUGIN = 'true';
      delete process.env.ORBITOX_ENABLE_FINANCE_PLUGIN;
      delete process.env.ORBITOX_ENABLE_COMMERCE_PLUGIN;
      delete process.env.ORBITOX_ENABLE_HRMS_PLUGIN;
      delete process.env.ORBITOX_ENABLE_SCHOOL_PLUGIN;
      delete process.env.ORBITOX_ENABLE_INVENTORY_PLUGIN;

      assert.equal(isSamplePluginEnabled('crm'), true);
      assert.equal(isSamplePluginEnabled('finance'), false);
      assert.equal(isSamplePluginEnabled('commerce'), false);
      assert.equal(isSamplePluginEnabled('hrms'), false);
      assert.equal(isSamplePluginEnabled('school'), false);
      assert.equal(isSamplePluginEnabled('inventory'), false);

      process.env.ORBITOX_ENABLE_CRM_PLUGIN = 'false';
      assert.equal(isSamplePluginEnabled('crm'), false);
    } finally {
      delete process.env.ORBITOX_ENABLE_CRM_PLUGIN;
      Reflect.set(process.env, 'NODE_ENV', prevEnv);
    }
  });

  it('marks sample plugins as installable: false in the platform catalogue', async () => {
    const ADMIN_TOKEN = 'test_admin_token_super_secret_32_chars_minimum';
    process.env.ORBITOX_ADMIN_TOKEN = ADMIN_TOKEN;

    const req = new NextRequest('http://localhost:3005/api/v1/platform/packages', {
      headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const res = await getPlatformPackages(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.success);
    const packagesList: any[] = (body.data || body.packages) as any[];
    assert.ok(Array.isArray(packagesList));

    const samplePackageIds = [
      '@orbitox/crm',
      '@orbitox/finance',
      '@orbitox/commerce',
      '@orbitox/hrms',
      '@orbitox/school',
      '@orbitox/inventory',
    ];

    for (const pkgId of samplePackageIds) {
      const entry = packagesList.find((p: any) => p.packageId === pkgId || p.id === pkgId);
      if (entry) {
        assert.equal(
          entry.installable,
          false,
          `Package ${pkgId} must be marked installable: false in catalogue`
        );
        assert.equal(
          entry.installabilityStatus,
          'NOT_INSTALLABLE',
          `Package ${pkgId} installabilityStatus must be NOT_INSTALLABLE`
        );
      }
    }
  });

  it('prohibits direct installation of sample packages at repository/API layer', async () => {
    const ADMIN_TOKEN = 'test_admin_token_super_secret_32_chars_minimum';
    process.env.ORBITOX_ADMIN_TOKEN = ADMIN_TOKEN;

    const req = new NextRequest('http://localhost:3005/api/v1/platform/packages', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${ADMIN_TOKEN}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        packageId: '@orbitox/crm',
        version: '1.0.0',
      }),
    });

    const res = await installPlatformPackage(req);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.code || body.error?.code, 'PACKAGE_NOT_INSTALLABLE');
    assert.equal(body.success, false);
  });

  it('blocks CRM template provision when CRM plugin is disabled', async () => {
    delete process.env.ORBITOX_ENABLE_CRM_PLUGIN;
    const prevEnv = process.env.NODE_ENV;
    Reflect.set(process.env, 'NODE_ENV', 'production');

    try {
      const req = new NextRequest('http://localhost:3005/api/v1/projects/template-provision', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          template: 'crm',
          slug: 'test-crm-project',
          name: 'Test CRM Project',
        }),
      });

      const res = await templateProvision(req);
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.ok(body.error?.includes('HospitalOS multi-tenant standards'));
    } finally {
      Reflect.set(process.env, 'NODE_ENV', prevEnv);
    }
  });
});
