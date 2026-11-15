import { handleMockRequest } from './mockService';

const rawBase = import.meta.env.VITE_API_BASE_URL || '/api';
const API_BASE = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('civicfix_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const endpointPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpointPath}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 401) {
      localStorage.removeItem('civicfix_token');
      localStorage.removeItem('civicfix_user');
    }

    // Static site servers often return 404 or 405 for unhandled backend API endpoints
    if (response.status === 404 || response.status === 405 || response.status === 502) {
      return await handleMockRequest(endpoint, options);
    }

    const text = await response.text();

    // If body is empty or returns HTML (SPA fallback), seamlessly switch to client mock service
    if (!text || !text.trim() || text.trim().startsWith('<!doctype') || text.trim().startsWith('<html') || text.trim().startsWith('<!DOCTYPE')) {
      return await handleMockRequest(endpoint, options);
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(text);
    } catch (_) {
      return await handleMockRequest(endpoint, options);
    }

    if (!response.ok) {
      let errorMsg = `API Error: ${response.status} ${response.statusText}`;
      if (parsedJson && parsedJson.detail) {
        errorMsg = typeof parsedJson.detail === 'string' ? parsedJson.detail : JSON.stringify(parsedJson.detail);
      }
      throw new Error(errorMsg);
    }

    return parsedJson;
  } catch (err) {
    if (err.message && err.message.startsWith('API Error:')) {
      throw err;
    }
    // Network error (offline, CORS, unconfigured host) or JSON parse crash
    return await handleMockRequest(endpoint, options);
  }
}

export const api = {
  get: (endpoint, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, v);
      }
    });
    const qs = query.toString();
    const finalEndpoint = qs ? `${endpoint}?${qs}` : endpoint;
    return apiRequest(finalEndpoint, { method: 'GET' });
  },
  post: (endpoint, body = {}) => apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  patch: (endpoint, body = {}) => apiRequest(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body)
  }),
  put: (endpoint, body = {}) => apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body)
  }),
  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' })
};
