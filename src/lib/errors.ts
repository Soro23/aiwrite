/**
 * Shared domain error class.
 *
 * Thrown by service functions for expected business-rule failures.
 * The statusCode maps directly to the HTTP response status that the
 * calling route handler should return.
 *
 * Unexpected errors (network failures, DB unavailability, etc.) are
 * NOT wrapped in ServiceError — they propagate as plain Error instances
 * so the global error boundary can log them and return 500.
 */
export class ServiceError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
  }
}
