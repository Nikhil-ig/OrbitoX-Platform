import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { register } from '../instrumentation';
import { containsBuildPepper, createBuildEnvironment } from '../scripts/build-next-with-temporary-pepper.mjs';
import { patchStandaloneStartup } from '../scripts/patch-standalone-startup.mjs';

describe('Production startup secret validation', () => {
    it('rejects a missing server pepper even when NEXT_PHASE claims build mode', async () => {
        const environment = { ...process.env };
        Reflect.set(process.env, 'NODE_ENV', 'production');
        process.env.NEXT_RUNTIME = 'nodejs';
        process.env.NEXT_PHASE = 'phase-production-build';
        process.env.ORBITOX_ADMIN_TOKEN = 'admin_secret_32_characters_minimum_000';
        process.env.ORBITOX_RUNTIME_TOKEN = 'runtime_secret_32_characters_minimum_0';
        process.env.ORBITOX_CONTROL_SECRET = 'control_secret_32_characters_minimum_';
        process.env.ORBITOX_GUEST_SECRET = 'guest_secret_32_characters_minimum_00';
        delete process.env.ORBITOX_SERVER_PEPPER;

        try {
            await assert.rejects(register(), (error: Error) => {
                assert.match(error.message, /ORBITOX_SERVER_PEPPER is not set/);
                assert.match(error.message, /OrbitoX cannot start: invalid production configuration/);
                return true;
            });
        } finally {
            for (const key of Object.keys(process.env)) {
                if (!(key in environment)) delete process.env[key];
            }
            Object.assign(process.env, environment);
        }
    });

    it('injects a temporary pepper only into the build child environment', () => {
        const parentEnvironment = {
            NODE_ENV: 'production',
            NEXT_PHASE: 'phase-production-build',
        } as NodeJS.ProcessEnv;
        const buildEnvironment = createBuildEnvironment(parentEnvironment);

        assert.equal(parentEnvironment.ORBITOX_SERVER_PEPPER, undefined);
        assert.match(buildEnvironment.ORBITOX_SERVER_PEPPER || '', /^[a-f0-9]{64}$/);
        assert.equal(Reflect.get(buildEnvironment, 'NEXT_PHASE'), 'phase-production-build');
    });

    it('detects a build pepper in generated output', () => {
        const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbitox-build-pepper-scan-'));
        const pepper = 'a'.repeat(64);
        const serverChunk = path.join(testDir, 'server-chunk.js');
        fs.writeFileSync(serverChunk, `const verifier = '${pepper}';`);
        assert.equal(containsBuildPepper(testDir, pepper), true);
        assert.equal(containsBuildPepper(serverChunk, pepper), true);
        fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('removes NEXT_PHASE before the standalone server loads Next', () => {
        const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbitox-standalone-startup-'));
        const serverFile = path.join(testDir, 'server.js');
        fs.writeFileSync(serverFile, "process.env.NODE_ENV = 'production'\nrequire('next')\n");

        patchStandaloneStartup(serverFile);
        const patched = fs.readFileSync(serverFile, 'utf8');

        assert.ok(patched.indexOf('delete process.env.NEXT_PHASE;') < patched.indexOf("require('next')"));
        const result = spawnSync(process.execPath, [serverFile], {
            encoding: 'utf8',
            env: {
                ...process.env,
                NODE_ENV: 'production',
                NEXT_PHASE: 'phase-production-build',
                ORBITOX_ADMIN_TOKEN: 'admin_secret_32_characters_minimum_000',
                ORBITOX_RUNTIME_TOKEN: 'runtime_secret_32_characters_minimum_0',
                ORBITOX_CONTROL_SECRET: 'control_secret_32_characters_minimum_',
                ORBITOX_GUEST_SECRET: 'guest_secret_32_characters_minimum_00',
                ORBITOX_SERVER_PEPPER: '',
            },
        });
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /ORBITOX_SERVER_PEPPER is not set/);
        assert.match(result.stderr, /OrbitoX cannot start: invalid production configuration/);
        fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('refuses production startup when only DATABASE_URL is set (missing APP_DATABASE_URL)', async () => {
        const environment = { ...process.env };
        Reflect.set(process.env, 'NODE_ENV', 'production');
        process.env.NEXT_RUNTIME = 'nodejs';
        delete process.env.NEXT_PHASE;
        process.env.ORBITOX_ADMIN_TOKEN = 'admin_secret_32_characters_minimum_000';
        process.env.ORBITOX_RUNTIME_TOKEN = 'runtime_secret_32_characters_minimum_0';
        process.env.ORBITOX_CONTROL_SECRET = 'control_secret_32_characters_minimum_';
        process.env.ORBITOX_GUEST_SECRET = 'guest_secret_32_characters_minimum_00';
        process.env.ORBITOX_SERVER_PEPPER = 'server_pepper_32_characters_minimum_';
        process.env.DATABASE_URL = 'postgresql://postgres:postgrespassword@127.0.0.1:5432/orbitox_phase2';
        delete process.env.APP_DATABASE_URL;

        try {
            await assert.rejects(register(), (error: Error) => {
                assert.match(error.message, /APP_DATABASE_URL is not set/);
                assert.match(error.message, /OrbitoX cannot start: invalid production configuration/);
                return true;
            });
        } finally {
            for (const key of Object.keys(process.env)) {
                if (!(key in environment)) delete process.env[key];
            }
            Object.assign(process.env, environment);
        }
    });

    it('refuses production startup when HMS_AUDIT_DATABASE_URL is missing', async () => {
        const environment = { ...process.env };
        Reflect.set(process.env, 'NODE_ENV', 'production');
        process.env.NEXT_RUNTIME = 'nodejs';
        delete process.env.NEXT_PHASE;
        process.env.ORBITOX_ADMIN_TOKEN = 'admin_secret_32_characters_minimum_000';
        process.env.ORBITOX_RUNTIME_TOKEN = 'runtime_secret_32_characters_minimum_0';
        process.env.ORBITOX_CONTROL_SECRET = 'control_secret_32_characters_minimum_';
        process.env.ORBITOX_GUEST_SECRET = 'guest_secret_32_characters_minimum_00';
        process.env.ORBITOX_SERVER_PEPPER = 'server_pepper_32_characters_minimum_';
        process.env.DATABASE_URL = 'postgresql://postgres:postgrespassword@127.0.0.1:5432/orbitox_phase2';
        process.env.APP_DATABASE_URL = 'postgresql://orbitox_runtime:pwd@127.0.0.1:5432/orbitox_phase2';
        process.env.ORBITOX_TEST_SKIP_ROLE_CHECK = 'true';
        delete process.env.HMS_AUDIT_DATABASE_URL;

        try {
            await assert.rejects(register(), (error: Error) => {
                assert.match(error.message, /HMS_AUDIT_DATABASE_URL is not set/);
                assert.match(error.message, /OrbitoX cannot start: invalid production configuration/);
                return true;
            });
        } finally {
            for (const key of Object.keys(process.env)) {
                if (!(key in environment)) delete process.env[key];
            }
            Object.assign(process.env, environment);
        }
    });

    it('returns 503 DATABASE_ROLE_UNSAFE from /api/health when connected role has superuser or bypassrls', async () => {
        const { createHealthHandler } = await import('../lib/health-route-handler');
        const { REQUIRED_PLATFORM_MIGRATIONS, assertPlatformDatabaseReady } = await import('../lib/platform-database-readiness');
        const mockUnsafeClient = {
            async $queryRaw(strings: any) {
                const sql = Array.isArray(strings) ? strings.join(' ') : String(strings?.sql || strings);
                if (sql.includes('SELECT 1')) return [{ '?column?': 1 }];
                if (sql.includes('_prisma_migrations')) {
                    return REQUIRED_PLATFORM_MIGRATIONS.map((migration_name) => ({ migration_name }));
                }
                if (sql.includes('platform_rate_limit_partitions_ready')) {
                    return [{ ready: true }];
                }
                if (sql.includes('pg_roles')) {
                    return [{ current_user: 'postgres', rolsuper: true, rolbypassrls: true }];
                }
                return [];
            },
        } as any;

        const handler = createHealthHandler(() => assertPlatformDatabaseReady(mockUnsafeClient));
        const response = await handler();
        assert.equal(response.status, 503);
        const data = await response.json();
        assert.equal(data.ok, false);
        assert.equal(data.code, 'DATABASE_ROLE_UNSAFE');
    });
});