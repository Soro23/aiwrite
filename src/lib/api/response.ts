import { NextResponse } from "next/server";

/**
 * Standard API response envelope.
 * All API routes MUST use these helpers for consistent responses.
 */

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  error: null;
}

interface ApiErrorResponse {
  success: false;
  data: null;
  error: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  error: null;
  meta: PaginationMeta;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Return a successful JSON response.
 */
export function success<T>(data: T, status: number = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true as const,
      data,
      error: null,
    },
    { status }
  );
}

/**
 * Return an error JSON response.
 *
 * Named `apiError` (not `error`) to avoid shadowing the built-in Error
 * constructor and Zod's `.error` property in route handler catch blocks.
 * Never include stack traces or internal details in the message.
 */
export function apiError(message: string, status: number = 400): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false as const,
      data: null,
      error: message,
    },
    { status }
  );
}

/**
 * Return a paginated JSON response with metadata.
 */
export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): NextResponse<ApiPaginatedResponse<T>> {
  return NextResponse.json({
    success: true as const,
    data,
    error: null,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}
