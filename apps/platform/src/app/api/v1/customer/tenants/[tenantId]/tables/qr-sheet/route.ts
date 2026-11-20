import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import { noStoreHeaders, getCustomerOrganizationRole } from '@/server/organizations/customer-dashboard';
import { prisma } from '@/server/db/prisma';
import { signBridgeRequest, getDefaultBridgeKeys } from '@orbitox-io/bridge';
import { recordQrDownloaded } from '@/server/onboarding/checklist-service';

type RouteContext = { params: Promise<{ tenantId: string }> };

async function resolveProject(rawParam: string) {
  const decodedParam = decodeURIComponent(rawParam).trim();
  let project = await prisma.platformProject.findFirst({
    where: {
      OR: [
        { slug: decodedParam },
        { id: decodedParam },
        { slug: decodedParam.replace(/^tenant_/, '') },
      ],
    },
    include: { environments: true },
  });

  if (!project && decodedParam.includes('project/')) {
    const match = /project\/([^/]+)/.exec(decodedParam);
    if (match && match[1]) {
      project = await prisma.platformProject.findFirst({
        where: {
          OR: [
            { id: match[1] },
            { slug: match[1] },
          ],
        },
        include: { environments: true },
      });
    }
  }

  return project;
}

interface TableRecord {
  id: number | string;
  number: string;
  capacity?: number;
  section?: string;
  locator: string;
}

