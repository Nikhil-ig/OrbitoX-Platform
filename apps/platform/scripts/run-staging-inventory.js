#!/usr/bin/env node
/**
 * Staging Step 1 Inventory Verification Entrypoint
 * Delegates directly to the authoritative script in ops/
 */
require('./ops/run-staging-inventory.js');
