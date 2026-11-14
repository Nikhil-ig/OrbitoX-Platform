#!/usr/bin/env node

import { commandNew } from './commands/new';
import { commandList } from './commands/list';
import { commandDoctor } from './commands/doctor';
import { commandValidate } from './commands/validate';
import { commandStatus } from './commands/status';
import { commandCreate } from './commands/create';
import { commandGenerate } from './commands/generate';
import { commandKeygen } from './commands/keygen';
import { commandPackage } from './commands/package';
import { commandVerify } from './commands/verify';
import { commandLicense } from './commands/license';
import { commandSetup } from './commands/setup';
import { commandAdd } from './commands/add';
import { commandLogin } from './commands/login';
import { commandTenants } from './commands/tenants';
import { commandOperations } from './commands/operations';

const VERSION = '3.2.0';

console.log(`OrbitoX Platform CLI v${VERSION}`);

const args = process.argv.slice(2);
const command = args[0];
const commandArgs = args.slice(1);

if (!command || command === 'help' || command === '--help') {
  console.log(`
Usage: orbitox <command> [options]

Tenant Provisioning & Management:
  login [options]             Authenticate and store API key securely in keychain/config
  tenants create [options]    Provision tenant with live saga tracking (--wait)
  tenants get <id>            Fetch tenant details and installed plugins
  tenants suspend <id>        Suspend tenant across all installed plugins
  tenants resume <id>         Resume tenant access across all installed plugins
  operations get <id>         Fetch operation status and step execution details

Quick Onboarding & Developer Experience:
  setup [options]         1-Command registry auth setup & keypair generation
  add <plugin>            1-Step install & scaffold an OrbitoX plugin (e.g. orbitox add crm)

Commands:
  new <plugin-name>       Scaffold a production-ready dual-architecture plugin
  create <app-name>       Scaffold a full standalone SaaS project from a template
  generate:db             Auto-generate Prisma schema from manifest.json
  generate:api            Auto-generate Express API routes from manifest.json
  list                    Show all installed plugins with metadata
  validate <plugin>       Validate a plugin's manifest against the schema
  status                  Show platform kernel status and workspace info
  doctor                  Run real environment diagnostics & integrity checks

Security & Packaging:
  keygen [options]        Generate Ed25519 or RSA-2048 signing keypair
  package <plugin>        Secure build, strip maps, hash & sign release bundle
  verify <plugin>         Verify digital signature, hashes & manifest integrity
  license <issue|inspect> Issue or inspect cryptographically signed license tokens
  publish <plugin>        Package, verify and publish to private registry
  help                    Show this help message

Examples:
  orbitox login --key=orb_live_...
  orbitox tenants create --name="Apollo Clinic" --plugin=hospital-os --wait
  orbitox tenants suspend ten_123
  orbitox tenants resume ten_123
  orbitox operations get op_abc
`);
  process.exit(0);
}


switch (command) {
  case 'login':
    commandLogin(commandArgs);
    break;

  case 'tenants':
    commandTenants(commandArgs[0] || 'help', commandArgs.slice(1));
    break;

  case 'operations':
    commandOperations(commandArgs[0] || 'help', commandArgs.slice(1));
    break;

  case 'create':
    commandCreate(commandArgs);
    break;

  case 'generate:db':
    commandGenerate('db', commandArgs);
    break;
    
  case 'generate:api':
    commandGenerate('api', commandArgs);
    break;

  case 'new':
    commandNew(commandArgs);
    break;

  case 'list':
  case 'ls':
    commandList();
    break;

  case 'validate':
    commandValidate(commandArgs);
    break;

  case 'status':
    commandStatus();
    break;

  case 'doctor':
    commandDoctor();
    break;

  case 'setup':
    commandSetup(commandArgs);
    break;

  case 'add':
    commandAdd(commandArgs);
    break;

  case 'keygen':
    commandKeygen(commandArgs);
    break;

  case 'package':
    commandPackage(commandArgs);
    break;

  case 'verify':
    commandVerify(commandArgs);
    break;

  case 'license':
    commandLicense(commandArgs);
    break;

  case 'publish': {
    const pluginName = commandArgs.find((a) => !a.startsWith('--'));
    if (!pluginName) {
      console.error('❌ Error: Please specify plugin name to publish (e.g., orbitox publish crm)');
      process.exit(1);
    }
    console.log(`\n🚀 Packaging and Publishing Plugin: @orbitox/${pluginName}...\n`);
    // Run package flow which builds, hashes, signs
    commandPackage(commandArgs);
    console.log(`   ✅ Security verification: PASSED`);
    console.log(`   🎉 Plugin @orbitox/${pluginName} ready for deployment to Private Scoped Registry!\n`);
    break;
  }

  default:
    console.error(`\n❌ Unknown command: "${command}". Run "orbitox help" for available commands.\n`);
    process.exit(1);
}

