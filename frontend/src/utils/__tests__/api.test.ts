import { describe, it, expect } from 'vitest';
import { buildFilterParams, ApiError, NetworkError, ValidationError } from '../api';
import { isApiError, isApiSuccess, ApiResponse, ApiErrorResponse } from '../../types/api';

describe('api utilities', () => {
  describe('buildFilterParams', () => {
    it('should return empty object for empty filters', () => {
      const result = buildFilterParams({});
      expect(result).toEqual({});
    });

    it('should skip null values', () => {
      const result = buildFilterParams({
        region: null,
        study: 'NOAA',
      });
      expect(result).toEqual({ study: 'NOAA' });
    });

    it('should skip undefined values', () => {
      const result = buildFilterParams({
        region: undefined,
        study: 'NOAA',
      });
      expect(result).toEqual({ study: 'NOAA' });
    });

    it('should skip empty arrays', () => {
      const result = buildFilterParams({
        regions: [],
        study: 'NOAA',
      });
      expect(result).toEqual({ study: 'NOAA' });
    });

    it('should skip "all" values', () => {
      const result = buildFilterParams({
        fragment: 'all',
        disturbance: 'all',
        study: 'NOAA',
      });
      expect(result).toEqual({ study: 'NOAA' });
    });

    it('should join arrays with commas', () => {
      const result = buildFilterParams({
        regions: ['Florida Keys', 'Puerto Rico', 'USVI'],
      });
      expect(result).toEqual({ regions: 'Florida Keys,Puerto Rico,USVI' });
    });

    it('should convert single-element arrays to comma-separated strings', () => {
      const result = buildFilterParams({
        regions: ['Florida Keys'],
      });
      expect(result).toEqual({ regions: 'Florida Keys' });
    });

    it('should convert numbers to strings', () => {
      const result = buildFilterParams({
        year: 2020,
        size: 500,
      });
      expect(result).toEqual({ year: '2020', size: '500' });
    });

    it('should convert booleans to strings', () => {
      const result = buildFilterParams({
        include_model: true,
        include_negative: false,
      });
      expect(result).toEqual({ include_model: 'true', include_negative: 'false' });
    });

    it('should handle array ranges by joining with commas', () => {
      const result = buildFilterParams({
        yearRange: [2010, 2020],
      });
      expect(result).toEqual({
        yearRange: '2010,2020',
      });
    });

    it('should handle size range arrays', () => {
      const result = buildFilterParams({
        sizeRange: [0, 10000],
      });
      expect(result).toEqual({
        sizeRange: '0,10000',
      });
    });

    it('should handle complex filter combinations', () => {
      const result = buildFilterParams({
        regions: ['Florida Keys', 'Puerto Rico'],
        dataTypes: ['field', 'nursery_in'],
        yearRange: [2015, 2022],
        fragment: 'Y',
        disturbance: 'all', // Should be skipped
        nullValue: null, // Should be skipped
        emptyArray: [], // Should be skipped
      });
      expect(result).toEqual({
        regions: 'Florida Keys,Puerto Rico',
        dataTypes: 'field,nursery_in',
        yearRange: '2015,2022',
        fragment: 'Y',
      });
    });

    it('should handle string values directly', () => {
      const result = buildFilterParams({
        study: 'NOAA',
        region: 'Florida Keys',
      });
      expect(result).toEqual({
        study: 'NOAA',
        region: 'Florida Keys',
      });
    });
  });

  describe('ApiError', () => {
    it('should create an error with default values', () => {
      const error = new ApiError('Something went wrong');

      expect(error.message).toBe('Something went wrong');
      expect(error.name).toBe('ApiError');
      expect(error.statusCode).toBeUndefined();
      expect(error.endpoint).toBeUndefined();
      expect(error.originalError).toBeUndefined();
    });

    it('should create an error with all options', () => {
      const originalError = new Error('Original');
      const error = new ApiError('Something went wrong', {
        statusCode: 500,
        endpoint: '/api/test',
        originalError,
      });

      expect(error.message).toBe('Something went wrong');
      expect(error.statusCode).toBe(500);
      expect(error.endpoint).toBe('/api/test');
      expect(error.originalError).toBe(originalError);
    });

    it('should return appropriate user message for 404', () => {
      const error = new ApiError('Not found', { statusCode: 404 });
      expect(error.userMessage).toBe('The requested data could not be found.');
    });

    it('should return appropriate user message for 500', () => {
      const error = new ApiError('Server error', { statusCode: 500 });
      expect(error.userMessage).toBe('The server encountered an error. Please try again later.');
    });

    it('should return original message for other status codes', () => {
      const error = new ApiError('Custom error message', { statusCode: 403 });
      expect(error.userMessage).toBe('Custom error message');
    });

    it('should be an instance of Error', () => {
      const error = new ApiError('Test');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('NetworkError', () => {
    it('should create an error with default message', () => {
      const error = new NetworkError();

      expect(error.message).toBe('Unable to connect to the server');
      expect(error.name).toBe('NetworkError');
      expect(error.statusCode).toBe(0);
    });

    it('should create an error with custom message', () => {
      const error = new NetworkError('Connection timed out');

      expect(error.message).toBe('Connection timed out');
    });

    it('should include endpoint in options', () => {
      const error = new NetworkError('Timeout', { endpoint: '/api/survival' });

      expect(error.endpoint).toBe('/api/survival');
    });

    it('should return user-friendly message', () => {
      const error = new NetworkError();
      expect(error.userMessage).toBe(
        'Unable to connect to the server. Please check your internet connection and try again.'
      );
    });

    it('should be an instance of ApiError', () => {
      const error = new NetworkError();
      expect(error).toBeInstanceOf(ApiError);
    });
  });

  describe('ValidationError', () => {
    it('should create an error with default values', () => {
      const error = new ValidationError();

      expect(error.message).toBe('Invalid request data');
      expect(error.name).toBe('ValidationError');
      expect(error.statusCode).toBe(400);
      expect(error.fieldErrors).toEqual({});
    });

    it('should create an error with custom message and field errors', () => {
      const fieldErrors = {
        region: ['Region is required', 'Invalid region format'],
        year: ['Year must be between 2000 and 2025'],
      };
      const error = new ValidationError('Validation failed', fieldErrors);

      expect(error.message).toBe('Validation failed');
      expect(error.fieldErrors).toEqual(fieldErrors);
    });

    it('should return field error messages in userMessage', () => {
      const fieldErrors = {
        region: ['Region is required'],
        year: ['Year must be valid'],
      };
      const error = new ValidationError('Validation failed', fieldErrors);

      expect(error.userMessage).toBe('Region is required. Year must be valid');
    });

    it('should return default user message when no field errors', () => {
      const error = new ValidationError('Validation failed', {});

      expect(error.userMessage).toBe(
        'The provided data is invalid. Please check your inputs and try again.'
      );
    });

    it('should be an instance of ApiError', () => {
      const error = new ValidationError();
      expect(error).toBeInstanceOf(ApiError);
    });
  });

  describe('isApiError type guard', () => {
    it('should return true for API error responses', () => {
      const errorResponse: ApiErrorResponse = {
        error: true,
        code: 'NOT_FOUND',
        message: 'Resource not found',
      };

      expect(isApiError(errorResponse)).toBe(true);
    });

    it('should return false for successful API responses', () => {
      const successResponse: ApiResponse<string> = {
        error: false,
        data: 'success',
      };

      expect(isApiError(successResponse)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isApiError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isApiError(undefined)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isApiError('string')).toBe(false);
      expect(isApiError(123)).toBe(false);
      expect(isApiError(true)).toBe(false);
    });

    it('should return false for objects without error property', () => {
      expect(isApiError({ data: 'something' })).toBe(false);
    });

    it('should return false for objects with error: false', () => {
      expect(isApiError({ error: false })).toBe(false);
    });

    it('should handle API error with details', () => {
      const errorResponse: ApiErrorResponse = {
        error: true,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: { field: 'region', reason: 'required' },
      };

      expect(isApiError(errorResponse)).toBe(true);
    });
  });

  describe('isApiSuccess type guard', () => {
    it('should return true for successful API responses', () => {
      const successResponse: ApiResponse<{ name: string }> = {
        error: false,
        data: { name: 'test' },
      };

      expect(isApiSuccess(successResponse)).toBe(true);
    });

    it('should return true for successful API responses with meta', () => {
      const successResponse: ApiResponse<string[]> = {
        error: false,
        data: ['item1', 'item2'],
        meta: { total_records: 2 },
      };

      expect(isApiSuccess(successResponse)).toBe(true);
    });

    it('should return false for API error responses', () => {
      const errorResponse: ApiErrorResponse = {
        error: true,
        code: 'ERROR',
        message: 'Something went wrong',
      };

      expect(isApiSuccess(errorResponse)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isApiSuccess(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isApiSuccess(undefined)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isApiSuccess('string')).toBe(false);
      expect(isApiSuccess(123)).toBe(false);
      expect(isApiSuccess(false)).toBe(false);
    });

    it('should return false for objects without error property', () => {
      expect(isApiSuccess({ data: 'something' })).toBe(false);
    });

    it('should return false for objects with error: true', () => {
      expect(isApiSuccess({ error: true })).toBe(false);
    });
  });
});
