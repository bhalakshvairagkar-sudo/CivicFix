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

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // If token invalid, remove it
    localStorage.removeItem('civicfix_token');
    localStorage.removeItem('civicfix_user');
  }

  if (!response.ok) {
    let errorMsg = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errData = await response.json();
      if (errData && errData.detail) {
        errorMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
      }
    } catch (_) {}
    throw new Error(errorMsg);
  }

  return response.json();
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
