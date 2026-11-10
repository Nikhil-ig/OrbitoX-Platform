import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PLATFORM_SERVICE_CONTRACTS } from '../lib/platform-service-contracts';

/**
 * ─────────────────────────────────────────────────────────────
 * Phase 6F R4 CI Test: Terraform Task Definition Contract Verification
 * ─────────────────────────────────────────────────────────────
 * Ensures that ECS task definitions in Terraform maintain 1:1 parity
 * with the required environment variables and Secrets Manager secrets.
 * A missing or extra name fails CI.
 * ─────────────────────────────────────────────────────────────
 */

function findMainTfPath(): string {
  const candidatePaths = [
    path.resolve(__dirname, '../../../infra/modules/compute/main.tf'),
    path.resolve(__dirname, '../../../../infra/modules/compute/main.tf'),
    path.resolve(process.cwd(), 'infra/modules/compute/main.tf'),
    path.resolve(process.cwd(), '../infra/modules/compute/main.tf'),
    path.resolve(process.cwd(), '../../infra/modules/compute/main.tf'),
  ];
  const found = candidatePaths.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(`Could not find infra/modules/compute/main.tf in candidate paths: ${candidatePaths.join(', ')}`);
  }
  return found;
}

interface ParsedContainer {
  name: string;
  environment: string[];
  secrets: string[];
}

function parseContainerDefinitions(tfContent: string): Map<string, ParsedContainer> {
  const containers = new Map<string, ParsedContainer>();

  // Split content by resource "aws_ecs_task_definition"
  const parts = tfContent.split(/resource\s+"aws_ecs_task_definition"\s+"/);

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    const nameMatch = part.match(/^([^"]+)"/);
    if (!nameMatch || !nameMatch[1]) continue;
    const taskDefName = nameMatch[1];

    // Find container_definitions jsonencode block
    const jsonencodeIndex = part.indexOf('container_definitions = jsonencode([');
    if (jsonencodeIndex === -1) continue;

    // Find the matching end of jsonencode([ ... ])
    const endJsonencode = part.indexOf('])\n', jsonencodeIndex);
    const containerBlock = endJsonencode !== -1
      ? part.slice(jsonencodeIndex, endJsonencode + 3)
      : part.slice(jsonencodeIndex);

    const envNames: string[] = [];
    const envBlockMatch = containerBlock.match(/environment\s*=\s*\[([\s\S]*?\n\s{6}\])/);
    if (envBlockMatch && envBlockMatch[1]) {
      const envItemRegex = /name\s*=\s*"([^"]+)"/g;
      let envItem: RegExpExecArray | null;
      while ((envItem = envItemRegex.exec(envBlockMatch[1])) !== null) {
        if (envItem[1]) envNames.push(envItem[1]);
      }
    }

    const secretNames: string[] = [];
    const secretsBlockMatch = containerBlock.match(/secrets\s*=\s*\[([\s\S]*?\n\s{6}\])/);
    if (secretsBlockMatch && secretsBlockMatch[1]) {
      const secretItemRegex = /name\s*=\s*"([^"]+)"/g;
      let secretItem: RegExpExecArray | null;
      while ((secretItem = secretItemRegex.exec(secretsBlockMatch[1])) !== null) {
        if (secretItem[1]) secretNames.push(secretItem[1]);
      }
    }

    containers.set(taskDefName, {
      name: taskDefName,
      environment: envNames,
      secrets: secretNames,
    });
  }

  return containers;
}

describe('Phase 6F R4: Terraform ECS Task Definition Environment & Secret Contract', () => {
  const mainTfPath = findMainTfPath();
  const tfContent = fs.readFileSync(mainTfPath, 'utf8');
  const parsedContainers = parseContainerDefinitions(tfContent);

  it('locates and parses all 5 primary services from compute/main.tf', () => {
    assert.ok(parsedContainers.has('web'), 'compute/main.tf must define task definition "web"');
    assert.ok(parsedContainers.has('worker_email'), 'compute/main.tf must define task definition "worker_email"');
    assert.ok(parsedContainers.has('worker_sweep'), 'compute/main.tf must define task definition "worker_sweep"');
    assert.ok(parsedContainers.has('worker_data_rights'), 'compute/main.tf must define task definition "worker_data_rights"');
    assert.ok(parsedContainers.has('restaurant_os'), 'compute/main.tf must define task definition "restaurant_os"');
  });

  for (const [serviceKey, expected] of Object.entries(PLATFORM_SERVICE_CONTRACTS) as [keyof typeof PLATFORM_SERVICE_CONTRACTS, { environment: readonly string[]; secrets: readonly string[] }][]) {
    it(`verifies 1:1 environment and secret parity for service "${serviceKey}"`, () => {
      const parsed = parsedContainers.get(serviceKey);
      assert.ok(parsed, `Service "${serviceKey}" must be present in parsed container definitions`);

      const actualEnv = parsed.environment;
      const actualSecrets = parsed.secrets;

      const missingEnv = expected.environment.filter((e) => !actualEnv.includes(e));
      const extraEnv = actualEnv.filter((e) => !expected.environment.includes(e as any));

      const missingSecrets = expected.secrets.filter((s) => !actualSecrets.includes(s));
      const extraSecrets = actualSecrets.filter((s) => !expected.secrets.includes(s as any));

      const failureReasons: string[] = [];
      if (missingEnv.length > 0) failureReasons.push(`Missing environment variables: [${missingEnv.join(', ')}]`);
      if (extraEnv.length > 0) failureReasons.push(`Unexpected extra environment variables: [${extraEnv.join(', ')}]`);
      if (missingSecrets.length > 0) failureReasons.push(`Missing secrets: [${missingSecrets.join(', ')}]`);
      if (extraSecrets.length > 0) failureReasons.push(`Unexpected extra secrets: [${extraSecrets.join(', ')}]`);

      assert.equal(
        failureReasons.length,
        0,
        `Service "${serviceKey}" configuration mismatch:\n${failureReasons.join('\n')}`,
      );
    });
  }
});
