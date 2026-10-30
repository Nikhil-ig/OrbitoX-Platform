import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET as getQr } from '../app/api/restaurant/qr/[locator]/route';
import { POST as joinSession } from '../app/api/restaurant/sessions/join/route';
import { GET as getMenu } from '../app/api/restaurant/menu/route';
import { POST as createQuote } from '../app/api/restaurant/quote/route';
import { POST as submitOrder, GET as getOrder } from '../app/api/restaurant/orders/route';
import { GET as getKds } from '../app/api/restaurant/kds/route';
import { GET as getV1Menu } from '../app/api/v1/restaurant/menu/route';
import { GET as getV1Orders } from '../app/api/v1/restaurant/orders/route';

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
            Reflect.set(process.env, 'NODE_ENV', prevEnv);
        }
    });

    it('requires verified platform principal for staff/admin KDS route and disallows anonymous access', async () => {
        const anonymousKds = await getKds(new NextRequest('http://localhost:3005/api/restaurant/kds'));
        assert.equal(anonymousKds.status, 401);
    });
});