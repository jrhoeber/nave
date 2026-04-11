/**
 * Thin HTTP client for seeding/cleaning test data via the API.
 * Runs in Node.js (test host), so uses global fetch (Node 18+).
 */

const API_BASE = 'http://localhost:8000';

async function apiCall(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch {}
    throw new Error(`${method} ${path} → ${res.status}: ${detail}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const api = {
  signup: (body)          => apiCall('POST', '/auth/signup', body),
  login:  (email, pw)     => apiCall('POST', '/auth/login', { email, password: pw }),

  searchParishes: (q, token) =>
    apiCall('GET', `/parishes/search?q=${encodeURIComponent(q)}&limit=5`, null, token),

  createGroup: (body, token) => apiCall('POST', '/prayer-groups', body, token),
  deleteGroup: (id, token)   => apiCall('DELETE', `/prayer-groups/${id}`, null, token),
  joinGroup:   (id, token)   => apiCall('POST', `/prayer-groups/${id}/join`, {}, token),
  approveUser: (groupId, userId, adminToken) =>
    apiCall('POST', `/prayer-groups/${groupId}/members/${userId}/approve`, {}, adminToken),

  updateMe: (body, token) => apiCall('PATCH', '/users/me', body, token),

  sendMessage: (groupId, content, token) =>
    apiCall('POST', `/prayer-groups/${groupId}/messages`, { content }, token),

  deleteMessage: (groupId, msgId, token) =>
    apiCall('DELETE', `/prayer-groups/${groupId}/messages/${msgId}`, null, token),

  createParishPost: (parishId, content, token) =>
    apiCall('POST', `/parishes/${parishId}/posts`, { content }, token),
};

module.exports = api;
