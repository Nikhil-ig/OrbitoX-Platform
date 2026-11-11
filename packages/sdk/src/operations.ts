/**
 * 🪐 OrbitoX SDK - Operations Resource
 */

import { HttpTransport } from './transport';
import { OrbitoXApiError, OrbitoXTimeoutError } from './errors';

export interface PlatformOperationStep {
  id: string;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
  retryCount?: number;
}

export interface PlatformOperationResponse {
  id: string;
  operationId: string;
  type: string;
  tenantId: string;
  organizationId?: string;
  status: 'QUEUED' | 'PROVISIONING' | 'COMPLETED' | 'ACTIVE' | 'FAILED' | 'COMPENSATING' | 'ROLLED_BACK';
  steps: PlatformOperationStep[];
  request?: any;
  result?: any;
  error?: string;
  operatorId?: string;
  requestId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface WaitUntilReadyOptions {
  pollIntervalMs?: number;
  timeoutMs?: number;
}

export class OperationsResource {
  constructor(private readonly transport: HttpTransport) {}

  async get(operationId: string): Promise<PlatformOperationResponse> {
    return this.transport.request<PlatformOperationResponse>({
      method: 'GET',
      path: `/api/v1/operations/${encodeURIComponent(operationId)}`,
    });
  }

  async waitUntilReady(
    operationId: string,
    options: WaitUntilReadyOptions = {}
  ): Promise<PlatformOperationResponse> {
    const pollIntervalMs = options.pollIntervalMs ?? 300;
    const timeoutMs = options.timeoutMs ?? 60000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const op = await this.get(operationId);

      if (op.status === 'COMPLETED' || (op.status as string) === 'ACTIVE') {
        return op;
      }

      if (op.status === 'FAILED' || op.status === 'ROLLED_BACK') {
        throw new OrbitoXApiError({
          message: op.error || `Operation ${operationId} terminated with status ${op.status}`,
          status: 500,
          code: 'PROVISIONING_FAILED',
          details: op,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new OrbitoXTimeoutError(
      `Operation ${operationId} did not reach completion within ${timeoutMs}ms`
    );
  }
}
