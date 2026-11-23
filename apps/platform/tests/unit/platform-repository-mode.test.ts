import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { platformRepository } from '@/server/db/platform-repository';

describe('platform repository mode policy', () => {
    it('defaults to Prisma and permits JSON only with explicit non-production NODE_ENV', () => {
        const previousNodeEnv = process.env.NODE_ENV;
        const previousMode = process.env.ORBITOX_PLATFORM_REPOSITORY;
        try {
            Reflect.set(process.env, 'NODE_ENV', 'test');
            delete process.env.ORBITOX_PLATFORM_REPOSITORY;
            assert.equal(platformRepository.isPrismaBacked(), true);

            process.env.ORBITOX_PLATFORM_REPOSITORY = 'json';
            assert.equal(platformRepository.isPrismaBacked(), false);

            Reflect.set(process.env, 'NODE_ENV', 'production');
            assert.throws(() => platformRepository.isPrismaBacked(), /JSON platform repository mode/);

            Reflect.deleteProperty(process.env, 'NODE_ENV');
            assert.throws(() => platformRepository.isPrismaBacked(), /JSON platform repository mode/);
        } finally {
            if (previousNodeEnv === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV');
            else Reflect.set(process.env, 'NODE_ENV', previousNodeEnv);
            if (previousMode === undefined) delete process.env.ORBITOX_PLATFORM_REPOSITORY;
            else process.env.ORBITOX_PLATFORM_REPOSITORY = previousMode;
        }
    });

    it('enforces OUTBOX_RELAY_DATABASE_URL in production mode and rejects if missing', () => {
        const { spawnSync } = require('node:child_process');
        const scriptMissing = `
            process.env.NODE_ENV = 'production';
            delete process.env.ORBITOX_PLATFORM_REPOSITORY;
            process.env.APP_DATABASE_URL = 'postgresql://orbitox_runtime:pwd@127.0.0.1:5432/orbitox_staging';
            process.env.PLATFORM_ADMIN_AUDIT_DATABASE_URL = 'postgresql://orbitox_platform_admin_audit:pwd@127.0.0.1:5432/orbitox_staging';
            delete process.env.OUTBOX_RELAY_DATABASE_URL;

            import('./src/server/db/platform-repository.js').then(m => {
                const repo = m.platformRepository || m.default?.platformRepository;
                repo.getProject('test');
            });
        `;

        const resMissing = spawnSync(
            'pnpm',
            ['exec', 'tsx', '-e', scriptMissing],
            {
                cwd: process.cwd(),
                encoding: 'utf8',
                env: { ...process.env, NODE_OPTIONS: '--conditions=react-server' },
            }
        );
        assert.equal(resMissing.status, 1);
        assert.match(resMissing.stderr, /OUTBOX_RELAY_DATABASE_URL is required for the outbox relay role in production/);

        // With OUTBOX_RELAY_DATABASE_URL provided
        const scriptWithRelay = `
            process.env.NODE_ENV = 'production';
            delete process.env.ORBITOX_PLATFORM_REPOSITORY;
            process.env.APP_DATABASE_URL = 'postgresql://orbitox_runtime:pwd@127.0.0.1:5432/orbitox_staging';
            process.env.PLATFORM_ADMIN_AUDIT_DATABASE_URL = 'postgresql://orbitox_platform_admin_audit:pwd@127.0.0.1:5432/orbitox_staging';
            process.env.OUTBOX_RELAY_DATABASE_URL = 'postgresql://orbitox_outbox_relay:pwd@127.0.0.1:5432/orbitox_staging';

            import('./src/server/db/platform-repository.js').then(m => {
                const repo = m.platformRepository || m.default?.platformRepository;
                try {
                    repo.getProject('test').catch(() => process.exit(0));
                } catch {
                    process.exit(0);
                }
            });
        `;

        const resWithRelay = spawnSync(
            'pnpm',
            ['exec', 'tsx', '-e', scriptWithRelay],
            {
                cwd: process.cwd(),
                encoding: 'utf8',
                env: { ...process.env, NODE_OPTIONS: '--conditions=react-server' },
            }
        );
        assert.doesNotMatch(resWithRelay.stderr || '', /OUTBOX_RELAY_DATABASE_URL is required/);
    });
});
