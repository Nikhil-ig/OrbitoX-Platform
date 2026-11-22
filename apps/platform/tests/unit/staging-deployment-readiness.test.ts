import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('OrbitoX Staging Deployment Readiness & Contracts', () => {
  const repoRoot = path.resolve(__dirname, '../../../..');
  const cicdOidcMainTf = fs.readFileSync(
    path.join(repoRoot, 'infra/terraform/aws/modules/cicd_oidc/main.tf'),
    'utf8'
  );
  const cicdOidcVarsTf = fs.readFileSync(
    path.join(repoRoot, 'infra/terraform/aws/modules/cicd_oidc/variables.tf'),
    'utf8'
  );
  const computeOutputsTf = fs.readFileSync(
    path.join(repoRoot, 'infra/terraform/aws/modules/compute/outputs.tf'),
    'utf8'
  );
  const mainTf = fs.readFileSync(
    path.join(repoRoot, 'infra/terraform/aws/main.tf'),
    'utf8'
  );
  const edgeMainTf = fs.readFileSync(
    path.join(repoRoot, 'infra/terraform/aws/modules/edge/main.tf'),
    'utf8'
  );
  const deployWorkflowYaml = fs.readFileSync(
    path.join(repoRoot, '.github/workflows/deploy-staging.yml'),
    'utf8'
  );

  it('1. Authorizes both Web and RestaurantOS ECS service ARNs in CI/CD OIDC deploy policy', () => {
    assert.ok(
      cicdOidcVarsTf.includes('variable "restaurant_os_service_arn"'),
      'cicd_oidc variables.tf must declare variable "restaurant_os_service_arn"'
    );
    assert.ok(
      computeOutputsTf.includes('output "restaurant_os_service_arn"'),
      'compute outputs.tf must export "restaurant_os_service_arn"'
    );
    assert.ok(
      mainTf.includes('restaurant_os_service_arn    = module.compute.restaurant_os_service_arn'),
      'main.tf must pass restaurant_os_service_arn into cicd_oidc module'
    );
    assert.ok(
      cicdOidcMainTf.includes('var.restaurant_os_service_arn'),
      'cicd_oidc deploy_permissions policy must authorize var.restaurant_os_service_arn'
    );
    assert.ok(
      cicdOidcMainTf.includes('var.web_service_arn'),
      'cicd_oidc deploy_permissions policy must authorize var.web_service_arn'
    );
  });

  it('2. Binds OIDC deploy role strictly to repo and staging environment (immutable and standard subject formats)', () => {
    assert.ok(
      cicdOidcMainTf.includes('"token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"'),
      'OIDC trust policy must restrict audience to sts.amazonaws.com'
    );
    assert.ok(
      cicdOidcMainTf.includes('repo:${var.github_repository}:environment:${var.environment}'),
      'OIDC trust policy must bind to repo and staging environment'
    );
    assert.ok(
      cicdOidcMainTf.includes('var.github_repository_owner_id') &&
      cicdOidcMainTf.includes('var.github_repository_id'),
      'OIDC trust policy must support immutable repo ID and owner ID subject claim format'
    );
  });

  it('3. Ensures RestaurantOS target group and ALB listener routing are configured on port 4010', () => {
    assert.ok(
      edgeMainTf.includes('resource "aws_lb_target_group" "restaurant_os"'),
      'edge module must declare aws_lb_target_group.restaurant_os'
    );
    assert.ok(
      edgeMainTf.includes('resource "aws_lb_listener_rule" "restaurant_os"'),
      'edge module must declare aws_lb_listener_rule.restaurant_os'
    );
    assert.ok(
      edgeMainTf.includes('port                 = 4010'),
      'RestaurantOS target group must listen on port 4010'
    );
    assert.ok(
      edgeMainTf.includes('["/api/restaurant/*", "/orbitox/lifecycle/*", "/orbitox/data-rights/*"]'),
      'ALB listener rule must route /api/restaurant/* and lifecycle/data-rights to RestaurantOS'
    );
  });

  it('4. Deployment workflow: updates migration and inventory task definitions before execution', () => {
    const updateMigrateIndex = deployWorkflowYaml.indexOf('id: update-migrate-task-def');
    const runMigrateIndex = deployWorkflowYaml.indexOf('id: run-migration');
    const updateInventoryIndex = deployWorkflowYaml.indexOf('id: update-inventory-task-def');
    const runInventoryIndex = deployWorkflowYaml.indexOf('id: run-inventory');

    assert.ok(updateMigrateIndex !== -1, 'deploy-staging.yml must contain update-migrate-task-def step');
    assert.ok(runMigrateIndex !== -1, 'deploy-staging.yml must contain run-migration step');
    assert.ok(updateInventoryIndex !== -1, 'deploy-staging.yml must contain update-inventory-task-def step');
    assert.ok(runInventoryIndex !== -1, 'deploy-staging.yml must contain run-inventory step');

    assert.ok(
      updateMigrateIndex < runMigrateIndex,
      'Migration task definition update must precede migration task execution'
    );
    assert.ok(
      updateInventoryIndex < runInventoryIndex,
      'Inventory task definition update must precede inventory task execution'
    );

    assert.ok(
      deployWorkflowYaml.includes('TASK_DEF_ARN="${{ steps.update-migrate-task-def.outputs.task_def_arn }}"'),
      'Run migration task must execute the newly registered task definition revision ARN'
    );
    assert.ok(
      deployWorkflowYaml.includes('TASK_DEF_ARN="${{ steps.update-inventory-task-def.outputs.task_def_arn }}"'),
      'Run inventory task must execute the newly registered task definition revision ARN'
    );
  });

  it('5. Deployment workflow: application deployment cannot continue after migration or inventory failure', () => {
    assert.ok(
      deployWorkflowYaml.includes('needs: [build-and-scan, migrate-and-verify]'),
      'deploy-ecs job must depend on migrate-and-verify completion'
    );
    assert.ok(
      deployWorkflowYaml.includes('if [ "$EXIT_CODE" != "0" ]; then') &&
      deployWorkflowYaml.includes('exit 1'),
      'Non-zero migration or inventory task exit code must fail the step with exit 1'
    );
  });

  it('6. Deployment workflow: verifies health for both Platform and RestaurantOS runtimes', () => {
    assert.ok(
      deployWorkflowYaml.includes('name: Verify Platform Staging Health Endpoint'),
      'deploy-staging.yml must verify Platform health'
    );
    assert.ok(
      deployWorkflowYaml.includes('https://staging.orbitox.io/health'),
      'Platform health check URL must be https://staging.orbitox.io/health'
    );
    assert.ok(
      deployWorkflowYaml.includes('name: Verify RestaurantOS Staging Health Endpoint'),
      'deploy-staging.yml must verify RestaurantOS health'
    );
    assert.ok(
      deployWorkflowYaml.includes('https://staging.orbitox.io/api/restaurant/health'),
      'RestaurantOS health check URL must be https://staging.orbitox.io/api/restaurant/health'
    );
  });

  it('7. Container image contains required migration and inventory entrypoints', () => {
    const migrationScriptPath = path.join(repoRoot, 'apps/platform/scripts/run-staging-migration.js');
    const opsMigrationScriptPath = path.join(repoRoot, 'apps/platform/scripts/ops/run-staging-migration.js');
    const inventoryScriptPath = path.join(repoRoot, 'apps/platform/scripts/run-staging-inventory.js');
    const opsInventoryScriptPath = path.join(repoRoot, 'apps/platform/scripts/ops/run-staging-inventory.js');

    assert.ok(fs.existsSync(migrationScriptPath), 'scripts/run-staging-migration.js must exist');
    assert.ok(fs.existsSync(opsMigrationScriptPath), 'scripts/ops/run-staging-migration.js must exist');
    assert.ok(fs.existsSync(inventoryScriptPath), 'scripts/run-staging-inventory.js must exist');
    assert.ok(fs.existsSync(opsInventoryScriptPath), 'scripts/ops/run-staging-inventory.js must exist');
  });
});
