import axios, { AxiosError } from 'axios';
import { ApiError, extractErrorMessage, transformError, RawApiErrorResponse } from './errors';
import { showErrorToast } from '../toast';

// VITE_API_URL from Render's RENDER_EXTERNAL_URL does not include the /api path prefix.
// Append it if missing so that axios requests resolve to the correct Plumber mount paths.
const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
export const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

/** R/Plumber returns scalar values as single-element arrays; recursively unwrap them. */
export function unwrapRValues<T>(data: unknown): T {
  if (data === null || data === undefined) {
    return data as T;
  }

  if (Array.isArray(data)) {
    if (data.length === 1 && typeof data[0] !== 'object') {
      return data[0] as T;
    }
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      return data.map((item) => unwrapRValues(item)) as T;
    }
    return data as T;
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = unwrapRValues(value);
    }
    return result as T;
  }

  return data as T;
}


export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (response): any => {
    const unwrapped = unwrapRValues(response.data);
    if (unwrapped && typeof unwrapped === 'object' && 'data' in unwrapped && 'error' in unwrapped) {
      return (unwrapped as { data: unknown }).data;
    }
    return unwrapped;
  },
  (error: AxiosError<RawApiErrorResponse>) => {
    const apiError = transformError(error);
    console.error(`[API Error] ${apiError.name}:`, {
      message: apiError.message,
      statusCode: apiError.statusCode,
      endpoint: apiError.endpoint,
      userMessage: apiError.userMessage,
    });

    throw apiError;
  }
);


export function buildFilterParams(filters: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value) && value.length === 0) return;
    if (value === 'all') return;

    if (Array.isArray(value)) {
      params[key] = value.join(',');
    } else if (typeof value === 'object' && 'length' in value) {
      // Tuple like [min, max]
      const [min, max] = value as [number, number];
      params[`${key}_min`] = min.toString();
      params[`${key}_max`] = max.toString();
    } else {
      params[key] = String(value);
    }
  });

  return params;
}


export async function safeApiCall<T>(
  apiCall: () => Promise<T>,
  options?: { showToast?: boolean }
): Promise<{ data: T; error: null } | { data: null; error: ApiError }> {
  try {
    const data = await apiCall();
    return { data, error: null };
  } catch (error) {
    const apiError = error instanceof ApiError ? error : new ApiError(extractErrorMessage(error), { originalError: error });

    if (options?.showToast) {
      showErrorToast(apiError.userMessage);
    }

    return { data: null, error: apiError };
  }
}
