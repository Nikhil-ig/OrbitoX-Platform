import {
  sendJson,
  eventBus,
  runtimeController,
  activeSettlementLocks,
} from '../../http/context';

export async function handleTableSettle(req: any, res: any, context: any): Promise<void> {
  const identity = context.requestIdentity;
  if (identity.type === 'INVALID_CREDENTIAL') {
    sendJson(res, 401, {
      error: 'INVALID_CREDENTIAL',
      code: 'INVALID_CREDENTIAL',
      message: 'Supplied authentication token is invalid or corrupted.',
    });
    return;
  }
  if (identity.type === 'REVOKED_CAPABILITY') {
    sendJson(res, 401, {
      error: 'REVOKED_CAPABILITY',
      code: 'REVOKED_CAPABILITY',
      message: 'Credential or token has been revoked.',
    });
    return;
  }
  if (identity.type === 'DINER') {
    sendJson(res, 403, {
      error: 'FORBIDDEN',
      code: 'FORBIDDEN',
      message: 'Diner capability tokens cannot directly invoke staff table settlement.',
    });
    return;
  }
  if (identity.type === 'ANONYMOUS') {
    sendJson(res, 401, {
      error: 'AUTHENTICATION_REQUIRED',
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Authenticated staff credentials required to settle table bill.',
    });
    return;
  }

  const body = await context.parseBody();
  let tableParam: any;
  if (body.tableId !== undefined || body.tableNumber !== undefined) {
    tableParam = body.tableId !== undefined ? body.tableId : body.tableNumber;
  } else {
    const cleanPath = context.pathname.replace('/api/restaurant/tables/', '').replace('/settle', '');
    tableParam = /^\d+$/.test(cleanPath) ? parseInt(cleanPath, 10) : cleanPath;
  }

  const targetTable =
    typeof tableParam === 'number'
      ? await context.repo.getTable(tableParam)
      : await context.repo.getTableByNumber(String(tableParam));

  if (!targetTable) {
    sendJson(res, 404, {
      error: 'TABLE_NOT_FOUND',
      code: 'TABLE_NOT_FOUND',
      message: `Table ${tableParam} not found.`,
    });
    return;
  }

  if (identity.branchId && identity.branchId !== '*' && targetTable.branchId !== identity.branchId) {
    sendJson(res, 403, {
      error: `Staff token for branch ${identity.branchId} cannot settle table in branch ${targetTable.branchId}`,
      code: 'BRANCH_MISMATCH',
    });
    return;
  }

  const idempotencyKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey;
  if (idempotencyKey) {
    const existingIdempotent = await context.repo.getIdempotencyRecord(idempotencyKey);
    if (existingIdempotent) {
      const isPayloadMatch =
        existingIdempotent.tableNumber === targetTable.number &&
        (body.amountMinor === undefined || body.amountMinor === existingIdempotent.settlement?.amountMinor);
      if (isPayloadMatch) {
        sendJson(res, 200, {
          success: true,
          idempotentReplay: true,
          message: `Settlement already completed for Table ${targetTable.number} (idempotent replay)`,
          ...existingIdempotent,
        });
        return;
      } else {
        sendJson(res, 409, {
          error: 'IDEMPOTENCY_CONFLICT',
          code: 'IDEMPOTENCY_CONFLICT',
          message: `Idempotency key ${idempotencyKey} has already been used with different settlement parameters.`,
        });
        return;
      }
    }
  }

  const lockKey = `table_settle_${context.tenantContext?.tenantId}_${targetTable.id}`;
  const idempLockKey = idempotencyKey ? `idemp_${context.tenantContext?.tenantId}_${idempotencyKey}` : undefined;

  if (activeSettlementLocks.has(lockKey) || (idempLockKey && activeSettlementLocks.has(idempLockKey))) {
    sendJson(res, 409, {
      error: 'SETTLEMENT_IN_PROGRESS',
      code: 'SETTLEMENT_IN_PROGRESS',
      message: `Settlement is currently in progress for Table ${targetTable.number}. Concurrent settlement requests locked.`,
    });
    return;
  }
  activeSettlementLocks.add(lockKey);
  if (idempLockKey) {
    activeSettlementLocks.add(idempLockKey);
  }

  try {
    const authorizer = identity.id;
    await runtimeController.emitAudit('TABLE_SETTLEMENT_ATTEMPT', authorizer, {
      tableNumber: targetTable.number,
      tableId: targetTable.id,
      branchId: targetTable.branchId,
      requestedAmountMinor: body.amountMinor,
      method: body.paymentMethod || body.method || 'CASH',
    });

    const isProviderConfirmed = Boolean(body.providerConfirmed && body.gatewayTransactionId);
    const settlementPayload = {
      method: body.paymentMethod || body.method || 'CASH',
      status: body.paymentStatus || body.status || 'PAID',
      amountMinor: body.amountMinor,
      authorizedBy: authorizer,
      reason: body.reason,
      verification: isProviderConfirmed ? ('PROVIDER_CONFIRMED' as const) : ('MANUAL_STAFF_RECORDED' as const),
      providerConfirmed: isProviderConfirmed,
      gatewayTransactionId: body.gatewayTransactionId,
      settledAt: new Date().toISOString(),
    };

    const result = await context.repo.settleTableSession(targetTable.id, settlementPayload, {
      expectedRevision: body.expectedRevision,
      authorizedBy: authorizer,
      reason: body.reason,
      idempotencyKey,
      idempotencyRecord: idempotencyKey ? {
        tableNumber: targetTable.number,
        table: targetTable,
        settlement: settlementPayload,
      } : undefined,
    });

    if (!result.success) {
      const statusCode =
        result.code === 'TABLE_NOT_FOUND'
          ? 404
          : result.code === 'REVISION_CONFLICT'
            ? 409
            : result.code === 'PARTIAL_SETTLEMENT_UNRESOLVED'
              ? 422
              : result.code === 'UNPAID_BALANCE'
                ? 422
                : 400;
      sendJson(res, statusCode, {
        code: result.code,
        error: result.code,
        message: result.error,
      });
      return;
    }

    if (result.session?.sessionId) {
      try {
        eventBus.disconnectClientsForSession(result.session.sessionId);
      } catch (e) {
        console.error('⚠️ [Server] Failed to disconnect session clients:', e);
      }
    }

    try {
      await runtimeController.emitAudit('TABLE_SETTLEMENT_SUCCESS', authorizer, {
        tableNumber: targetTable.number,
        tableId: targetTable.id,
        settlement: result.session?.settlement,
        closedAt: result.session?.closedAt,
      });
    } catch (e) {
      console.error('⚠️ [Server] Failed to emit settlement audit:', e);
    }

    const responsePayload = {
      table: result.table,
      session: result.session,
      settlement: result.settlement || result.session?.settlement || settlementPayload,
      tableNumber: targetTable.number,
    };

    if (idempotencyKey) {
      await context.repo.saveIdempotencyRecord(idempotencyKey, responsePayload);
    }

    sendJson(res, 200, {
      success: true,
      message: `Table ${targetTable.number} successfully settled and vacated.`,
      ...responsePayload,
    });
    return;
  } finally {
    activeSettlementLocks.delete(lockKey);
    if (idempLockKey) {
      activeSettlementLocks.delete(idempLockKey);
    }
  }
}

