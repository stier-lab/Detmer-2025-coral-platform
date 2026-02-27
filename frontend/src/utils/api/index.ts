// Barrel re-export: all existing `import { ... } from '@/utils/api'` continue to work.

export { api, API_BASE_URL, unwrapRValues, buildFilterParams, safeApiCall } from './client';
export { ApiError, NetworkError, ValidationError, extractErrorMessage, transformError } from './errors';
export type { RawApiErrorResponse } from './errors';
export {
  survivalApi,
  growthApi,
  mapApi,
  studiesApi,
  statsApi,
  qualityApi,
  papersApi,
  elasticityApi,
} from './services';

// Re-export toast utilities so existing `import { showErrorToast } from '../utils/api'` still works.
export { toastManager, showErrorToast, showSuccessToast } from '../toast';
export type { ToastType, Toast } from '../toast';

// Re-export type-level helpers that the old api.ts re-exported from types
export { isApiError as isApiErrorResponse } from '../../types';
export type { ApiResponse, ApiErrorResponse, ApiMeta } from '../../types';
