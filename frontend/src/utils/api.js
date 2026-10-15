/**
 * ChainShield — API client
 * JWT bearer auth. Token stored in localStorage after login.
 * Base URL: VITE_API_URL env var or http://localhost:8000
 */

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const TOKEN_KEY = 'cs_jwt'
export const getToken   = ()  => localStorage.getItem(TOKEN_KEY)
export const setToken   = (t) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = ()  => localStorage.removeItem(TOKEN_KEY)

// ── User normalizer (snake_case DB → camelCase frontend) ──────
export const normalizeUser = (u) => {
  if (!u) return null
  return {
    ...u,
    operatorType: u.operator_type ?? u.operatorType ?? null,
    shipmentId:   u.shipment_id   ?? u.shipmentId   ?? null,
    createdAt:    u.created_at    ?? u.createdAt    ?? null,
    chatNumber:   u.chat_number   ?? u.chatNumber   ?? null,
    // keep originals in case anything still reads them
    operator_type: u.operator_type ?? u.operatorType ?? null,
    shipment_id:   u.shipment_id   ?? u.shipmentId   ?? null,
    chat_number:   u.chat_number   ?? u.chatNumber   ?? null,
  }
}

// Normalize activity log entry
const normalizeLog = (l) => ({
  ...l,
  userId:    l.user_id   ?? l.userId   ?? null,
  userName:  l.user_name ?? l.userName ?? null,
  entityId:  l.entity_id ?? l.entityId ?? null,
  createdAt: l.timestamp ?? l.createdAt ?? null,
})

// ── Core fetch wrapper ────────────────────────────────────────
export async function apiFetch(path, opts = {}) {
  const token = getToken()

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers || {}),
  }

  let res
  try {
    res = await fetch(`${BASE}${path}`, { ...opts, headers })
  } catch (networkErr) {
    throw new Error('Cannot reach the server. Is the backend running at ' + BASE + '?')
  }

  if (res.status === 401) {
    clearToken()
    throw new Error('Session expired. Please log in again.')
  }


  if (res.status === 204) return null

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    const detail = data?.detail || data?.message || `HTTP ${res.status}`
    throw new Error(Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : detail)
  }

  return data
}

// ── Auth ──────────────────────────────────────────────────────
export const api = {
  auth: {
    login: (email, password) =>
      apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    register: (data) =>
      apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name:          data.name,
          email:         data.email,
          password:      data.password,
          role:          data.role || 'operator',
          operator_type: data.operatorType || data.operator_type || null,
          phone:         data.phone        || null,
          license_id:    data.licenseId    || data.license_id || null,
          company:       data.company      || null,
        }),
      }),

    me: () => apiFetch('/api/auth/me'),
  },

  // ── Shipments ─────────────────────────────────────────────
  shipments: {
    list: () => apiFetch('/api/shipments'),

    get: (id) => apiFetch(`/api/shipments/${id}`),

    create: (data) =>
      apiFetch('/api/shipments', {
        method: 'POST',
        body: JSON.stringify({
          name:           data.name,
          cargo:          data.cargo,
          mode:           data.mode,
          origin:         data.origin,
          destination:    data.destination,
          departure_date: data.departureDate || data.departure_date || null,
          eta:            data.eta           || null,
          carrier:        data.carrier       || null,
          operator_id:    data.operatorId    || data.operator_id    || null,
          weight:         data.weight        || null,
          value:          data.value         || 0,
          description:    data.description   || null,
          waypoints:      data.waypoints     || [],
        }),
      }),

    update: (id, data) =>
      apiFetch(`/api/shipments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    updateStatus: (id, status, note = '') =>
      apiFetch(`/api/shipments/${id}/operator-status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note: note || null }),
      }),
  },

  // ── Disruptions ───────────────────────────────────────────
  disruptions: {
    list: () => apiFetch('/api/disruptions'),

    resolve: (disId, solutionId) =>
      apiFetch(`/api/disruptions/${disId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ solution_id: solutionId }),
      }),

    triggerDemo: () =>
      apiFetch('/api/disruptions/trigger-demo', { method: 'POST' }),
  },

  // ── Notifications ─────────────────────────────────────────
  notifications: {
    mine: () => apiFetch('/api/notifications/mine'),

    markRead: (id) =>
      apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  },

  // ── Admin ─────────────────────────────────────────────────
  admin: {
    users: () =>
      apiFetch('/api/admin/users').then(list => list.map(normalizeUser)),

    operators: () =>
      apiFetch('/api/admin/operators').then(list => list.map(normalizeUser)),

    updateUser: (userId, body) =>
      apiFetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }).then(normalizeUser),

    deleteUser: (userId) =>
      apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' }),

    baseCities: () => apiFetch('/api/admin/base-cities'),

    addBaseCity: (body) =>
      apiFetch('/api/admin/base-cities', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    removeBaseCity: (cityName) =>
      apiFetch(`/api/admin/base-cities/${encodeURIComponent(cityName)}`, { method: 'DELETE' }),

    cargoTypes: () => apiFetch('/api/admin/cargo-types'),

    addCargoType: (name) =>
      apiFetch('/api/admin/cargo-types', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),

    removeCargoType: (name) =>
      apiFetch(`/api/admin/cargo-types/${encodeURIComponent(name)}`, { method: 'DELETE' }),

    activityLog: () =>
      apiFetch('/api/admin/activity-log').then(list => list.map(normalizeLog)),
  },

  // ── Chat ──────────────────────────────────────────────────
  chat: {
    send: (receiverChatNumber, content) =>
      apiFetch('/api/chat/send', {
        method: 'POST',
        body: JSON.stringify({ receiver_chat_number: receiverChatNumber, content }),
      }),

    inbox: () => apiFetch('/api/chat/inbox'),

    search: (q) => apiFetch(`/api/chat/search?q=${encodeURIComponent(q)}`),

    markRead: (msgId) =>
      apiFetch(`/api/chat/read/${msgId}`, { method: 'PATCH' }),

    markAllRead: () =>
      apiFetch('/api/chat/read-all', { method: 'PATCH' }),
  },

  // ── Gemini AI Assistant ───────────────────────────────────
  gemini: {
    status: () => apiFetch('/api/gemini/status'),

    chat: (message, history = []) =>
      apiFetch('/api/gemini/chat', {
        method: 'POST',
        body: JSON.stringify({ message, history }),
      }),
  },
}
