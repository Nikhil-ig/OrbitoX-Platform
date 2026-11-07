import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const baseUrl = (process.env.PHASE16_BASE_URL || 'http://127.0.0.1:3105').replace(/\/$/, '');
const workDir = process.env.PHASE16_WORK_DIR;
const mode = process.env.PHASE16_MODE || 'smoke';
if (!workDir) throw new Error('PHASE16_WORK_DIR is required.');

const stateFile = path.join(workDir, 'state.json');
const secrets = fs.readFileSync(process.env.PHASE16_SECRET_FILE, 'utf8').trim().split('\n');
const [adminToken] = secrets;
const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {};
let checked = 0;

async function call(route, method = 'GET', headers = {}, body) {
    const response = await fetch(`${baseUrl}${route}`, {
        method,
        headers: {
            ...(body === undefined ? {} : { 'content-type': 'application/json' }),
            ...headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        redirect: 'manual',
    });
    checked++;
    return response;
}

async function expectStatus(label, response, expected) {
    assert.equal(response.status, expected, `${label}: expected ${expected}, got ${response.status}`);
}

function saveState() {
    fs.writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 });
}

async function verifyUnauthenticatedRoutes() {
    const guardedRoutes = [
        ['/api/hospital/admissions', 'POST'],
        ['/api/hospital/appointments', 'GET'], ['/api/hospital/appointments', 'POST'],
        ['/api/hospital/appointments/live-missing-id', 'PATCH'], ['/api/hospital/appointments/live-missing-id', 'DELETE'],
        ['/api/hospital/audit', 'GET'],
        ['/api/hospital/beds', 'GET'], ['/api/hospital/beds', 'POST'],
        ['/api/hospital/beds/live-missing-id', 'PATCH'], ['/api/hospital/beds/live-missing-id', 'POST'],
        ['/api/hospital/billing', 'GET'], ['/api/hospital/billing', 'POST'],
        ['/api/hospital/billing/pay/live-missing-id', 'POST'],
        ['/api/hospital/departments', 'GET'],
        ['/api/hospital/hierarchy', 'GET'], ['/api/hospital/hierarchy', 'POST'],
        ['/api/hospital/labs', 'GET'], ['/api/hospital/labs', 'POST'],
        ['/api/hospital/labs/live-missing-id/results', 'POST'],
        ['/api/hospital/patients', 'GET'], ['/api/hospital/patients', 'POST'],
        ['/api/hospital/patients/live-missing-id', 'PATCH'], ['/api/hospital/patients/live-missing-id', 'POST'], ['/api/hospital/patients/live-missing-id', 'DELETE'],
        ['/api/hospital/reset-seed', 'POST'],
        ['/api/hospital/security/break-glass', 'POST'], ['/api/hospital/security/drill', 'POST'],
        ['/api/hospital/security/login', 'POST'], ['/api/hospital/security/permissions', 'GET'],
        ['/api/hospital/security/purge-sanitized', 'POST'], ['/api/hospital/security/roles', 'GET'],
        ['/api/hospital/security/session', 'GET'],
        ['/api/hospital/security/staff', 'GET'], ['/api/hospital/security/staff', 'POST'],
        ['/api/hospital/security/staff/live-missing-id', 'GET'], ['/api/hospital/security/staff/live-missing-id', 'PUT'],
        ['/api/hospital/security/staff/live-missing-id', 'PATCH'], ['/api/hospital/security/staff/live-missing-id', 'DELETE'],
        ['/api/hospital/security/staff/live-missing-id/toggle-duty', 'POST'],
        ['/api/hospital/stats', 'GET'], ['/api/hospital/telemetry', 'POST'],
        ['/api/hospital/treatments', 'GET'], ['/api/hospital/treatments', 'POST'], ['/api/hospital/treatments', 'PATCH'],
        ['/api/restaurant/kds', 'GET'], ['/api/restaurant/kds', 'POST'],
        ['/api/restaurant/menu', 'GET'], ['/api/restaurant/orders', 'GET'], ['/api/restaurant/orders', 'POST'],
        ['/api/restaurant/quote', 'POST'],
    ];
    const sensitive = new Set([
        '/api/hospital/audit', '/api/hospital/reset-seed', '/api/hospital/telemetry',
        '/api/hospital/security/break-glass', '/api/hospital/security/drill', '/api/hospital/security/login',
        '/api/hospital/security/permissions', '/api/hospital/security/purge-sanitized', '/api/hospital/security/roles',
        '/api/hospital/security/session', '/api/hospital/security/staff', '/api/hospital/security/staff/live-missing-id',
        '/api/hospital/security/staff/live-missing-id/toggle-duty', '/api/restaurant/kds',
    ]);
    let routeCount = 0;
    for (const [route, method] of guardedRoutes) {
        const expected = [...sensitive].some((prefix) => route === prefix || route.startsWith(`${prefix}/`)) ? 404 : 401;
        const cases = [
            ['anonymous', {}],
            ['dummy', { 'x-api-key': 'dummy-invalid-credential' }],
            ['forged-principal', {
                'x-orbitox-principal': 'admin',
                'x-orbitox-internal-sig': 'forged-signature',
                'x-orbitox-internal-ts': String(Date.now()),
            }],
        ];
        for (const [label, headers] of cases) {
            await expectStatus(`${route} ${method} ${label}`, await call(route, method, headers), expected);
        }
        routeCount++;
    }
    return routeCount;
}

