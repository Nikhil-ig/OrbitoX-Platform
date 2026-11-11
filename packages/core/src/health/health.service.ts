import { Injectable } from '@nestjs/common';

export interface HealthCheckResult {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  services: {
    redis: 'up' | 'down';
    postgres: 'up' | 'down';
    memory: {
      heapUsedMb: number;
      heapTotalMb: number;
    };
  };
}

@Injectable()
export class HealthService {
  async check(): Promise<HealthCheckResult> {
    const memory = process.memoryUsage();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        redis: 'up',
        postgres: 'up',
        memory: {
          heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
          heapTotalMb: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
        },
      },
    };
  }
}
