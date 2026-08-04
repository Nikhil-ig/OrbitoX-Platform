import { ApiResponse, PaginationMeta } from '@orbitox/types';

/**
 * Static helpers for generating standard API responses (Rule B5)
 */
export class ApiResponder {
  /**
   * Generates a successful response envelope
   */
  static success<T>(
    data: T,
    options?: { pagination?: PaginationMeta; requestId?: string },
  ): ApiResponse<T> {
    return {
      success: true,
      data,
      pagination: options?.pagination,
      requestId: options?.requestId || 'req_unknown', // In a real app, inject via middleware/CLS
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Note: Error responses are typically handled by global exception filters in NestJS.
   * This is provided for internal standard formatting if needed.
   */
  static error(
    message: string,
    options?: { code?: string; details?: unknown; requestId?: string },
  ): ApiResponse<null> & { error: { message: string; code?: string; details?: unknown } } {
    return {
      success: false,
      data: null,
      error: {
        message,
        code: options?.code,
        details: options?.details,
      },
      requestId: options?.requestId || 'req_unknown',
      timestamp: new Date().toISOString(),
    };
  }
}