async function provisionCustomer() {
    const response = await call('/api/v1/admin/projects', 'POST', {
        authorization: `Bearer ${adminToken}`,
    }, {
        name: `Phase 1.6 HTTP ${Date.now()}`,
        slug: `phase16-http-${Date.now()}`,
        organization: 'Phase 1.6 HTTP Test Organization',
        enabledServices: ['hms', 'crm', 'restaurant'],
        customQuota: 100,
    });
    await expectStatus('admin Bearer project provisioning', response, 201);
    const result = await response.json();
    state.projectId = result.data.project.id;
    state.projectSlug = result.data.project.slug;
    state.keyId = result.data.apiKey.id;
    state.customerKey = result.data.apiKey.rawKey;
    saveState();
}

async function provisionSecondHospitalCustomer() {
    const response = await call('/api/v1/admin/projects', 'POST', {
        authorization: `Bearer ${adminToken}`,
    }, {
        name: `Phase 1.6 HTTP Isolation ${Date.now()}`,
        slug: `phase16-isolation-${Date.now()}`,
        organization: 'Phase 1.6 HTTP Isolation Organization',
        enabledServices: ['hms'],
        customQuota: 100,
    });
    await expectStatus('second hospital tenant provisioning', response, 201);
    state.secondCustomerKey = (await response.json()).data.apiKey.rawKey;
    saveState();
}

async function createQuotaCustomer(label) {
    const response = await call('/api/v1/admin/projects', 'POST', {
        authorization: `Bearer ${adminToken}`,
    }, {
        name: `Phase 1.6 HTTP ${label} ${Date.now()}`,
        slug: `phase16-${label.toLowerCase()}-${Date.now()}`,
        organization: `Phase 1.6 HTTP ${label} Organization`,
        enabledServices: ['crm'],
        customQuota: 10,
    });
    await expectStatus('quota test project provisioning', response, 201);
    const project = (await response.json()).data.project;
    const keyResponse = await call('/api/v1/admin/api-keys', 'POST', {
        authorization: `Bearer ${adminToken}`,
    }, {
        name: `Phase 1.6 HTTP ${label} Key`,
        serviceId: 'crm',
        projectId: project.id,
        environment: 'production',
        scopes: ['crm:read'],
        tenantScope: [project.slug],
    });
    await expectStatus('quota test API key issuance', keyResponse, 200);
    return { project, key: (await keyResponse.json()).data.rawSecret };
}

async function readProjectUsage(projectId) {
    const response = await call(`/api/v1/admin/projects/${encodeURIComponent(projectId)}`, 'GET', {
        authorization: `Bearer ${adminToken}`,
    });
    await expectStatus('quota project usage read', response, 200);
    return (await response.json()).data.monthlyApiCalls;
}

async function verifyQuotaSequential() {
    const { project, key } = await createQuotaCustomer('SequentialQuota');
    const responses = [];
    for (let index = 0; index < 10; index++) {
        responses.push(await call('/api/v1/crm/leads', 'GET', { 'x-api-key': key }));
    }
    const successCount = responses.filter((response) => response.status === 200).length;
    assert.equal(successCount, 10);
    await expectStatus('sequential request beyond quota', await call('/api/v1/crm/leads', 'GET', {
        'x-api-key': key,
    }), 429);
    assert.equal(await readProjectUsage(project.id), successCount);
    return successCount;
}

