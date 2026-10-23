import { NextResponse } from 'next/server';
import { withApiGuard } from '../_lib/guard';

export const GET = withApiGuard(
  {
    public: true,
    serviceId: 'openapi',
  },
  async () => {
    const openApiDoc = {
    openapi: '3.1.0',
    info: {
      title: 'OrbitoX SaaS Operating System Unified REST API',
      version: '1.4.0',
      description:
        'Zero-trust, multi-tenant modular REST API specifications for the OrbitoX Platform. Includes platform administration, cryptographic governance, rate limiting, and business domain engines (HMS, Commerce, CRM, Restaurant).',
      contact: {
        name: 'OrbitoX Platform Engineering',
        url: 'https://orbitox.io',
      },
    },
    servers: [
      {
        url: 'http://localhost:3005',
        description: 'Local OrbitoX OS Gateway',
      },
      {
        url: 'https://api.orbitox.io',
        description: 'Global Edge Anycast Gateway',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'Standard OrbitoX API Key (e.g. orb_live_...)',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Authorization: Bearer <token>',
        },
      },
    },
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    paths: {
      '/api/v1/admin/overview': {
        get: {
          tags: ['Platform Admin'],
          summary: 'Platform-wide telemetry, KPIs, and engine counts',
          responses: {
            200: { description: 'Live platform status returned' },
          },
        },
      },
      '/api/v1/admin/services': {
        get: {
          tags: ['Platform Admin'],
          summary: 'List all 9 core microservices and statuses',
          responses: { 200: { description: 'List of microservices' } },
        },
        post: {
          tags: ['Platform Admin'],
          summary: 'Toggle service status (active/blocked) or adjust quotas',
          responses: { 200: { description: 'Updated service state' } },
        },
      },
      '/api/v1/admin/providers': {
        get: {
          tags: ['Platform Admin'],
          summary: 'List multi-tenant business providers',
          parameters: [
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'status', in: 'query', schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'List of providers' } },
        },
        post: {
          tags: ['Platform Admin'],
          summary: 'Provision a new provider tenant with custom domain & quotas',
          responses: { 200: { description: 'Provider provisioned' } },
        },
      },
      '/api/v1/admin/api-keys': {
        get: {
          tags: ['Platform Admin'],
          summary: 'List issued API credentials',
          responses: { 200: { description: 'List of API keys' } },
        },
        post: {
          tags: ['Platform Admin'],
          summary: 'Issue a new Ed25519-compatible API credential',
          responses: { 200: { description: 'API key issued' } },
        },
      },
      '/api/v1/admin/quotas': {
        get: {
          tags: ['Platform Admin'],
          summary: 'Live platform quotas and limits consumption',
          responses: { 200: { description: 'Quota metrics' } },
        },
      },
      '/api/v1/admin/system': {
        get: {
          tags: ['Platform Admin'],
          summary: 'Cryptographic anti-tamper and frozen kernel facades status',
          responses: { 200: { description: 'Security audit passed' } },
        },
      },
      '/api/v1/hms/patients': {
        get: {
          tags: ['Hospital Management'],
          summary: 'Fetch hospital patient records (tenant scoped)',
          responses: { 200: { description: 'Patient records' } },
        },
        post: {
          tags: ['Hospital Management'],
          summary: 'Admit or register a new patient',
          responses: { 200: { description: 'Patient registered' } },
        },
      },
      '/api/v1/hms/triage/advance': {
        post: {
          tags: ['Hospital Management'],
          summary: 'Advance patient emergency triage state machine (Level 1-5)',
          responses: { 200: { description: 'Triage transitioned' } },
        },
      },
      '/api/v1/commerce/products': {
        get: {
          tags: ['Commerce'],
          summary: 'Query store catalog items and stock levels',
          responses: { 200: { description: 'Products list' } },
        },
        post: {
          tags: ['Commerce'],
          summary: 'Create or update catalog item',
          responses: { 200: { description: 'Product created' } },
        },
      },
      '/api/v1/commerce/checkout/initiate': {
        post: {
          tags: ['Commerce'],
          summary: 'Initiate zero-trust payment checkout flow',
          responses: { 200: { description: 'Checkout session created' } },
        },
      },
      '/api/v1/crm/leads': {
        get: {
          tags: ['CRM'],
          summary: 'Fetch sales pipeline leads and valuations',
          responses: { 200: { description: 'Leads list' } },
        },
        post: {
          tags: ['CRM'],
          summary: 'Ingest inbound lead opportunity',
          responses: { 200: { description: 'Lead ingested' } },
        },
      },
      '/api/v1/restaurant/orders': {
        get: {
          tags: ['Restaurant'],
          summary: 'Get active kitchen orders and tickets',
          responses: { 200: { description: 'Kitchen orders' } },
        },
        post: {
          tags: ['Restaurant'],
          summary: 'Place table or takeout order',
          responses: { 200: { description: 'Order placed' } },
        },
      },
    },
  };

    return NextResponse.json(openApiDoc, {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=3600',
      },
    });
  }
);
