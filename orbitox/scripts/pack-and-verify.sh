#!/usr/bin/env bash
set -euo pipefail

echo "======================================================================"
echo "📦 OrbitoX Unified Scope & Package Packing Verification"
echo "======================================================================"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

TARBALL_DIR="$(mktemp -d -t orbitox-tarballs-XXXXXX)"
VERIFY_DIR="$(mktemp -d -t orbitox-verify-XXXXXX)"

cleanup() {
  echo "🧹 Cleaning up temp directories..."
  rm -rf "$TARBALL_DIR" "$VERIFY_DIR"
}
trap cleanup EXIT

echo "1. Building fresh dist bundles across workspace..."
pnpm exec turbo run build --filter='@orbitox-io/*'

PACKAGES=(
  "packages/types"
  "packages/utils"
  "packages/core"
  "packages/sdk"
  "packages/services"
  "packages/ui"
  "packages/external-runtime-sdk"
  "packages/plugin-engine"
  "packages/runtime"
  "plugins/pos"
  "plugins/crm"
  "tools/cli"
)

echo "2. Packing each @orbitox-io/* package into $TARBALL_DIR..."
for pkg in "${PACKAGES[@]}"; do
  echo "   -> Packing $pkg..."
  (cd "$pkg" && pnpm pack --pack-destination "$TARBALL_DIR" > /dev/null)
done

echo ""
echo "Packed tarballs:"
ls -lh "$TARBALL_DIR"/*.tgz

echo ""
echo "3. Initializing clean test environment in $VERIFY_DIR..."
cd "$VERIFY_DIR"
npm init -y > /dev/null

echo "4. Installing packed tarballs into clean temp environment..."
# Install foundational packages first, then higher level
npm install --no-audit --no-fund \
  "$TARBALL_DIR"/orbitox-io-types-*.tgz \
  "$TARBALL_DIR"/orbitox-io-utils-*.tgz \
  "$TARBALL_DIR"/orbitox-io-sdk-*.tgz \
  "$TARBALL_DIR"/orbitox-io-core-*.tgz \
  "$TARBALL_DIR"/orbitox-io-external-runtime-sdk-*.tgz \
  "$TARBALL_DIR"/orbitox-io-plugin-engine-*.tgz \
  "$TARBALL_DIR"/orbitox-io-runtime-*.tgz \
  "$TARBALL_DIR"/orbitox-io-pos-*.tgz \
  "$TARBALL_DIR"/orbitox-io-crm-*.tgz \
  "$TARBALL_DIR"/orbitox-io-cli-*.tgz

echo ""
echo "5. Executing standalone consumer smoke test..."
cat << 'EOF' > smoke.test.cjs
const assert = require('assert');

// 1. Runtime
const runtime = require('@orbitox-io/runtime');
assert(typeof runtime.createOrbitoXApp === 'function', 'createOrbitoXApp must be a function');
console.log('  ✅ @orbitox-io/runtime loaded successfully');

// 2. POS Plugin
const pos = require('@orbitox-io/pos');
assert(typeof pos.pos === 'function', 'pos() factory must be exported');
assert(typeof pos.PricingEngine === 'function', 'PricingEngine must be exported');
assert(typeof pos.PosService === 'function', 'PosService must be exported');
console.log('  ✅ @orbitox-io/pos loaded successfully');

// 3. Plugin Engine
const engine = require('@orbitox-io/plugin-engine');
assert(typeof engine.defineOrbitoXPlugin === 'function', 'defineOrbitoXPlugin must be exported');
assert(typeof engine.createMultiTenantEngine === 'function', 'createMultiTenantEngine must be exported');
console.log('  ✅ @orbitox-io/plugin-engine loaded successfully');

// 4. External Runtime SDK
const sdk = require('@orbitox-io/external-runtime-sdk');
assert(typeof sdk.ControlClient === 'function', 'ControlClient must be exported');
console.log('  ✅ @orbitox-io/external-runtime-sdk loaded successfully');

// 5. CRM
const crm = require('@orbitox-io/crm');
assert(typeof crm.LeadStateMachine === 'function', 'LeadStateMachine must be exported');
console.log('  ✅ @orbitox-io/crm loaded successfully');

// 6. Test plugin composition via defineOrbitoXPlugin
const testPlugin = pos.pos();
assert(testPlugin.manifest.name === '@orbitox/pos' || testPlugin.manifest.name === '@orbitox-io/pos', 'POS manifest name match');
assert(testPlugin.routes.length > 0, 'POS defines routes');
console.log(`  ✅ Composed plugin verification passed: ${testPlugin.manifest.name} (${testPlugin.routes.length} routes)`);

console.log('\n🎉 ALL STANDALONE EXTERNAL TARBALL SMOKE TESTS PASSED!');
EOF

node smoke.test.cjs

echo ""
echo "======================================================================"
echo "✅ Pack & Verify Suite Completed Successfully!"
echo "======================================================================"
