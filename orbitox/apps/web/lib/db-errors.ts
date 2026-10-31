/**
 * Maps PostgreSQL and Prisma errors to stable API errors by SQLSTATE + constraint NAME (never by message text).
 * Unknown errors become 500 with no database detail leaked to the client.
 */
export interface ApiError {
  status: number;
  code: string;
  retryable: boolean;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message = code,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** Constraint name -> API error. Add a row for every named constraint/trigger in the plugin schema. */
export const CONSTRAINT_ERRORS: Record<string, Omit<ApiError, 'retryable'>> = {
  HmsAdmission_one_open_per_bed: { status: 409, code: 'BED_OCCUPIED' },
  HmsAdmission_one_open_per_patient: { status: 409, code: 'PATIENT_ALREADY_ADMITTED' },
  HmsAdmission_bed_not_in_service: { status: 409, code: 'BED_NOT_IN_SERVICE' },
  HmsAdmission_closed_immutable: { status: 409, code: 'ADMISSION_CLOSED' },
  HmsAdmission_identity_immutable: { status: 422, code: 'ADMISSION_FIELD_IMMUTABLE' },
  HmsAppointment_no_doctor_overlap: { status: 409, code: 'DOCTOR_SLOT_TAKEN' },
  HmsAppointment_no_patient_overlap: { status: 409, code: 'PATIENT_SLOT_CONFLICT' },
  HmsLabOrder_final: { status: 409, code: 'LAB_ORDER_FINAL' },
  HmsLabOrder_illegal_transition: { status: 409, code: 'LAB_ILLEGAL_TRANSITION' },
  HmsLabOrder_identity_immutable: { status: 422, code: 'LAB_FIELD_IMMUTABLE' },
  HmsLabOrder_check1: { status: 422, code: 'LAB_VERIFIER_MUST_DIFFER' },
  HmsPayment_invoice_missing: { status: 404, code: 'INVOICE_NOT_FOUND' },
  HmsPayment_invoice_closed: { status: 409, code: 'INVOICE_CLOSED' },
  HmsPayment_exceeds_balance: { status: 422, code: 'PAYMENT_EXCEEDS_BALANCE' },
  HmsPayment_tenantId_idempotencyKey_key: { status: 409, code: 'PAYMENT_ALREADY_RECORDED' },
  HmsInvoice_paid_is_derived: { status: 422, code: 'INVOICE_PAID_IS_DERIVED' },
  HmsInvoice_total_locked: { status: 409, code: 'INVOICE_TOTAL_LOCKED' },
  HmsPatient_tenantId_mrn_key: { status: 409, code: 'MRN_EXISTS' },
  HmsStaff_tenantId_emailBlind_key: { status: 409, code: 'STAFF_EMAIL_EXISTS' },
};

/**
 * Extracts SQLSTATE and constraint name from raw PostgreSQL errors or Prisma-wrapped errors.
 */
export function extractSqlStateAndConstraint(e: any): { sqlstate?: string; constraint?: string } {
  if (!e) return {};

  let sqlstate: string | undefined = e.code;
  let constraint: string | undefined = e.constraint;

  // Check nested cause (e.g. pg driver wrapped by ORM)
  if (e.cause) {
    if (!sqlstate && typeof e.cause.code === 'string') sqlstate = e.cause.code;
    if (!constraint && typeof e.cause.constraint === 'string') constraint = e.cause.constraint;
  }

  // PrismaClientKnownRequestError handling
  // Prisma error codes: P2002 (Unique constraint), P2003 (Foreign key), P2010 (Raw query error)
  const meta = e.meta;
  if (meta && typeof meta === 'object') {
    if (typeof meta.code === 'string') {
      sqlstate = meta.code;
    }
    if (typeof meta.constraint === 'string') {
      constraint = meta.constraint;
    }
    if (!constraint && typeof meta.target === 'string') {
      constraint = meta.target;
    } else if (!constraint && Array.isArray(meta.target) && meta.target.length > 0) {
      // If target matches a known constraint name
      const found = meta.target.find((t: unknown) => typeof t === 'string' && CONSTRAINT_ERRORS[t]);
      if (found) constraint = found;
      else if (typeof meta.target[0] === 'string') constraint = meta.target[0];
    }

    // Inspect database_error or message if constraint is still missing
    const dbErr = typeof meta.database_error === 'string' ? meta.database_error : '';
    const msg = typeof meta.message === 'string' ? meta.message : '';
    const fullText = `${dbErr} ${msg} ${e.message || ''}`;
    if (!constraint) {
      const match = /constraint "([^"]+)"/i.exec(fullText);
      if (match) constraint = match[1];
    }
    if (!sqlstate) {
      const matchCode = /SQLSTATE ([0-9A-Z]{5})/i.exec(fullText);
      if (matchCode) sqlstate = matchCode[1];
    }
  }

  // Handle Prisma generic codes when raw SQLSTATE wasn't in meta
  if (sqlstate === 'P2002') {
    sqlstate = '23505'; // Unique constraint violation
  } else if (sqlstate === 'P2003') {
    sqlstate = '23503'; // Foreign key violation
  } else if (sqlstate === 'P2034') {
    sqlstate = '40001'; // Transaction conflict / serialization
  }

  return { sqlstate, constraint };
}

export function mapDbError(e: any): ApiError {
  if (e instanceof HttpError) return { status: e.status, code: e.code, retryable: e.retryable };

  const { sqlstate, constraint } = extractSqlStateAndConstraint(e);

  if (constraint && CONSTRAINT_ERRORS[constraint]) {
    return { ...CONSTRAINT_ERRORS[constraint], retryable: false };
  }

  switch (sqlstate) {
    case '23505':
      return { status: 409, code: 'CONFLICT', retryable: false };
    case '23P01':
      return { status: 409, code: 'CONFLICT', retryable: false };
    // FK failure: a referenced id does not exist IN THIS TENANT. Answer 404, never reveal other tenants.
    case '23503':
      return { status: 404, code: 'REFERENCE_NOT_FOUND', retryable: false };
    case '23514':
    case '23502':
    case '22P02':
    case '22001':
    case '22003':
    case '22007':
    case '22008':
      return { status: 422, code: 'INVALID_INPUT', retryable: false };
    case '40001':
    case '40P01':
      return { status: 503, code: 'TRANSIENT_CONFLICT', retryable: true };
    case '57014':
      return { status: 503, code: 'STATEMENT_TIMEOUT', retryable: true };
    case '55P03':
      return { status: 503, code: 'LOCK_TIMEOUT', retryable: true };
    case '53300':
      return { status: 503, code: 'TOO_MANY_CONNECTIONS', retryable: true };
    // 42501 includes "new row violates row-level security policy": an APPLICATION BUG
    // (wrong tenant or missing scope). Alert on it; tell the client nothing.
    case '42501':
      return { status: 500, code: 'INTERNAL_TENANT_GUARD', retryable: false };
  }

  if (e?.code === 'COMMIT_OUTCOME_UNKNOWN') return { status: 503, code: 'COMMIT_OUTCOME_UNKNOWN', retryable: false };
  if (e?.code === 'TENANT_SCOPE_INVALID') return { status: 400, code: 'TENANT_SCOPE_INVALID', retryable: false };

  return { status: 500, code: 'INTERNAL_ERROR', retryable: false };
}

/** JSON body for the client: code only; details go to logs (without PHI). */
export function errorBody(err: ApiError, requestId: string) {
  return { success: false, error: { code: err.code }, meta: { requestId } };
}
