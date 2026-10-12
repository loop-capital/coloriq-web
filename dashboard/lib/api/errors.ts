/**
 * ColorIq API Error Handling
 * Standardized error format for all API responses
 */

export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'ApiError';
  }
}

export const Errors = {
  badRequest: (message: string, code?: string, details?: Record<string, unknown>) =>
    new ApiError(message, 400, code || 'BAD_REQUEST', details),

  unauthorized: (message: string = 'Unauthorized') =>
    new ApiError(message, 401, 'UNAUTHORIZED'),

  forbidden: (message: string = 'Forbidden') =>
    new ApiError(message, 403, 'FORBIDDEN'),

  notFound: (resource: string = 'Resource') =>
    new ApiError(`${resource} not found`, 404, 'NOT_FOUND'),

  conflict: (message: string) =>
    new ApiError(message, 409, 'CONFLICT'),

  rateLimited: (message: string = 'Too many requests. Please try again later.') =>
    new ApiError(message, 429, 'RATE_LIMITED'),

  internal: (message: string = 'Internal server error') =>
    new ApiError(message, 500, 'INTERNAL_ERROR'),
} as const;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: {
      cursor?: string | null;
      nextCursor?: string | null;
      limit: number;
      total?: number;
    };
  };
}

export function successResponse<T>(
  data: T,
  meta?: ApiResponse<T>['meta']
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: meta || {
      timestamp: new Date().toISOString(),
    },
  };
}

export function errorResponse(error: ApiError | Error): ApiResponse {
  if (error instanceof ApiError) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
        details: error.details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }
  return {
    success: false,
    error: {
      message: error.message || 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}

export function handleApiError(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(errorResponse(error), { status: error.statusCode });
  }
  const apiError = Errors.internal(
    error instanceof Error ? error.message : 'Internal server error'
  );
  return Response.json(errorResponse(apiError), { status: 500 });
}
