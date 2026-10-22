import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';
import { ApiResponse, ApiRequestContext } from '@/app/api/v1/_lib/api-types';
import { PlatformRepository } from '@orbitox-io/plugin-engine';
import { auditService } from '@/app/api/v1/_lib/platform-governance';

export const GET = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform Vault Service',
    allowPublic: true,
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    PlatformRepository.initialize();
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId') || undefined;
    const environmentId = url.searchParams.get('environmentId') || undefined;

    const credentials = PlatformRepository.listCredentials({ projectId, environmentId });

    const enriched = credentials.map((cred) => {
      const project = PlatformRepository.getProject(cred.projectId);
      const environment = PlatformRepository.getEnvironment(cred.environmentId);
      return {
        ...cred,
        encryptedPayload: undefined,
        projectName: project?.name || 'Unknown Project',
        environmentName: environment?.name || 'Unknown Environment',
      };
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: enriched,
      meta: {
        latencyMs: 1,
        timestamp: new Date().toISOString(),
        requestId: ctx.requestId,
      },
    });
  }
);

export const POST = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform Vault Service',
    requiredScopes: ['platform.credentials.create', 'admin'],
    allowPublic: false,
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    try {
      const body = await req.json();
      const { name, provider, environmentId, projectId, plaintextSecret, ownerEmail, rotationIntervalDays } = body;

      if (!name || !provider || !environmentId || !projectId || !plaintextSecret) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: 'name, provider, environmentId, projectId, and plaintextSecret are required',
            },
            meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
          },
          { status: 400 }
        );
      }

      const credential = PlatformRepository.createCredential({
        name,
        provider,
        environmentId,
        projectId,
        plaintextSecret,
        ownerEmail: ownerEmail || ctx.apiKey || 'operator@orbitox.io',
        rotationIntervalDays: rotationIntervalDays ? Number(rotationIntervalDays) : 90,
      });

      // Immutable audit log (never plaintext)
      await auditService.log({
        action: 'CREDENTIAL_VAULTED',
        entityType: 'PLATFORM_CREDENTIAL',
        entityId: credential.id,
        userId: ctx.apiKey || 'platform_admin',
        contextId: ctx.tenantId || 'global',
        reason: `Envelope-encrypted external [${provider}] credential for environment [${environmentId}]`,
        newValue: {
          credentialId: credential.id,
          provider: credential.provider,
          maskedSecret: (credential as any).maskedDisplay || (credential as any).maskedSecret,
          kekVersion: (credential as any).envelope?.kekVersion || (credential as any).kekVersion,
          algorithm: (credential as any).envelope?.algorithm || (credential as any).algorithm,
        },
      });

      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          ...credential,
          encryptedPayload: undefined,
          message: 'Credential successfully envelope-encrypted via AES-256-GCM and committed to vault.',
        },
        meta: {
          latencyMs: 1,
          timestamp: new Date().toISOString(),
          requestId: ctx.requestId,
        },
      });
    } catch (err: any) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { code: 'VAULT_STORE_FAILED', message: err.message },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        },
        { status: 500 }
      );
    }
  }
);
