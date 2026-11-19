import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * `orbitox license <issue|inspect> [options]` — Issues or inspects cryptographically signed license tokens.
 *
 * Examples:
 *   orbitox license issue --to="Apollo Hospitals" --domain="hospital.apollo.com" --key=keys/private.pem --tenants=50 --days=365
 *   orbitox license inspect <licenseToken> --publicKey=keys/public.pem
 */
export function commandLicense(args: string[]): void {
  const subCommand = args[0] || 'issue';
  const subArgs = args.slice(1);

  if (subCommand === 'issue') {
    let issuedTo = 'Customer Organization';
    let allowedDomain = '*';
    let allowedTenants = 50;
    let days = 365;
    let privateKeyPath: string | undefined;
    let features: string[] = ['*'];

    for (const arg of subArgs) {
      if (arg.startsWith('--to=')) issuedTo = arg.split('=')[1]!;
      else if (arg.startsWith('--domain=')) allowedDomain = arg.split('=')[1]!;
      else if (arg.startsWith('--tenants=')) allowedTenants = parseInt(arg.split('=')[1]!, 10);
      else if (arg.startsWith('--days=')) days = parseInt(arg.split('=')[1]!, 10);
      else if (arg.startsWith('--key=')) privateKeyPath = path.resolve(process.cwd(), arg.split('=')[1]!);
      else if (arg.startsWith('--features=')) features = arg.split('=')[1]!.split(',');
    }

    if (!privateKeyPath || !fs.existsSync(privateKeyPath)) {
      console.error('❌ Error: Please provide a valid private key (--key=keys/private.pem)');
      process.exit(1);
    }

    const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf-8');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

    const licensePayload = {
      licenseId: `lic_${crypto.randomBytes(8).toString('hex')}`,
      issuedTo,
      allowedDomain,
      allowedTenants,
      features,
      issuedAt: now.toISOString(),
      expiresAt,
      tier: 'enterprise',
    };

    let signature = '';
    try {
      const sign = crypto.createSign('SHA256');
      sign.update(JSON.stringify(licensePayload));
      sign.end();
      signature = sign.sign(privateKeyPem, 'hex');
    } catch {
      const sig = crypto.sign(null, Buffer.from(JSON.stringify(licensePayload)), privateKeyPem);
      signature = sig.toString('hex');
    }

    const tokenObj = {
      payload: licensePayload,
      signature,
    };

    const tokenBase64 = Buffer.from(JSON.stringify(tokenObj)).toString('base64');

    console.log(`\n🔑 Enterprise License Token Issued:\n`);
    console.log(`   Issued To:       ${issuedTo}`);
    console.log(`   Allowed Domain:  ${allowedDomain}`);
    console.log(`   Tenant Quota:    ${allowedTenants}`);
    console.log(`   Features:        ${features.join(', ')}`);
    console.log(`   Expires At:      ${expiresAt}`);
    console.log(`\n--- ORBITOX_LICENSE_KEY (Base64) ---`);
    console.log(tokenBase64);
    console.log(`-------------------------------------\n`);
  } else if (subCommand === 'inspect') {
    const token = subArgs.find((a) => !a.startsWith('--'));
    if (!token) {
      console.error('❌ Error: Please provide the base64 license token to inspect');
      process.exit(1);
    }

    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
      console.log(`\n📋 License Token Payload:`);
      console.dir(decoded.payload, { depth: null, colors: true });
      console.log(`\n🔒 Signature: ${decoded.signature}\n`);
    } catch (err: any) {
      console.error(`❌ Error: Invalid license token: ${err.message}`);
      process.exit(1);
    }
  } else {
    console.error(`❌ Unknown license subcommand: "${subCommand}". Use "issue" or "inspect".`);
    process.exit(1);
  }
}
