import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { platformRepository } from '../lib/platform-repository';

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
});