async function verifyQuotaConcurrency() {
    const { project, key } = await createQuotaCustomer('ParallelQuota');
    const responses = await Promise.all(Array.from({ length: 50 }, () => call(
        '/api/v1/crm/leads',
        'GET',
        { 'x-api-key': key }
    )));
    const successCount = responses.filter((response) => response.status === 200).length;
    const quotaDeniedCount = responses.filter((response) => response.status === 429).length;
    assert.equal(successCount, 10);
    assert.equal(quotaDeniedCount, 40);

    assert.equal(await readProjectUsage(project.id), successCount);
    return { successCount, quotaDeniedCount };
}

async function verifyCustomerAndGuestFlows() {
    const customerHeaders = { 'x-api-key': state.customerKey };
    const adminBasic = Buffer.from(`arbitrary:${adminToken}`).toString('base64');
    await expectStatus('admin Basic management API', await call('/api/v1/admin/projects', 'GET', {
        authorization: `Basic ${adminBasic}`,
    }), 200);

    const before = await call('/api/hospital/patients', 'GET', customerHeaders);
    await expectStatus('licensed hospital read', before, 200);
    const beforeCount = (await before.json()).data.length;
    await expectStatus('anonymous patient write', await call('/api/hospital/patients', 'POST', {}, { name: 'Must Not Be Created' }), 401);
    const after = await call('/api/hospital/patients', 'GET', customerHeaders);
    await expectStatus('licensed hospital read after denied write', after, 200);
    assert.equal((await after.json()).data.length, beforeCount, 'anonymous patient POST changed tenant data');

    const patientWrite = await call('/api/hospital/patients', 'POST', customerHeaders, {
        name: 'Authenticated Phase 1.6 Patient', age: 35, gender: 'Other', category: 'outpatient',
    });
    await expectStatus('licensed hospital write', patientWrite, 200);
    const createdPatient = await call('/api/hospital/patients', 'GET', customerHeaders);
    await expectStatus('licensed patient read after write', createdPatient, 200);
    assert.ok((await createdPatient.json()).data.some((patient) => patient.name === 'Authenticated Phase 1.6 Patient'));
    const otherTenantPatients = await call('/api/hospital/patients', 'GET', {
        'x-api-key': state.secondCustomerKey,
    });
    await expectStatus('second tenant hospital read', otherTenantPatients, 200);
    assert.equal(
        (await otherTenantPatients.json()).data.some((patient) => patient.name === 'Authenticated Phase 1.6 Patient'),
        false,
        'a second hospital tenant read another tenant patient'
    );

    await expectStatus('production-disabled hospital reset-seed', await call('/api/hospital/reset-seed', 'POST', {
        authorization: `Bearer ${adminToken}`,
    }), 404);
    await expectStatus('public QR discovery', await call('/api/restaurant/qr/7Kp9xQ8m2L'), 200);
    const join = await call('/api/restaurant/sessions/join', 'POST', {}, {
        locator: '7Kp9xQ8m2L', displayName: 'HTTP Test Guest',
    });
    await expectStatus('guest session bootstrap', join, 200);
    const guestToken = (await join.json()).data.capabilityToken;
    assert.equal(typeof guestToken, 'string');
    await expectStatus('guest menu without token', await call('/api/restaurant/menu'), 401);
    await expectStatus('guest menu with forged token', await call('/api/restaurant/menu', 'GET', {
        'x-guest-token': `${guestToken.slice(0, -2)}xx`,
    }), 401);
    await expectStatus('guest menu with signed token', await call('/api/restaurant/menu', 'GET', {
        'x-guest-token': guestToken,
    }), 200);

    const quote = await call('/api/restaurant/quote', 'POST', { 'x-guest-token': guestToken }, {
        cartItems: [{ itemId: 'item_paneer_tikka', quantity: 1, selectedModifierIds: ['m_mild'] }],
    });
    await expectStatus('guest quote with signed token', quote, 200);
    const quoteId = (await quote.json()).data.quoteId;
    const order = await call('/api/restaurant/orders', 'POST', { 'x-guest-token': guestToken }, {
        quoteId,
        cartItems: [{ itemId: 'item_paneer_tikka', quantity: 1, selectedModifierIds: ['m_mild'] }],
        idempotencyKey: `phase16-${Date.now()}`,
    });
    await expectStatus('guest order write with signed token', order, 200);
    const orderId = (await order.json()).data.orderId;
    await expectStatus('guest own order read', await call(`/api/restaurant/orders?orderId=${encodeURIComponent(orderId)}`, 'GET', {
        'x-guest-token': guestToken,
    }), 200);

    const crm = await call('/api/v1/crm/leads', 'GET', customerHeaders);
    await expectStatus('customer key licensed CRM route', crm, 200);
}

