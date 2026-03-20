const BASE_URL = '/api';

async function request(method, path, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    const err = new Error(error.error || error.message || `HTTP ${response.status}`);
    err.data = error;
    err.conflicts = error.conflicts;
    err.error = error.error;
    throw err;
  }

  // Handle CSV downloads
  const contentType = response.headers.get('Content-Type');
  if (contentType && contentType.includes('text/csv')) {
    return response.text();
  }

  return response.json();
}

const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),
};

export default api;
