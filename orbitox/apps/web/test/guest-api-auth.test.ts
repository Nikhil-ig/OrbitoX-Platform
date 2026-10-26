import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST as joinSession } from '../app/api/restaurant/sessions/join/route';
import { GET as getMenu } from '../app/api/restaurant/menu/route';
import { POST as createQuote } from '../app/api/restaurant/quote/route';
import { POST as submitOrder, GET as getOrder } from '../app/api/restaurant/orders/route';
import { GET as getKds } from '../app/api/restaurant/kds/route';

describe('Restaurant guest and admin route authentication', () => {
    it('issues an expiring guest capability during session bootstrap and requires it on diner routes', async () => {
        Reflect.set(process.env, 'NODE_ENV', 'test');
        process.env.ORBITOX_GUEST_SECRET = 'test_guest_secret_32_characters_minimum';

        const joinResponse = await joinSession(new NextRequest('http://localhost:3005/api/restaurant/sessions/join', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ locator: '7Kp9xQ8m2L', displayName: 'Test Guest' }),
        }));
        assert.equal(joinResponse.status, 200);
        const joinBody = await joinResponse.json();
        const guestToken = joinBody.data.capabilityToken;
        assert.equal(typeof guestToken, 'string');
        assert.equal(guestToken.split('.').length, 2);

        const anonymousMenu = await getMenu(new NextRequest('http://localhost:3005/api/restaurant/menu'));
        const forgedMenu = await getMenu(new NextRequest('http://localhost:3005/api/restaurant/menu', {
            headers: { 'x-guest-token': `${guestToken.slice(0, -2)}xx` },
        }));
        const guestMenu = await getMenu(new NextRequest('http://localhost:3005/api/restaurant/menu', {
            headers: { 'x-guest-token': guestToken },
        }));
        const cartItems = [{ itemId: 'item_paneer_tikka', quantity: 1, selectedModifierIds: ['m_mild'] }];
        const quoteResponse = await createQuote(new NextRequest('http://localhost:3005/api/restaurant/quote', {
            method: 'POST',
            headers: { 'x-guest-token': guestToken, 'content-type': 'application/json' },
            body: JSON.stringify({ cartItems }),
        }));
        const quoteBody = await quoteResponse.json();
        const validOrder = await submitOrder(new NextRequest('http://localhost:3005/api/restaurant/orders', {
            method: 'POST',
            headers: { 'x-guest-token': guestToken, 'content-type': 'application/json' },
            body: JSON.stringify({ quoteId: quoteBody.data.quoteId, cartItems }),
        }));
        const anonymousOrderRead = await getOrder(new NextRequest('http://localhost:3005/api/restaurant/orders?orderId=missing'));
        const anonymousOrderWrite = await submitOrder(new NextRequest('http://localhost:3005/api/restaurant/orders', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ quoteId: 'missing', cartItems: [] }),
        }));
        const anonymousKds = await getKds(new NextRequest('http://localhost:3005/api/restaurant/kds'));

        assert.equal(anonymousMenu.status, 401);
        assert.equal(forgedMenu.status, 401);
        assert.equal(guestMenu.status, 200);
        assert.equal(quoteResponse.status, 200);
        assert.ok(quoteBody.data.quoteId);
        assert.equal(validOrder.status, 200);
        assert.equal(anonymousOrderRead.status, 401);
        assert.equal(anonymousOrderWrite.status, 401);
        assert.equal(anonymousKds.status, 401);
    });
});