export const GET = withCustomerAuth<RouteContext>(
  async (_request: NextRequest, session, context) => {
    const { tenantId: rawParam } = await context.params;
    const project = await resolveProject(rawParam);
    if (!project) {
      return NextResponse.json(
        { ok: false, error: 'PROJECT_NOT_FOUND', message: 'Restaurant project not found.' },
        { status: 404, headers: noStoreHeaders() },
      );
    }

    const role = await getCustomerOrganizationRole(project.organizationId, session.userId);
    if (!role) {
      return NextResponse.json(
        { ok: false, error: 'UNAUTHORIZED_FOR_ORGANIZATION', message: 'Access denied to this restaurant project.' },
        { status: 403, headers: noStoreHeaders() },
      );
    }

    const canonicalTenantId =
      project.environments.find((e) => e.isProduction)?.id
        ? `org/${project.organizationId}/project/${project.id}/environment/${project.environments.find((e) => e.isProduction)!.id}`
        : `tenant_${project.slug}`;

    const configuredUrl = process.env.ORBITOX_PUBLIC_BASE_URL;
    let baseDomain = 'orbitox.io';
    if (configuredUrl) {
      try {
        baseDomain = new URL(configuredUrl).hostname;
      } catch {}
    }

    // Retrieve live tables via RestaurantOS runtime bridge
    let tables: TableRecord[] = [];
    let bridgeError = false;
    const runtimeUrl =
      process.env.RESTAURANTOS_RUNTIME_URL ||
      process.env.RESTAURANT_STORE_URL ||
      'http://127.0.0.1:4010';

    try {
      const bridgeKeys = getDefaultBridgeKeys();
      const pathWithQuery = '/api/restaurant/tables';
      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'GET',
        pathWithQuery,
        tenantId: canonicalTenantId,
        principal: { sub: session.userId, scopes: ['tenant:admin', 'tables:read'] },
      });

      const res = await fetch(new URL(pathWithQuery, runtimeUrl).toString(), {
        headers: signedHeaders,
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.tables) && json.tables.length > 0) {
          tables = json.tables;
        }
      } else {
        bridgeError = true;
      }
    } catch {
      bridgeError = true;
    }

    // Fallback: Query platform database for provisioned restaurant tables
    if (tables.length === 0) {
      try {
        const dbTables = await prisma.restaurantTable.findMany({
          where: {
            OR: [
              { tenantId: canonicalTenantId },
              { tenantId: project.id },
              { tenantId: `tenant_${project.slug}` },
            ],
          },
          include: { qrIdentity: true, serviceArea: true },
          orderBy: { tableNumber: 'asc' },
        });

        if (dbTables.length > 0) {
          tables = dbTables.map((t) => ({
            id: t.id,
            number: t.tableNumber,
            capacity: t.capacity,
            section: t.serviceArea?.name || 'Main Dining',
            locator:
              t.qrIdentity?.locator ||
              crypto.createHmac('sha256', project.id).update(t.id).digest('base64url').slice(0, 12),
          }));
        }
      } catch {}
    }

    // Fail honestly if no tables exist
    if (tables.length === 0) {
      if (bridgeError) {
        return NextResponse.json(
          {
            ok: false,
            error: 'SERVICE_UNAVAILABLE',
            message: 'RestaurantOS runtime backend is currently unreachable and no table records exist.',
          },
          { status: 503, headers: noStoreHeaders() },
        );
      }
      return NextResponse.json(
        {
          ok: false,
          error: 'NO_TABLES_FOUND',
          message: 'No tables provisioned for this restaurant. Please create dining tables in floor management before generating QR placards.',
        },
        { status: 404, headers: noStoreHeaders() },
      );
    }

    // Generate SVG QR codes for all tables
    const tableCards = await Promise.all(
      tables.map(async (table) => {
        const dinerUrl = `https://${project.slug}.${baseDomain}/dine/${table.locator}`;
        let svgQr = '';
        try {
          svgQr = await QRCode.toString(dinerUrl, {
            type: 'svg',
            margin: 1,
            width: 160,
            color: { dark: '#0F172A', light: '#FFFFFF' },
          });
        } catch {
          svgQr = `<div class="qr-placeholder">QR Code: ${dinerUrl}</div>`;
        }

        return `
          <div class="placard">
            <div class="placard-cut-guide"></div>
            <div class="placard-header">
              <div class="brand-row">
                <span class="brand-name">OrbitoX</span>
                <span class="restaurant-name">${escapeHtml(project.name)}</span>
              </div>
              <div class="table-badge">${escapeHtml(table.number)}</div>
            </div>

            <div class="qr-wrapper">
              ${svgQr}
            </div>

            <div class="placard-footer">
              <div class="instruction">Scan with Camera to Order</div>
              <div class="sub-instruction">Touchless Digital Menu & Instant Pay</div>
              <div class="url-line">${escapeHtml(dinerUrl)}</div>
            </div>
          </div>
        `;
      }),
    );

    // Build standalone print HTML document
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OrbitoX — Table QR Placards (${escapeHtml(project.name)})</title>
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f1f5f9;
      color: #0f172a;
      padding: 24px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-bar {
      max-width: 960px;
      margin: 0 auto 24px auto;
      background: #0f172a;
      color: #ffffff;
      padding: 16px 24px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .print-btn {
      background: #10b981;
      color: #0f172a;
      border: none;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .print-btn:hover {
      background: #34d399;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
      max-width: 960px;
      margin: 0 auto;
    }
    .placard {
      background: #ffffff;
      border: 2px dashed #cbd5e1;
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .placard-header {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    .brand-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      font-weight: 600;
    }
    .brand-name {
      color: #10b981;
      font-weight: 800;
    }
    .restaurant-name {
      color: #0f172a;
      font-weight: 700;
      font-size: 14px;
    }
    .table-badge {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      padding: 6px 16px;
      border-radius: 9999px;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    .qr-wrapper {
      padding: 12px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      margin: 12px 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-wrapper svg {
      display: block;
      width: 160px;
      height: 160px;
    }
    .placard-footer {
      margin-top: 8px;
    }
    .instruction {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
    }
    .sub-instruction {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
    }
    .url-line {
      font-size: 9px;
      color: #94a3b8;
      margin-top: 8px;
      word-break: break-all;
      font-family: monospace;
    }

    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .print-bar {
        display: none !important;
      }
      .grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }
      .placard {
        border: 1px solid #94a3b8;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <div>
      <h2 style="font-size: 16px; font-weight: 700;">Print Ready Table Placards</h2>
      <p style="font-size: 12px; color: #94a3b8;">${tables.length} tables generated for ${escapeHtml(project.name)}</p>
    </div>
    <button class="print-btn" onclick="window.print()">Print Placards</button>
  </div>

  <div class="grid">
    ${tableCards.join('\n')}
  </div>
</body>
</html>`;

    // Record authoritative evidence that artifact was downloaded
    await recordQrDownloaded(canonicalTenantId, session.userId, tables.length).catch(() => {});

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="qr-placards-${project.slug}.html"`,
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  },
  { write: false, allowMfaSetup: true },
);

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
