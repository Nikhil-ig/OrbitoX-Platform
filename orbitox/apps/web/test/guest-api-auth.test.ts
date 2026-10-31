import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as http from 'node:http';
import { NextRequest } from 'next/server';
import { getDefaultBridgeKeys, verifyBridgeRequest, MemoryNonceStore } from '@orbitox-io/bridge';
import { GET as getQr } from '../app/api/restaurant/qr/[locator]/route';
import { POST as joinSession } from '../app/api/restaurant/sessions/join/route';
import { GET as getMenu } from '../app/api/restaurant/menu/route';
import { POST as createQuote } from '../app/api/restaurant/quote/route';
import { POST as submitOrder, GET as getOrder } from '../app/api/restaurant/orders/route';
import { GET as getKds } from '../app/api/restaurant/kds/route';
import { GET as getV1Menu } from '../app/api/v1/restaurant/menu/route';
import { GET as getV1Orders } from '../app/api/v1/restaurant/orders/route';
import {
    forwardSignedBridgeCall,
    registerRestaurantTenantLink,
    clearRestaurantTenantLinks,
    resolveLinkedRestaurantTenant,
} from '../app/api/restaurant/_lib/restaurant-routing';
import { platformRepository } from '@/lib/platform-repository';

// Ensure test environment
Reflect.set(process.env, 'NODE_ENV', 'test');
process.env.ORBITOX_PLATFORM_REPOSITORY = 'json';

