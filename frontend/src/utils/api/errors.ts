import { AxiosError } from 'axios';

export class ApiError extends Error {
  public readonly statusCode?: number;
  public readonly endpoint?: string;
  public readonly originalError?: unknown;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      endpoint?: string;
      originalError?: unknown;
    }
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = options?.statusCode;
    this.endpoint = options?.endpoint;
    this.originalError = options?.originalError;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- V8's captureStackTrace accepts any constructor function
    const ErrorWithCapture = Error as typeof Error & { captureStackTrace?: (target: object, constructor: Function) => void };
    if (typeof ErrorWithCapture.captureStackTrace === 'function') {
      ErrorWithCapture.captureStackTrace(this, ApiError);
    }
  }

  get userMessage(): string {
    if (this.statusCode === 404) {
      return 'The requested data could not be found.';
    }
    if (this.statusCode === 500) {
      return 'The server encountered an error. Please try again later.';
    }
    return this.message;
  }
}


export class NetworkError extends ApiError {
  constructor(message: string = 'Unable to connect to the server', options?: { endpoint?: string; originalError?: unknown }) {
    super(message, { ...options, statusCode: 0 });
    this.name = 'NetworkError';
  }

  get userMessage(): string {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }
}


export class ValidationError extends ApiError {
  public readonly fieldErrors: Record<string, string[]>;

  constructor(
    message: string = 'Invalid request data',
    fieldErrors: Record<string, string[]> = {},
    options?: { endpoint?: string; originalError?: unknown }
  ) {
    super(message, { ...options, statusCode: 400 });
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }

  get userMessage(): string {
    const errorMessages = Object.values(this.fieldErrors).flat();
    if (errorMessages.length > 0) {
      return errorMessages.join('. ');
    }
    return 'The provided data is invalid. Please check your inputs and try again.';
  }
}


interface RawApiErrorResponse {
  error?: string;
  message?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

export type { RawApiErrorResponse };


export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    const errorObj = error as RawApiErrorResponse;
    return errorObj.error || errorObj.message || errorObj.detail || 'An unexpected error occurred';
  }

  return 'An unexpected error occurred';
}


export function transformError(error: AxiosError<RawApiErrorResponse>): ApiError {
  const endpoint = error.config?.url;

  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return new NetworkError('Request timed out. The server may be busy.', { endpoint, originalError: error });
    }
    return new NetworkError('Unable to connect to the server', { endpoint, originalError: error });
  }

  const { status, data } = error.response;
  const message = extractErrorMessage(data);

  if (status === 400) {
    const fieldErrors = data?.errors || {};
    return new ValidationError(message, fieldErrors, { endpoint, originalError: error });
  }

  return new ApiError(message, { statusCode: status, endpoint, originalError: error });
}
