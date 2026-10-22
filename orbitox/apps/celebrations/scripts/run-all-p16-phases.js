const { spawn } = require('child_process');
const path = require('path');

const phases = [
  { name: 'Phase 1: Core Canvas & Transform Engine', script: 'scripts/test-phase1-deep-audit.js' },
  { name: 'Phase 2: Real Template & Section Engine', script: 'scripts/test-phase2-section-engine.js' },
  { name: 'Phase 3: Asset Studio & Media Pipeline', script: 'scripts/test-phase3-asset-studio.js' },
  { name: 'Phase 4: Master Components & Instance Overrides', script: 'scripts/test-phase4-master-components.js' },
  { name: 'Phase 5: Responsive Cascade & Motion Engine', script: 'scripts/test-phase5-responsive-motion.js' },
  { name: 'Phase 6: AI Designer Core & Production Edge Publishing', script: 'scripts/test-phase6-ai-and-publishing.js' },
];

function runScript(scriptPath) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn('node', [scriptPath], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      resolve({ code, elapsed });
    });
  });
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║               🪐 ORBITOX P16.1 VISUAL STUDIO — COMPLETE SUITE RUNNER                         ║');
  console.log('║               Executing All 6 Phases Sequentially (Figma/Webflow/Canva Standards)            ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════════════════════╝\n');

  const results = [];
  let allPassed = true;

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    console.log(`\n▶ [${i + 1}/${phases.length}] Starting ${phase.name} (${phase.script})...\n`);
    const { code, elapsed } = await runScript(phase.script);
    const passed = code === 0;
    if (!passed) allPassed = false;
    results.push({ ...phase, passed, elapsed });
  }

  console.log('\n\n══════════════════════════════════════════════════════════════════════════════════════════════');
  console.log('                          🪐 ORBITOX P16.1 MASTER VERIFICATION REPORT                          ');
  console.log('══════════════════════════════════════════════════════════════════════════════════════════════');

  results.forEach((r, idx) => {
    const icon = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${icon} [Phase ${idx + 1}] ${r.name.padEnd(52)} (${r.elapsed}s)`);
  });

  console.log('──────────────────────────────────────────────────────────────────────────────────────────────');
  if (allPassed) {
    console.log('  🏆 ALL 6 PHASES PASSED WITH 100% SUCCESS — P16.1 REBUILD IS PRODUCTION CERTIFIED! 🏆');
  } else {
    console.log('  ❌ ONE OR MORE PHASES FAILED');
  }
  console.log('══════════════════════════════════════════════════════════════════════════════════════════════\n');

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
