/**
 * API Client Utility
 *
 * Centralized fetch wrapper with consistent error handling for all API calls.
 * Eliminates duplicated error handling patterns across React hooks.
 */

/**
 * Fetch JSON from API endpoint with automatic error handling
 *
 * @param url - API endpoint URL
 * @param options - Fetch options (method, headers, body, etc.)
 * @returns Parsed JSON response
 * @throws Error with descriptive message if request fails
 */
export async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * POST JSON data to API endpoint
 *
 * @param url - API endpoint URL
 * @param data - Data to send as JSON body
 * @returns Parsed JSON response
 */
export async function postJson<T>(url: string, data: unknown): Promise<T> {
  return fetchApi<T>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

/**
 * GET JSON from API endpoint
 *
 * @param url - API endpoint URL with query params
 * @returns Parsed JSON response
 */
export async function getJson<T>(url: string): Promise<T> {
  return fetchApi<T>(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
