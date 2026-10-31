import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function createBuildEnvironment(environment = process.env) {
    return {
        ...environment,
        ORBITOX_SERVER_PEPPER: environment.ORBITOX_SERVER_PEPPER || randomBytes(32).toString('hex'),
        APP_DATABASE_URL: environment.APP_DATABASE_URL || 'postgresql://orbitox_build:orbitox_build@127.0.0.1:5432/orbitox_build',
        DATABASE_URL: environment.DATABASE_URL || 'postgresql://orbitox_build:orbitox_build@127.0.0.1:5432/orbitox_build',
        PLATFORM_AUDIT_DATABASE_URL: environment.PLATFORM_AUDIT_DATABASE_URL || 'postgresql://orbitox_build:orbitox_build@127.0.0.1:5432/orbitox_build',
        HMS_AUDIT_DATABASE_URL: environment.HMS_AUDIT_DATABASE_URL || 'postgresql://orbitox_build:orbitox_build@127.0.0.1:5432/orbitox_build',
    };
}

export function containsBuildPepper(directory, pepper) {
    const needle = Buffer.from(pepper);
    if (!fs.existsSync(directory)) return false;
    const entryStat = fs.statSync(directory);
    if (entryStat.isFile()) return fs.readFileSync(directory).indexOf(needle) !== -1;
    if (!entryStat.isDirectory()) return false;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            if (containsBuildPepper(entryPath, pepper)) return true;
        } else if (entry.isFile() && fs.readFileSync(entryPath).indexOf(needle) !== -1) {
            return true;
        }
    }
    return false;
}

export function runNextBuild() {
    const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
    const webDirectory = path.resolve(scriptDirectory, '..');
    const nextCli = path.join(webDirectory, 'node_modules', 'next', 'dist', 'bin', 'next');
    const buildDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'orbitox-next-build-'));
    const buildEnvironment = createBuildEnvironment();
    const buildPepper = buildEnvironment.ORBITOX_SERVER_PEPPER;

    try {
        const result = spawnSync(process.execPath, [nextCli, 'build'], {
            cwd: webDirectory,
            env: { ...buildEnvironment, ORBITOX_DATA_DIR: buildDataDirectory },
            stdio: 'inherit',
        });

        if (result.error) throw result.error;
        if (result.status !== 0) return result.status ?? 1;

        const serverOutputDirectories = [
            path.join(webDirectory, '.next', 'server'),
            path.join(webDirectory, '.next', 'standalone', 'apps', 'web', '.next', 'server'),
        ];
        const standaloneServer = path.join(webDirectory, '.next', 'standalone', 'apps', 'web', 'server.js');
        if (serverOutputDirectories.some((directory) => containsBuildPepper(directory, buildPepper)) ||
            containsBuildPepper(standaloneServer, buildPepper)) {
            console.error('Build-only pepper leaked into generated server output; build aborted.');
            return 1;
        }
        return 0;
    } finally {
        fs.rmSync(buildDataDirectory, { recursive: true, force: true });
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    process.exitCode = runNextBuild();
}
