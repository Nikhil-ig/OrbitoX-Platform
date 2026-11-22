#!/usr/bin/env node
/**
 * Staging Database Migration & Role Enablement Entrypoint
 * Delegates directly to the authoritative script in ops/
 */
require('./ops/run-staging-migration.js');