async function main() {
    if (mode === 'smoke') {
        await expectStatus('public health', await call('/api/health'), 200);
        await expectStatus('public OpenAPI', await call('/api/v1/openapi.json'), 200);
        const routeCount = await verifyUnauthenticatedRoutes();
        await provisionCustomer();
        await provisionSecondHospitalCustomer();
        await verifyCustomerAndGuestFlows();
        const sequentialSuccesses = await verifyQuotaSequential();
        const quota = await verifyQuotaConcurrency();
        console.log(`HTTP smoke passed: ${checked} requests; ${routeCount} protected legacy route-methods checked with anonymous, dummy, and forged principal credentials; sequential quota ${sequentialSuccesses}/10; concurrency ${quota.successCount} successes/${quota.quotaDeniedCount} denials.`);
        return;
    }

    if (mode === 'quota') {
        const sequentialSuccesses = await verifyQuotaSequential();
        const quota = await verifyQuotaConcurrency();
        console.log(`HTTP quota passed: ${checked} requests; sequential quota ${sequentialSuccesses}/10; concurrency ${quota.successCount} successes/${quota.quotaDeniedCount} denials.`);
        return;
    }

    if (!state.customerKey || !state.keyId) throw new Error('No persisted customer key state. Run smoke mode first.');
    if (mode === 'verify') {
        await expectStatus('persisted customer key after restart', await call('/api/v1/crm/leads', 'GET', {
            'x-api-key': state.customerKey,
        }), 200);
    } else if (mode === 'rotate') {
        const response = await call(`/api/v1/admin/api-keys/${encodeURIComponent(state.keyId)}/rotate`, 'POST', {
            authorization: `Bearer ${adminToken}`,
        }, {});
        await expectStatus('admin key rotation', response, 200);
        const result = await response.json();
        state.oldCustomerKey = state.customerKey;
        state.customerKey = result.data.rawSecret;
        state.keyId = result.data.keyRecord.id;
        saveState();
        await expectStatus('old key after rotation', await call('/api/v1/crm/leads', 'GET', {
            'x-api-key': state.oldCustomerKey,
        }), 403);
        await expectStatus('new key after rotation', await call('/api/v1/crm/leads', 'GET', {
            'x-api-key': state.customerKey,
        }), 200);
    } else if (mode === 'verify-rotated') {
        await expectStatus('rotated key after restart', await call('/api/v1/crm/leads', 'GET', {
            'x-api-key': state.customerKey,
        }), 200);
        await expectStatus('old key remains disabled after restart', await call('/api/v1/crm/leads', 'GET', {
            'x-api-key': state.oldCustomerKey,
        }), 403);
    } else if (mode === 'revoke') {
        await expectStatus('admin key revocation', await call(`/api/v1/admin/api-keys/${encodeURIComponent(state.keyId)}`, 'DELETE', {
            authorization: `Bearer ${adminToken}`,
        }), 200);
        saveState();
    } else if (mode === 'verify-revoked') {
        await expectStatus('revoked key remains disabled after restart', await call('/api/v1/crm/leads', 'GET', {
            'x-api-key': state.customerKey,
        }), 403);
    } else {
        throw new Error(`Unknown PHASE16_MODE: ${mode}`);
    }
    console.log(`HTTP ${mode} passed: ${checked} requests; response bodies and credentials suppressed.`);
}

main().catch((error) => {
    console.error(`HTTP verification failed after ${checked} requests: ${error.message}`);
    process.exitCode = 1;
});
