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
});