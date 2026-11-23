import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapDbError,
  extractSqlStateAndConstraint,
  HttpError,
  errorBody,
  CONSTRAINT_ERRORS,
} from '@/server/db/db-errors';

describe('Database Error Precedence and Mapping (GC-06)', () => {
  describe('Prisma P2010 raw query error unwrapping (no shadowing of native SQLSTATE)', () => {
    it('unwraps PostgreSQL 40P01 deadlock from e.cause when wrapped by P2010', () => {
      const err = {
        code: 'P2010',
        message: 'Raw query failed.',
        cause: {
          code: '40P01',
          message: 'deadlock detected',
        },
      };

      const extracted = extractSqlStateAndConstraint(err);
      assert.equal(extracted.sqlstate, '40P01');

      const mapped = mapDbError(err);
      assert.deepEqual(mapped, {
        status: 503,
        code: 'TRANSIENT_CONFLICT',
        retryable: true,
      });
    });

    it('unwraps PostgreSQL 40P01 deadlock from meta.code when wrapped by P2010', () => {
      const err = {
        code: 'P2010',
        meta: {
          code: '40P01',
          database_error: 'deadlock detected\nDETAIL: Process 101 waits for ShareLock...',
        },
      };

      const extracted = extractSqlStateAndConstraint(err);
      assert.equal(extracted.sqlstate, '40P01');

      const mapped = mapDbError(err);
      assert.deepEqual(mapped, {
        status: 503,
        code: 'TRANSIENT_CONFLICT',
        retryable: true,
      });
    });

    it('unwraps PostgreSQL 40P01 deadlock from meta.message regex when meta.code is absent', () => {
      const err = {
        code: 'P2010',
        meta: {
          message: 'Raw query failed. Code: `40P01`. Message: deadlock detected',
        },
      };

      const extracted = extractSqlStateAndConstraint(err);
      assert.equal(extracted.sqlstate, '40P01');

      const mapped = mapDbError(err);
      assert.deepEqual(mapped, {
        status: 503,
        code: 'TRANSIENT_CONFLICT',
        retryable: true,
      });
    });

    it('unwraps PostgreSQL 40001 serialization failure from e.cause when wrapped by P2010', () => {
      const err = {
        code: 'P2010',
        cause: {
          code: '40001',
          message: 'could not serialize access due to concurrent update',
        },
      };

      const extracted = extractSqlStateAndConstraint(err);
      assert.equal(extracted.sqlstate, '40001');

      const mapped = mapDbError(err);
      assert.deepEqual(mapped, {
        status: 503,
        code: 'TRANSIENT_CONFLICT',
        retryable: true,
      });
    });

    it('unwraps PostgreSQL 40001 serialization failure from meta.database_error regex', () => {
      const err = {
        code: 'P2010',
        meta: {
          database_error: 'could not serialize access due to read/write dependencies (SQLSTATE 40001)',
        },
      };

      const extracted = extractSqlStateAndConstraint(err);
      assert.equal(extracted.sqlstate, '40001');

      const mapped = mapDbError(err);
      assert.deepEqual(mapped, {
        status: 503,
        code: 'TRANSIENT_CONFLICT',
        retryable: true,
      });
    });

    it('maps Prisma P2034 serialization conflict code to 503 TRANSIENT_CONFLICT', () => {
      const err = { code: 'P2034', message: 'Transaction failed due to write conflict' };
      const mapped = mapDbError(err);
      assert.deepEqual(mapped, {
        status: 503,
        code: 'TRANSIENT_CONFLICT',
        retryable: true,
      });
    });

    it('unwraps PostgreSQL 23505 unique violation from P2010 meta without named constraint', () => {
      const err = {
        code: 'P2010',
        meta: {
          code: '23505',
          message: 'duplicate key value violates unique constraint',
        },
      };

      const extracted = extractSqlStateAndConstraint(err);
      assert.equal(extracted.sqlstate, '23505');

      const mapped = mapDbError(err);
      assert.deepEqual(mapped, {
        status: 409,
        code: 'CONFLICT',
        retryable: false,
      });
    });

    it('unwraps PostgreSQL 23P01 exclusion violation from P2010 meta', () => {
      const err = {
        code: 'P2010',
        meta: {
          code: '23P01',
          message: 'conflicting key value violates exclusion constraint',
        },
      };

      const mapped = mapDbError(err);
      assert.deepEqual(mapped, {
        status: 409,
        code: 'CONFLICT',
        retryable: false,
      });
    });

    it('unwraps PostgreSQL 42501 RLS policy violation from P2010 meta without leaking details', () => {
      const err = {
        code: 'P2010',
        meta: {
          code: '42501',
          message: 'new row violates row-level security policy for table "HmsPatient"',
        },
      };

      const mapped = mapDbError(err);
      assert.deepEqual(mapped, {
        status: 500,
        code: 'INTERNAL_TENANT_GUARD',
        retryable: false,
      });
    });
  });

  describe('Named constraint mapping from CONSTRAINT_ERRORS', () => {
    it('maps known constraint HmsAdmission_one_open_per_bed wrapped in P2010 with target', () => {
      const err = {
        code: 'P2010',
        meta: {
          code: '23505',
          target: ['HmsAdmission_one_open_per_bed'],
        },
      };

      const mapped = mapDbError(err);
      assert.deepEqual(mapped, {
        status: 409,
        code: 'BED_OCCUPIED',
        retryable: false,
      });
    });

    it('maps known constraint HmsPayment_invoice_closed extracted via regex from error message', () => {
      const err = {
        code: 'P2010',
        message: 'Database error: constraint "HmsPayment_invoice_closed" failed',
      };

      const mapped = mapDbError(err);
      assert.deepEqual(mapped, {
        status: 409,
        code: 'INVOICE_CLOSED',
        retryable: false,
      });
    });

    it('maps known immutable field constraint HmsAdmission_identity_immutable to 422', () => {
      const err = {
        constraint: 'HmsAdmission_identity_immutable',
      };

      const mapped = mapDbError(err);
      assert.deepEqual(mapped, {
        status: 422,
        code: 'ADMISSION_FIELD_IMMUTABLE',
        retryable: false,
      });
    });
  });

  describe('Connection and Infrastructure Errors', () => {
    it('maps ECONNREFUSED error object to 503 SERVICE_UNAVAILABLE', () => {
      const err = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:5432',
      };

      const mapped = mapDbError(err);
      assert.deepEqual(mapped, {
        status: 503,
        code: 'SERVICE_UNAVAILABLE',
        retryable: true,
      });
    });

    it('maps generic Error with "connection refused" in message to 503 SERVICE_UNAVAILABLE', () => {
      const err = new Error('Database connection refused by host.');

      const mapped = mapDbError(err);
      assert.deepEqual(mapped, {
        status: 503,
        code: 'SERVICE_UNAVAILABLE',
        retryable: true,
      });
    });

    it('maps Prisma P1001 connection error to 503 SERVICE_UNAVAILABLE', () => {
      const err = {
        code: 'P1001',
        message: "Can't reach database server at `localhost:5432`",
      };

      const mapped = mapDbError(err);
      assert.deepEqual(mapped, {
        status: 503,
        code: 'SERVICE_UNAVAILABLE',
        retryable: true,
      });
    });

    it('maps PostgreSQL class 08 connection exception (08006) to 503 SERVICE_UNAVAILABLE', () => {
      const err = {
        code: '08006',
        message: 'connection_failure',
      };

      const mapped = mapDbError(err);
      assert.deepEqual(mapped, {
        status: 503,
        code: 'SERVICE_UNAVAILABLE',
        retryable: true,
      });
    });

    it('maps ETIMEDOUT to 503 SERVICE_UNAVAILABLE', () => {
      const err = {
        code: 'ETIMEDOUT',
        message: 'connect ETIMEDOUT 10.0.0.5:5432',
      };

      const mapped = mapDbError(err);
      assert.deepEqual(mapped, {
        status: 503,
        code: 'SERVICE_UNAVAILABLE',
        retryable: true,
      });
    });
  });

  describe('Standard PostgreSQL SQLSTATEs and Timeouts', () => {
    it('maps 57014 statement timeout to 503 STATEMENT_TIMEOUT (retryable)', () => {
      const err = { code: '57014' };
      const mapped = mapDbError(err);
      assert.deepEqual(mapped, {
        status: 503,
        code: 'STATEMENT_TIMEOUT',
        retryable: true,
      });
    });

    it('maps 55P03 lock timeout to 503 LOCK_TIMEOUT (retryable)', () => {
      const err = { code: '55P03' };
      const mapped = mapDbError(err);
      assert.deepEqual(mapped, {
        status: 503,
        code: 'LOCK_TIMEOUT',
        retryable: true,
      });
    });

    it('maps 53300 too many connections to 503 TOO_MANY_CONNECTIONS (retryable)', () => {
      const err = { code: '53300' };
      const mapped = mapDbError(err);
      assert.deepEqual(mapped, {
        status: 503,
        code: 'TOO_MANY_CONNECTIONS',
        retryable: true,
      });
    });

    it('maps 23503 foreign key violation to 404 REFERENCE_NOT_FOUND', () => {
      const err = { code: '23503' };
      const mapped = mapDbError(err);
      assert.deepEqual(mapped, {
        status: 404,
        code: 'REFERENCE_NOT_FOUND',
        retryable: false,
      });
    });

    it('maps 23514 check constraint violation to 422 INVALID_INPUT', () => {
      const err = { code: '23514' };
      const mapped = mapDbError(err);
      assert.deepEqual(mapped, {
        status: 422,
        code: 'INVALID_INPUT',
        retryable: false,
      });
    });

    it('maps 23502 not null violation to 422 INVALID_INPUT', () => {
      const err = { code: '23502' };
      const mapped = mapDbError(err);
      assert.deepEqual(mapped, {
        status: 422,
        code: 'INVALID_INPUT',
        retryable: false,
      });
    });
  });

  describe('HttpError and Client Response Sanitization', () => {
    it('passes through HttpError instances untouched', () => {
      const httpErr = new HttpError(403, 'INSUFFICIENT_PERMISSIONS', 'Permission denied', false);
      const mapped = mapDbError(httpErr);
      assert.deepEqual(mapped, {
        status: 403,
        code: 'INSUFFICIENT_PERMISSIONS',
        retryable: false,
      });
    });

    it('sanitizes unknown database errors to 500 INTERNAL_ERROR with zero leakage', () => {
      const err = new Error('FATAL: disk full on /var/lib/postgresql/data');
      const mapped = mapDbError(err);
      assert.deepEqual(mapped, {
        status: 500,
        code: 'INTERNAL_ERROR',
        retryable: false,
      });

      const body = errorBody(mapped, 'req-abc-999');
      assert.deepEqual(body, {
        success: false,
        error: { code: 'INTERNAL_ERROR' },
        meta: { requestId: 'req-abc-999' },
      });
      assert.equal(JSON.stringify(body).includes('disk full'), false);
    });
  });
});