describe('Restaurant Traffic Routing & Demolition of In-Memory Runtime (Phase 2b-5)', () => {
    const PUBLIC_URL = 'https://restaurant.orbitox.internal';

    it('answers 308 Permanent Redirect to RESTAURANTOS_PUBLIC_URL with Deprecation and Sunset headers', async () => {
        process.env.RESTAURANTOS_PUBLIC_URL = PUBLIC_URL;

        // 1. QR Locator route
        const qrReq = new NextRequest('http://localhost:3005/api/restaurant/qr/table_42_qr');
        const qrRes = await getQr(qrReq, { params: Promise.resolve({ locator: 'table_42_qr' }) });
        assert.equal(qrRes.status, 308);
        assert.equal(qrRes.headers.get('location'), `${PUBLIC_URL}/api/restaurant/qr/table_42_qr`);
        assert.equal(qrRes.headers.get('Deprecation'), 'true');
        assert.ok(qrRes.headers.get('Sunset'));

        // Verify Sunset date is approximately 90 days out
        const sunsetDate = new Date(qrRes.headers.get('Sunset')!).getTime();
        const expectedSunset = Date.now() + 90 * 24 * 60 * 60 * 1000;
        assert.ok(Math.abs(sunsetDate - expectedSunset) < 10000, 'Sunset date must be ~90 days in future');

        // 2. Session join route
        const joinReq = new NextRequest('http://localhost:3005/api/restaurant/sessions/join', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ locator: 'table_42_qr', displayName: 'Guest Tester' }),
        });
        const joinRes = await joinSession(joinReq);
        assert.equal(joinRes.status, 308);
        assert.equal(joinRes.headers.get('location'), `${PUBLIC_URL}/api/restaurant/sessions/join`);
        assert.equal(joinRes.headers.get('Deprecation'), 'true');

        // 3. Menu route
        const menuReq = new NextRequest('http://localhost:3005/api/restaurant/menu');
        const menuRes = await getMenu(menuReq);
        assert.equal(menuRes.status, 308);
        assert.equal(menuRes.headers.get('location'), `${PUBLIC_URL}/api/restaurant/menu`);

        // 4. Quote route
        const quoteReq = new NextRequest('http://localhost:3005/api/restaurant/quote', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ cartItems: [{ itemId: 'item_1', quantity: 2 }] }),
        });
        const quoteRes = await createQuote(quoteReq);
        assert.equal(quoteRes.status, 308);
        assert.equal(quoteRes.headers.get('location'), `${PUBLIC_URL}/api/restaurant/quote`);

        // 5. Orders route (POST & GET with query params preserved)
        const orderPostReq = new NextRequest('http://localhost:3005/api/restaurant/orders', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ quoteId: 'quote_123' }),
        });
        const orderPostRes = await submitOrder(orderPostReq);
        assert.equal(orderPostRes.status, 308);
        assert.equal(orderPostRes.headers.get('location'), `${PUBLIC_URL}/api/restaurant/orders`);

        const orderGetReq = new NextRequest('http://localhost:3005/api/restaurant/orders?orderId=ord_9988&tableId=t42');
        const orderGetRes = await getOrder(orderGetReq);
        assert.equal(orderGetRes.status, 308);
        assert.equal(orderGetRes.headers.get('location'), `${PUBLIC_URL}/api/restaurant/orders?orderId=ord_9988&tableId=t42`);

        // 6. v1 legacy restaurant routes redirect to RestaurantOS public origin
        const v1MenuRes = await getV1Menu(new NextRequest('http://localhost:3005/api/v1/restaurant/menu'));
        assert.equal(v1MenuRes.status, 308);
        assert.equal(v1MenuRes.headers.get('location'), `${PUBLIC_URL}/api/restaurant/menu`);

        const v1OrdersRes = await getV1Orders(new NextRequest('http://localhost:3005/api/v1/restaurant/orders?id=v1_ord'));
        assert.equal(v1OrdersRes.status, 308);
        assert.equal(v1OrdersRes.headers.get('location'), `${PUBLIC_URL}/api/restaurant/orders?id=v1_ord`);
    });

    it('fails closed with 503 RESTAURANT_RUNTIME_NOT_CONFIGURED in production when RESTAURANTOS_PUBLIC_URL is unset', async () => {
        delete process.env.RESTAURANTOS_PUBLIC_URL;
        const prevEnv = process.env.NODE_ENV;
        Reflect.set(process.env, 'NODE_ENV', 'production');

        try {
            const menuReq = new NextRequest('http://localhost:3005/api/restaurant/menu');
            const menuRes = await getMenu(menuReq);
            assert.equal(menuRes.status, 503);
            const body = await menuRes.json();
            assert.equal(body.error?.code, 'RESTAURANT_RUNTIME_NOT_CONFIGURED');
            assert.equal(body.success, false);
        } finally {
            Reflect.set(process.env, 'NODE_ENV', prevEnv || 'test');
        }
    });

    it('requires verified platform principal for staff/admin KDS route and disallows anonymous access', async () => {
        const anonymousKds = await getKds(new NextRequest('http://localhost:3005/api/restaurant/kds'));
        assert.equal(anonymousKds.status, 401);
    });

    it('K1: forwardSignedBridgeCall refuses missing tenant with 401', async () => {
        const req = new NextRequest('http://localhost:3005/api/restaurant/kds');
        const res = await forwardSignedBridgeCall(req, '/api/restaurant/kds', '');
        assert.equal(res.status, 401);
        const data = await res.json();
        assert.equal(data.success, false);
        assert.equal(data.error?.code, 'UNAUTHORIZED');
    });

    it('K1: forwardSignedBridgeCall refuses unlinked non-canonical tenant with 403 RESTAURANT_TENANT_NOT_LINKED', async () => {
        const req = new NextRequest('http://localhost:3005/api/restaurant/kds');
        const res = await forwardSignedBridgeCall(req, '/api/restaurant/kds', 'unlinked-restaurant-tenant-999');
        assert.equal(res.status, 403);
        const data = await res.json();
        assert.equal(data.success, false);
        assert.equal(data.error?.code, 'RESTAURANT_TENANT_NOT_LINKED');
    });

    it('K1: two tenants differing only in dot vs underscore reach only their own data without collision', async () => {
        // Start mock upstream RestaurantOS runtime server
        const receivedRequests: Array<{ tenant: string; signature: string; authOk: boolean }> = [];
        const bridgeKeys = getDefaultBridgeKeys();
        const nonces = new MemoryNonceStore();

        const server = http.createServer(async (req, res) => {
            const tenant = (req.headers['x-orbitox-tenant'] || req.headers['bridge-tenant']) as string;
            const sig = (req.headers['x-orbitox-signature'] || req.headers['bridge-signature']) as string;
            
            const verifyRes = await verifyBridgeRequest(bridgeKeys, nonces, {
                method: req.method || 'GET',
                pathWithQuery: req.url || '/',
                headers: req.headers as Record<string, string>,
            });

            receivedRequests.push({
                tenant,
                signature: sig,
                authOk: verifyRes.ok,
            });

            // Return kitchen queue scoped strictly to tenant
            const kitchenData = {
                tenant,
                queue: tenant.includes('dot') ? ['ORDER_DOT_1', 'ORDER_DOT_2'] : ['ORDER_UNDERSCORE_1'],
            };

            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify(kitchenData));
        });

        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
        const port = (server.address() as any).port;
        const mockRuntimeUrl = `http://127.0.0.1:${port}`;
        const prevRuntimeUrl = process.env.RESTAURANTOS_RUNTIME_URL;
        process.env.RESTAURANTOS_RUNTIME_URL = mockRuntimeUrl;

        try {
            // Link bistro.one and bistro_one to distinct canonical tenants
            const canonicalDot = 'org/platform/project/bistro-dot/environment/production';
            const canonicalUnderscore = 'org/platform/project/bistro-underscore/environment/production';

            registerRestaurantTenantLink('bistro.one', canonicalDot);
            registerRestaurantTenantLink('bistro_one', canonicalUnderscore);

            // 1. Invoke for bistro.one
            const reqDot = new NextRequest('http://localhost:3005/api/restaurant/kds');
            const resDot = await forwardSignedBridgeCall(reqDot, '/api/restaurant/kds', 'bistro.one');
            assert.equal(resDot.status, 200);
            const dataDot = await resDot.json();
            assert.equal(dataDot.tenant, canonicalDot);
            assert.deepEqual(dataDot.queue, ['ORDER_DOT_1', 'ORDER_DOT_2']);

            // 2. Invoke for bistro_one
            const reqUnderscore = new NextRequest('http://localhost:3005/api/restaurant/kds');
            const resUnderscore = await forwardSignedBridgeCall(reqUnderscore, '/api/restaurant/kds', 'bistro_one');
            assert.equal(resUnderscore.status, 200);
            const dataUnderscore = await resUnderscore.json();
            assert.equal(dataUnderscore.tenant, canonicalUnderscore);
            assert.deepEqual(dataUnderscore.queue, ['ORDER_UNDERSCORE_1']);

            // 3. Verify upstream isolation and cryptographic verification
            assert.equal(receivedRequests.length, 2);
            assert.ok(receivedRequests[0]);
            assert.equal(receivedRequests[0].tenant, canonicalDot);
            assert.equal(receivedRequests[0].authOk, true);
            assert.ok(receivedRequests[1]);
            assert.equal(receivedRequests[1].tenant, canonicalUnderscore);
            assert.equal(receivedRequests[1].authOk, true);

            // Ensure neither bumped or saw the other's kitchen queue
            assert.notEqual(dataDot.tenant, dataUnderscore.tenant);
        } finally {
            clearRestaurantTenantLinks();
            process.env.RESTAURANTOS_RUNTIME_URL = prevRuntimeUrl;
            await new Promise<void>((resolve) => server.close(() => resolve()));
        }
    });

    it('tenantLinkRegistry is strictly forbidden in production or non-test environments', () => {
        const prevEnv = process.env.NODE_ENV;
        try {
            Reflect.set(process.env, 'NODE_ENV', 'production');
            assert.throws(
                () => registerRestaurantTenantLink('plat_prod', 'org/plat/project/prod/environment/prod'),
                /tenantLinkRegistry is permitted only in test builds/
            );
            assert.throws(
                () => clearRestaurantTenantLinks(),
                /tenantLinkRegistry is permitted only in test builds/
            );

            Reflect.deleteProperty(process.env, 'NODE_ENV');
            assert.throws(
                () => registerRestaurantTenantLink('plat_prod', 'org/plat/project/prod/environment/prod'),
                /tenantLinkRegistry is permitted only in test builds/
            );
        } finally {
            if (prevEnv === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV');
            else Reflect.set(process.env, 'NODE_ENV', prevEnv);
        }
    });

    it('resolves non-canonical platform tenant from PluginInstallation table without environment fallback', async () => {
        const prevRepo = process.env.ORBITOX_PLATFORM_REPOSITORY;
        const prevEnv = process.env.NODE_ENV;
        process.env.ORBITOX_PLATFORM_REPOSITORY = 'json';
        Reflect.set(process.env, 'NODE_ENV', 'test');

        try {
            const canonicalTenant = 'org/orbitox/project/cafe-paris/environment/production';
            await platformRepository.provisionPluginInstallation({
                tenantId: 'cafe.paris',
                pluginId: '@orbitox/restaurant',
                runtimeTenantId: canonicalTenant,
                status: 'ACTIVE',
            });

            const resolved = await resolveLinkedRestaurantTenant('cafe.paris');
            assert.equal(resolved, canonicalTenant);

            // Inactive installation must not resolve
            await platformRepository.provisionPluginInstallation({
                tenantId: 'suspended.bistro',
                pluginId: '@orbitox/restaurant',
                runtimeTenantId: 'org/orbitox/project/suspended-bistro/environment/production',
                status: 'SUSPENDED',
            });
            const suspendedResolved = await resolveLinkedRestaurantTenant('suspended.bistro');
            assert.equal(suspendedResolved, undefined);

            // Unprovisioned tenant has no installation and returns undefined (zero fallback to default environment)
            const unlinked = await resolveLinkedRestaurantTenant('unlinked.unknown.cafe');
            assert.equal(unlinked, undefined);
        } finally {
            if (prevRepo === undefined) delete process.env.ORBITOX_PLATFORM_REPOSITORY;
            else process.env.ORBITOX_PLATFORM_REPOSITORY = prevRepo;
            if (prevEnv === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV');
            else Reflect.set(process.env, 'NODE_ENV', prevEnv);
        }
    });

    it('anti-claim: tenant B installation cannot claim tenant A runtime tenant ID', async () => {
        const prevRepo = process.env.ORBITOX_PLATFORM_REPOSITORY;
        const prevEnv = process.env.NODE_ENV;
        process.env.ORBITOX_PLATFORM_REPOSITORY = 'json';
        Reflect.set(process.env, 'NODE_ENV', 'test');

        try {
            const tenantARuntime = 'org/orbitox/project/tenant-alpha/environment/production';
            const tenantBRuntime = 'org/orbitox/project/tenant-bravo/environment/production';

            // 1. Tenant A successfully provisions runtimeTenantId
            const instA = await platformRepository.provisionPluginInstallation({
                tenantId: 'tenant_a_platform',
                pluginId: '@orbitox/restaurant',
                runtimeTenantId: tenantARuntime,
                status: 'ACTIVE',
            });
            assert.equal(instA.runtimeTenantId, tenantARuntime);
            assert.equal(instA.tenantId, 'tenant_a_platform');

            // 2. Tenant B attempts to claim Tenant A's runtimeTenantId -> MUST FAIL
            await assert.rejects(
                async () => {
                    await platformRepository.provisionPluginInstallation({
                        tenantId: 'tenant_b_platform',
                        pluginId: '@orbitox/restaurant',
                        runtimeTenantId: tenantARuntime,
                        status: 'ACTIVE',
                    });
                },
                (err: any) => {
                    assert.ok(
                        err.code === 'RUNTIME_TENANT_ALREADY_CLAIMED' ||
                        err.message.includes('already claimed by tenant "tenant_a_platform"'),
                        `Expected already-claimed error, got: ${err.message}`
                    );
                    return true;
                }
            );

            // 3. Even with alternative plugin alias ('restaurant' vs '@orbitox/restaurant'), anti-claim prevents collision
            await assert.rejects(
                async () => {
                    await platformRepository.provisionPluginInstallation({
                        tenantId: 'tenant_b_platform',
                        pluginId: 'restaurant',
                        runtimeTenantId: tenantARuntime,
                        status: 'ACTIVE',
                    });
                },
                (err: any) => {
                    assert.ok(
                        err.code === 'RUNTIME_TENANT_ALREADY_CLAIMED' ||
                        err.message.includes('already claimed by tenant "tenant_a_platform"'),
                        `Expected already-claimed error, got: ${err.message}`
                    );
                    return true;
                }
            );

            // 4. Tenant B provisions its own distinct runtimeTenantId successfully
            const instB = await platformRepository.provisionPluginInstallation({
                tenantId: 'tenant_b_platform',
                pluginId: '@orbitox/restaurant',
                runtimeTenantId: tenantBRuntime,
                status: 'ACTIVE',
            });
            assert.equal(instB.runtimeTenantId, tenantBRuntime);
            assert.equal(instB.tenantId, 'tenant_b_platform');

            // 5. Verification of independent routing resolution
            const resolvedA = await resolveLinkedRestaurantTenant('tenant_a_platform');
            const resolvedB = await resolveLinkedRestaurantTenant('tenant_b_platform');
            assert.equal(resolvedA, tenantARuntime);
            assert.equal(resolvedB, tenantBRuntime);
            assert.notEqual(resolvedA, resolvedB);
        } finally {
            if (prevRepo === undefined) delete process.env.ORBITOX_PLATFORM_REPOSITORY;
            else process.env.ORBITOX_PLATFORM_REPOSITORY = prevRepo;
            if (prevEnv === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV');
            else Reflect.set(process.env, 'NODE_ENV', prevEnv);
        }
    });
});