export async function handleTableBill(_req: any, res: any, context: any): Promise<void> {
  const parts = context.pathname.split('/');
  const tableId = parseInt(parts[4], 10);
  const targetTable = await context.repo.getTable(tableId);
  if (!targetTable) {
    sendJson(res, 404, { error: 'Table not found', code: 'TABLE_NOT_FOUND' });
    return;
  }

  const identity = context.requestIdentity;
  if (
    identity.branchId &&
    identity.branchId !== '*' &&
    targetTable.branchId &&
    targetTable.branchId !== identity.branchId
  ) {
    sendJson(res, 403, {
      error: 'BRANCH_MISMATCH',
      code: 'BRANCH_MISMATCH',
      message: `Staff credential for branch ${identity.branchId} cannot access bill for table in branch ${targetTable.branchId}.`,
    });
    return;
  }

  const billData = await context.repo.getTableBill(targetTable.id);
  sendJson(res, 200, { success: true, ...billData });
}

export async function handleRotateLocator(req: any, res: any, context: any): Promise<void> {
  const parts = context.pathname.split('/');
  const tableId = parseInt(parts[4], 10);
  const identity = context.requestIdentity;
  if (!identity.isPrivileged) {
    sendJson(res, (identity.type === 'ANONYMOUS' || identity.type === 'INVALID_CREDENTIAL') ? 401 : 403, {
      error: 'FORBIDDEN',
      code: 'FORBIDDEN',
      message: 'Rotating table QR locators requires authorized staff or manager privileges.',
    });
    return;
  }
  const targetTable = await context.repo.getTable(tableId);
  if (targetTable && identity.branchId && identity.branchId !== '*' && targetTable.branchId !== identity.branchId) {
    sendJson(res, 403, {
      error: `Credential for branch ${identity.branchId} cannot rotate table in branch ${targetTable.branchId}`,
      code: 'BRANCH_MISMATCH',
    });
    return;
  }
  const body = await context.parseBody();
  const result = await context.repo.rotateTableLocator(tableId, identity.id, body.reason);
  if (!result.success) {
    sendJson(res, 404, { error: result.error, code: 'TABLE_NOT_FOUND' });
    return;
  }
  sendJson(res, 200, {
    success: true,
    table: result.table,
    previousLocator: result.previousLocator,
    newLocator: result.table?.locator,
    rotatedAt: new Date().toISOString(),
    rotatedBy: identity.id,
  });
}
