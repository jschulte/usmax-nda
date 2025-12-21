/**
 * Base API Client
 *
 * Provides a fetch wrapper with:
 * - Automatic credentials inclusion
 * - Base URL configuration
 * - JSON content-type headers
 * - Consistent error handling
 * - Common HTTP methods
 */

// Empty string default uses relative URLs (works with reverse proxy)
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  queryParams?: Record<string, string | number | boolean | undefined>;
}

async function request<T>(endpoint: string, options: RequestOptions): Promise<T> {
  const { method, headers = {}, body, queryParams } = options;

  // Build URL with query parameters
  let url = `${API_BASE_URL}${endpoint}`;
  if (queryParams) {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Build request configuration
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'include', // Include cookies for authentication
  };

  // Add body for non-GET requests
  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);

    // Handle non-JSON responses (like 204 No Content)
    if (response.status === 204) {
      return undefined as T;
    }

    // Parse JSON response
    const data = await response.json();

    // Handle error responses
    if (!response.ok) {
      throw new ApiError(
        data.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        data.code,
        data
      );
    }

    return data as T;
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError) {
      throw new ApiError('Network error: Unable to reach the server', 0, 'NETWORK_ERROR');
    }

    // Handle other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'An unexpected error occurred',
      0,
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * HTTP GET request
 */
export async function get<T>(
  endpoint: string,
  queryParams?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  return request<T>(endpoint, { method: 'GET', queryParams });
}

/**
 * HTTP POST request
 */
export async function post<T>(
  endpoint: string,
  body?: unknown,
  queryParams?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  return request<T>(endpoint, { method: 'POST', body, queryParams });
}

/**
 * HTTP PUT request
 */
export async function put<T>(
  endpoint: string,
  body?: unknown,
  queryParams?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  return request<T>(endpoint, { method: 'PUT', body, queryParams });
}

/**
 * HTTP PATCH request
 */
export async function patch<T>(
  endpoint: string,
  body?: unknown,
  queryParams?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  return request<T>(endpoint, { method: 'PATCH', body, queryParams });
}

/**
 * HTTP DELETE request
 */
export async function del<T>(
  endpoint: string,
  queryParams?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  return request<T>(endpoint, { method: 'DELETE', queryParams });
}

export const api = {
  get,
  post,
  put,
  patch,
  delete: del,
};
