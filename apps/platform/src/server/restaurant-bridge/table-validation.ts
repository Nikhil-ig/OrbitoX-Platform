export function validateRuntimeTableIdentity(
  table: { id?: string | number; number: string; locator: string; branchId?: string },
  resolved: { id?: string | number; tableNumber?: string; locator?: string; branchId?: string; tenantId?: string; status?: string } | null | undefined,
  canonicalTenantId: string,
): { valid: boolean; error?: string; message?: string; status?: number } {
  if (!resolved) {
    return {
      valid: false,
      error: 'QR_LOCATOR_PAYLOAD_INVALID',
      message: `Table "${table.number}" locator "${table.locator}" returned no data payload from runtime resolver.`,
      status: 502,
    };
  }

  // Explicitly verify expected table ID, table number, locator, branch ID, tenant relationship, and active status
  // Enforce exact tenant, branch, table ID, and locator equality. Missing or mismatched identity fields must fail closed.
  const numberMatches = Boolean(resolved.tableNumber && String(resolved.tableNumber).trim().toLowerCase() === String(table.number).trim().toLowerCase());
  const locatorMatches = Boolean(resolved.locator && String(resolved.locator).trim() === String(table.locator).trim());
  const idMatches = table.id ? Boolean(resolved.id && String(resolved.id).trim() === String(table.id).trim()) : true;
  const branchMatches = table.branchId ? Boolean(resolved.branchId && String(resolved.branchId).trim() === String(table.branchId).trim()) : true;
  const tenantMatches = Boolean(resolved.tenantId && resolved.tenantId === canonicalTenantId);

  if (!numberMatches || !locatorMatches || !idMatches || !branchMatches || !tenantMatches) {
    return {
      valid: false,
      error: 'QR_LOCATOR_MISMATCH',
      message: `Table "${table.number}" locator "${table.locator}" resolved to mismatched runtime table identity (resolved table: ${resolved.tableNumber}, locator: ${resolved.locator}, branch: ${resolved.branchId || 'default'}).`,
      status: 422,
    };
  }

  // A missing status must NEVER be automatically treated as active
  if (!resolved.status) {
    return {
      valid: false,
      error: 'TABLE_STATUS_UNSPECIFIED',
      message: `Table "${table.number}" has no active status indicated on runtime. Explicit active dining status is required.`,
      status: 422,
    };
  }

  const validActiveStatuses = ['ACTIVE', 'AVAILABLE', 'OCCUPIED'];
  const isActive = validActiveStatuses.includes(String(resolved.status).toUpperCase());

  if (!isActive) {
    return {
      valid: false,
      error: 'TABLE_INACTIVE',
      message: `Table "${table.number}" status is currently "${resolved.status}" on runtime and cannot receive guest QR placards.`,
      status: 422,
    };
  }

  return { valid: true };
}
